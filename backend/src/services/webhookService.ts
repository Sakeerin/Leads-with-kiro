import crypto from 'crypto';
import { Request, Response } from 'express';
import { leadService } from './leadService';
import { loggingService } from './loggingService';
import { Lead } from '../models/Lead';

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret?: string;
  isActive: boolean;
  source: string;
  fieldMapping: Record<string, string>;
  transformations?: WebhookTransformation[];
}

export interface WebhookTransformation {
  field: string;
  type: 'uppercase' | 'lowercase' | 'trim' | 'phone_format' | 'email_normalize';
}

export interface WebhookPayload {
  source: string;
  timestamp: Date;
  data: Record<string, any>;
  signature?: string;
}

export interface ProcessedWebhookResult {
  success: boolean;
  leadId?: string;
  error?: string;
  duplicateDetected?: boolean;
}

export class WebhookService {
  private configs: Map<string, WebhookConfig> = new Map();

  registerWebhook(config: WebhookConfig): void {
    this.configs.set(config.id, config);
    loggingService.info('Webhook registered', { webhookId: config.id, name: config.name });
  }

  unregisterWebhook(webhookId: string): void {
    this.configs.delete(webhookId);
    loggingService.info('Webhook unregistered', { webhookId });
  }

  getWebhookConfig(webhookId: string): WebhookConfig | undefined {
    return this.configs.get(webhookId);
  }

  getAllWebhooks(): WebhookConfig[] {
    return Array.from(this.configs.values());
  }

  async processWebhook(webhookId: string, payload: WebhookPayload): Promise<ProcessedWebhookResult> {
    const config = this.configs.get(webhookId);
    if (!config) {
      loggingService.error('Webhook not found', new Error('Webhook not found'), { webhookId });
      return { success: false, error: 'Webhook configuration not found' };
    }

    if (!config.isActive) {
      loggingService.warn('Webhook is inactive', { webhookId });
      return { success: false, error: 'Webhook is inactive' };
    }

    try {
      // Verify signature if secret is configured
      if (config.secret && payload.signature) {
        const isValid = this.verifySignature(payload, config.secret);
        if (!isValid) {
          loggingService.error('Invalid webhook signature', new Error('Invalid signature'), { webhookId });
          return { success: false, error: 'Invalid signature' };
        }
      }

      // Transform and map the data
      const leadData = this.transformWebhookData(payload.data, config);

      // Create the lead
      const lead = await leadService.createLead(leadData);

      loggingService.info('Lead created from webhook', { 
        webhookId, 
        leadId: lead.id, 
        source: config.source 
      });

      return { 
        success: true, 
        leadId: lead.id 
      };

    } catch (error) {
      loggingService.error('Failed to process webhook', error instanceof Error ? error : new Error('Unknown error'), { 
        webhookId
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Processing failed' 
      };
    }
  }

  private verifySignature(payload: WebhookPayload, secret: string): boolean {
    if (!payload.signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload.data))
      .digest('hex');

    const providedSignature = payload.signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  }

