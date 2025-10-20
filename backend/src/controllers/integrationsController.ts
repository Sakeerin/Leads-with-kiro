import { Request, Response } from 'express';
import { 
  ExternalEmailService, 
  Microsoft365EmailService, 
  GmailEmailService 
} from '../services/externalEmailService';
import { 
  ExternalCalendarService, 
  Microsoft365CalendarService, 
  GoogleCalendarService 
} from '../services/externalCalendarService';
import { crmIntegrationService } from '../services/crmIntegrationService';
import { webhookService } from '../services/webhookService';
import { leadService } from '../services/leadService';
import { loggingService } from '../services/loggingService';

export class IntegrationsController {
  private emailService = new ExternalEmailService();
  private calendarService = new ExternalCalendarService();

  // Email Integration Methods
  async getEmailProviders(req: Request, res: Response): Promise<void> {
    try {
      const providers = this.emailService.getAvailableProviders();
      res.json({ providers });
    } catch (error) {
      loggingService.error('Failed to get email providers', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to get email providers' });
    }
  }

  async configureEmailProvider(req: Request, res: Response): Promise<void> {
    try {
      const { provider, accessToken } = req.body;

      let emailProvider;
      switch (provider) {
        case 'microsoft365':
          emailProvider = new Microsoft365EmailService(accessToken);
          break;
        case 'gmail':
          emailProvider = new GmailEmailService(accessToken);
          break;
        default:
          res.status(400).json({ error: 'Unsupported email provider' });
          return;
      }

      this.emailService.registerProvider(provider, emailProvider);
      
      res.json({ 
        success: true, 
        message: `${provider} email provider configured successfully` 
      });
    } catch (error) {
      loggingService.error('Failed to configure email provider', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to configure email provider' });
    }
  }

  async sendEmail(req: Request, res: Response): Promise<void> {
    try {
      const { provider, to, subject, body, attachments } = req.body;

      const result = await this.emailService.sendEmail(provider, to, subject, body, attachments);
      
      if (result.status === 'sent') {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      loggingService.error('Failed to send email', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to send email' });
    }
  }

  async getEmailFolders(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      
      // This would typically involve calling the provider's folder listing API
      // For now, return common folder names
      const folders = [
        { id: 'inbox', name: 'Inbox' },
        { id: 'sent', name: 'Sent Items' },
        { id: 'drafts', name: 'Drafts' },
        { id: 'deleted', name: 'Deleted Items' }
      ];

      res.json({ folders });
    } catch (error) {
      loggingService.error('Failed to get email folders', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to get email folders' });
    }
  }

  async getEmails(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      const { folderId, limit } = req.query;

      const emails = await this.emailService.getEmails(
        provider, 
        folderId as string, 
        limit ? parseInt(limit as string) : undefined
      );

      res.json({ emails });
    } catch (error) {
      loggingService.error('Failed to get emails', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to get emails' });
    }
  }

  // Calendar Integration Methods
  async getCalendarProviders(req: Request, res: Response): Promise<void> {
    try {
      const providers = this.calendarService.getAvailableProviders();
      res.json({ providers });
    } catch (error) {
      loggingService.error('Failed to get calendar providers', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to get calendar providers' });
    }
  }

  async configureCalendarProvider(req: Request, res: Response): Promise<void> {
    try {
      const { provider, accessToken } = req.body;

      let calendarProvider;
      switch (provider) {
        case 'microsoft365':
          calendarProvider = new Microsoft365CalendarService(accessToken);
          break;
        case 'google':
          calendarProvider = new GoogleCalendarService(accessToken);
          break;
        default:
          res.status(400).json({ error: 'Unsupported calendar provider' });
          return;
      }

      this.calendarService.registerProvider(provider, calendarProvider);
      
      res.json({ 
        success: true, 
        message: `${provider} calendar provider configured successfully` 
      });
    } catch (error) {
      loggingService.error('Failed to configure calendar provider', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to configure calendar provider' });
    }
  }

  async createCalendarEvent(req: Request, res: Response): Promise<void> {
    try {
      const { provider, event } = req.body;

      const result = await this.calendarService.createEvent(provider, {
        ...event,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime)
      });

      if (result.status === 'created') {
        res.json({ success: true, eventId: result.id, meetingUrl: result.meetingUrl });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      loggingService.error('Failed to create calendar event', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to create calendar event' });
    }
  }

  async updateCalendarEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { provider, event } = req.body;

      const updateData = { ...event };
      if (event.startTime) updateData.startTime = new Date(event.startTime);
      if (event.endTime) updateData.endTime = new Date(event.endTime);

      const result = await this.calendarService.updateEvent(provider, eventId, updateData);

      if (result.status === 'updated') {
        res.json({ success: true, eventId: result.id });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      loggingService.error('Failed to update calendar event', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to update calendar event' });
    }
  }

  async deleteCalendarEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const { provider } = req.body;

      const success = await this.calendarService.deleteEvent(provider, eventId);

      if (success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ success: false, error: 'Failed to delete event' });
      }
    } catch (error) {
      loggingService.error('Failed to delete calendar event', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to delete calendar event' });
    }
  }

  async getCalendarEvents(req: Request, res: Response): Promise<void> {
    try {
      const { provider, startDate, endDate } = req.query;

      const events = await this.calendarService.getEvents(
        provider as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json({ events });
    } catch (error) {
      loggingService.error('Failed to get calendar events', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to get calendar events' });
    }
  }

  async getAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { provider, startDate, endDate, attendees } = req.body;

      const availability = await this.calendarService.getAvailability(
        provider,
        new Date(startDate),
        new Date(endDate),
        attendees
      );

      res.json({ availability });
    } catch (error) {
      loggingService.error('Failed to get availability', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to get availability' });
    }
  }

  // CRM Integration Methods
  async getCRMProviders(req: Request, res: Response): Promise<void> {
    try {
      const providers = crmIntegrationService.getAvailableProviders();
      res.json({ providers });
    } catch (error) {
      loggingService.error('Failed to get CRM providers', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to get CRM providers' });
    }
  }

  async configureCRMIntegration(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      
      const success = await crmIntegrationService.configureIntegration(config);
      
      if (success) {
        res.json({ 
          success: true, 
          message: `CRM integration configured successfully` 
        });
      } else {
        res.status(400).json({ success: false, error: 'Failed to configure CRM integration' });
      }
    } catch (error) {
      loggingService.error('Failed to configure CRM integration', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to configure CRM integration' });
    }
  }

  async getCRMConfigurations(req: Request, res: Response): Promise<void> {
    try {
      const configurations = crmIntegrationService.getConfigurations();
      res.json({ configurations });
    } catch (error) {
      loggingService.error('Failed to get CRM configurations', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to get CRM configurations' });
    }
  }

  async syncLeadToCRM(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const { configId } = req.body;

      const lead = await leadService.getLeadById(leadId);
      if (!lead) {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }

      const result = await crmIntegrationService.syncLead(configId, lead);
      
      if (result.success) {
        res.json({ success: true, externalId: result.externalId });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      loggingService.error('Failed to sync lead to CRM', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to sync lead to CRM' });
    }
  }

  async syncAccountToCRM(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const { configId } = req.body;

      // Implementation would fetch account and sync to CRM
      res.json({ success: true, message: 'Account sync not yet implemented' });
    } catch (error) {
      loggingService.error('Failed to sync account to CRM', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to sync account to CRM' });
    }
  }

  async syncContactToCRM(req: Request, res: Response): Promise<void> {
    try {
      const { contactId } = req.params;
      const { configId } = req.body;

      // Implementation would fetch contact and sync to CRM
      res.json({ success: true, message: 'Contact sync not yet implemented' });
    } catch (error) {
      loggingService.error('Failed to sync contact to CRM', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to sync contact to CRM' });
    }
  }

  async syncOpportunityToCRM(req: Request, res: Response): Promise<void> {
    try {
      const { opportunityId } = req.params;
      const { configId } = req.body;

      // Implementation would fetch opportunity and sync to CRM
      res.json({ success: true, message: 'Opportunity sync not yet implemented' });
    } catch (error) {
      loggingService.error('Failed to sync opportunity to CRM', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to sync opportunity to CRM' });
    }
  }

  async pullDataFromCRM(req: Request, res: Response): Promise<void> {
    try {
      const { configId, entityType } = req.params;
      const { lastSyncDate } = req.body;

      const data = await crmIntegrationService.pullData(
        configId,
        entityType as any,
        lastSyncDate ? new Date(lastSyncDate) : undefined
      );

      res.json({ data, count: data.length });
    } catch (error) {
      loggingService.error('Failed to pull data from CRM', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to pull data from CRM' });
    }
  }

  // Webhook Management Methods
  async getWebhooks(req: Request, res: Response): Promise<void> {
    try {
      const webhooks = webhookService.getAllWebhooks();
      res.json({ webhooks });
    } catch (error) {
      loggingService.error('Failed to get webhooks', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to get webhooks' });
    }
  }

  async createWebhook(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      
      webhookService.registerWebhook(config);
      
      res.json({ 
        success: true, 
        message: 'Webhook created successfully',
        webhookId: config.id
      });
    } catch (error) {
      loggingService.error('Failed to create webhook', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to create webhook' });
    }
  }

  async updateWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;
      const config = req.body;
      
      // First unregister the old webhook
      webhookService.unregisterWebhook(webhookId);
      
      // Then register the updated webhook
      webhookService.registerWebhook({ ...config, id: webhookId });
      
      res.json({ 
        success: true, 
        message: 'Webhook updated successfully' 
      });
    } catch (error) {
      loggingService.error('Failed to update webhook', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to update webhook' });
    }
  }

  async deleteWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;
      
      webhookService.unregisterWebhook(webhookId);
      
      res.json({ 
        success: true, 
        message: 'Webhook deleted successfully' 
      });
    } catch (error) {
      loggingService.error('Failed to delete webhook', error instanceof Error ? error : new Error('Unknown error'));
      res.status(500).json({ error: 'Failed to delete webhook' });
    }
  }
}