  private transformWebhookData(data: Record<string, any>, config: WebhookConfig): Partial<Lead> {
    const leadData: any = {
      source: {
        channel: config.source,
        campaign: data.campaign || data.utm_campaign,
        utmParams: {
          source: data.utm_source,
          medium: data.utm_medium,
          campaign: data.utm_campaign,
          term: data.utm_term,
          content: data.utm_content
        }
      }
    };

    // Apply field mapping
    Object.entries(config.fieldMapping).forEach(([sourceField, targetField]) => {
      const value = this.getNestedValue(data, sourceField);
      if (value !== undefined) {
        this.setNestedValue(leadData, targetField, value);
      }
    });

    // Apply transformations
    if (config.transformations) {
      config.transformations.forEach(transformation => {
        const value = this.getNestedValue(leadData, transformation.field);
        if (value !== undefined) {
          const transformedValue = this.applyTransformation(value, transformation.type);
          this.setNestedValue(leadData, transformation.field, transformedValue);
        }
      });
    }

    // Ensure required fields have defaults
    if (!leadData.company?.name && (data.company || data.company_name)) {
      leadData.company = { name: data.company || data.company_name };
    }

    if (!leadData.contact?.name && (data.name || data.full_name || data.first_name)) {
      leadData.contact = {
        name: data.name || data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        email: data.email,
        phone: data.phone,
        mobile: data.mobile || data.cell_phone
      };
    }

    return leadData;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private applyTransformation(value: any, type: WebhookTransformation['type']): any {
    if (typeof value !== 'string') return value;

    switch (type) {
      case 'uppercase':
        return value.toUpperCase();
      case 'lowercase':
        return value.toLowerCase();
      case 'trim':
        return value.trim();
      case 'phone_format':
        return this.formatPhoneNumber(value);
      case 'email_normalize':
        return value.toLowerCase().trim();
      default:
        return value;
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Handle Thai phone numbers
    if (digits.startsWith('66')) {
      return `+${digits}`;
    } else if (digits.startsWith('0') && digits.length === 10) {
      return `+66${digits.substring(1)}`;
    } else if (digits.length === 9) {
      return `+66${digits}`;
    }
    
    // Handle international numbers
    if (digits.length > 10) {
      return `+${digits}`;
    }
    
    return phone; // Return original if can't format
  }
}

// Webhook handlers for specific platforms
export class MetaLeadAdsWebhookHandler {
  constructor(private webhookService: WebhookService) {}

  async handleMetaWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Verify Meta webhook
      if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token']) {
        const verifyToken = process.env.META_VERIFY_TOKEN;
        if (req.query['hub.verify_token'] === verifyToken) {
          res.status(200).send(req.query['hub.challenge']);
          return;
        } else {
          res.status(403).send('Forbidden');
          return;
        }
      }

      // Process lead data
      const body = req.body;
      if (body.object === 'page') {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === 'leadgen') {
              const leadgenData = change.value;
              
              const payload: WebhookPayload = {
                source: 'meta_lead_ads',
                timestamp: new Date(),
                data: {
                  lead_id: leadgenData.leadgen_id,
                  form_id: leadgenData.form_id,
                  page_id: leadgenData.page_id,
                  ad_id: leadgenData.ad_id,
                  campaign_id: leadgenData.campaign_id,
                  created_time: leadgenData.created_time,
                  ...leadgenData.field_data?.reduce((acc: any, field: any) => {
                    acc[field.name] = field.values?.[0] || '';
                    return acc;
                  }, {})
                }
              };

              await this.webhookService.processWebhook('meta_lead_ads', payload);
            }
          }
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      loggingService.error('Failed to process Meta webhook', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).send('Internal Server Error');
    }
  }
}

export class GoogleFormsWebhookHandler {
  constructor(private webhookService: WebhookService) {}

  async handleGoogleFormsWebhook(req: Request, res: Response): Promise<void> {
    try {
      const formData = req.body;
      
      const payload: WebhookPayload = {
        source: 'google_forms',
        timestamp: new Date(),
        data: {
          form_id: formData.form_id,
          response_id: formData.response_id,
          timestamp: formData.timestamp,
          ...formData.responses
        }
      };

      const result = await this.webhookService.processWebhook('google_forms', payload);
      
      if (result.success) {
        res.status(200).json({ success: true, leadId: result.leadId });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      loggingService.error('Failed to process Google Forms webhook', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
}

export class GenericWebhookHandler {
  constructor(private webhookService: WebhookService) {}

  async handleGenericWebhook(webhookId: string, req: Request, res: Response): Promise<void> {
    try {
      const payload: WebhookPayload = {
        source: 'external_form',
        timestamp: new Date(),
        data: req.body,
        signature: req.headers['x-signature'] as string || req.headers['x-hub-signature-256'] as string
      };

      const result = await this.webhookService.processWebhook(webhookId, payload);
      
      if (result.success) {
        res.status(200).json({ 
          success: true, 
          leadId: result.leadId,
          duplicateDetected: result.duplicateDetected 
        });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      loggingService.error('Failed to process generic webhook', error instanceof Error ? error : new Error('Unknown error'), { webhookId });
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }
}

// Export singleton instance
export const webhookService = new WebhookService();

// Initialize default webhook configurations
webhookService.registerWebhook({
  id: 'meta_lead_ads',
  name: 'Meta Lead Ads',
  url: '/webhooks/meta',
  source: 'meta_lead_ads',
  isActive: true,
  fieldMapping: {
    'full_name': 'contact.name',
    'email': 'contact.email',
    'phone_number': 'contact.phone',
    'company_name': 'company.name',
    'job_title': 'contact.jobTitle',
    'campaign_name': 'source.campaign'
  },
  transformations: [
    { field: 'contact.email', type: 'email_normalize' },
    { field: 'contact.phone', type: 'phone_format' },
    { field: 'contact.name', type: 'trim' }
  ]
});

webhookService.registerWebhook({
  id: 'google_forms',
  name: 'Google Forms',
  url: '/webhooks/google-forms',
  source: 'google_forms',
  isActive: true,
  fieldMapping: {
    'name': 'contact.name',
    'email': 'contact.email',
    'phone': 'contact.phone',
    'company': 'company.name',
    'message': 'followUp.notes'
  },
  transformations: [
    { field: 'contact.email', type: 'email_normalize' },
    { field: 'contact.phone', type: 'phone_format' }
  ]
});