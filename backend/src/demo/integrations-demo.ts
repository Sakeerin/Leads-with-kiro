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
import { webhookService } from '../services/webhookService';
import { crmIntegrationService } from '../services/crmIntegrationService';
import { logger } from '../services/loggingService';

export class IntegrationsDemo {
  private emailService = new ExternalEmailService();
  private calendarService = new ExternalCalendarService();

  async demonstrateEmailIntegration(): Promise<void> {
    console.log('\n=== Email Integration Demo ===');

    try {
      // Configure Microsoft 365 email provider
      const msEmailProvider = new Microsoft365EmailService('mock-access-token');
      this.emailService.registerProvider('microsoft365', msEmailProvider);
      console.log('✓ Microsoft 365 email provider configured');

      // Configure Gmail provider
      const gmailProvider = new GmailEmailService('mock-access-token');
      this.emailService.registerProvider('gmail', gmailProvider);
      console.log('✓ Gmail provider configured');

      // List available providers
      const providers = this.emailService.getAvailableProviders();
      console.log(`✓ Available email providers: ${providers.join(', ')}`);

      // Simulate sending an email
      console.log('\n--- Sending Email Demo ---');
      const emailResult = await this.emailService.sendEmail(
        'microsoft365',
        'lead@example.com',
        'Welcome to Our Service',
        '<h1>Welcome!</h1><p>Thank you for your interest in our services.</p>',
        [
          {
            filename: 'brochure.pdf',
            content: Buffer.from('Mock PDF content'),
            contentType: 'application/pdf'
          }
        ]
      );

      if (emailResult.status === 'sent') {
        console.log(`✓ Email sent successfully. Message ID: ${emailResult.messageId}`);
      } else {
        console.log(`✗ Email failed to send: ${emailResult.error}`);
      }

    } catch (error) {
      console.error('Email integration demo failed:', error);
    }
  }

  async demonstrateCalendarIntegration(): Promise<void> {
    console.log('\n=== Calendar Integration Demo ===');

    try {
      // Configure Microsoft 365 calendar provider
      const msCalendarProvider = new Microsoft365CalendarService('mock-access-token');
      this.calendarService.registerProvider('microsoft365', msCalendarProvider);
      console.log('✓ Microsoft 365 calendar provider configured');

      // Configure Google Calendar provider
      const googleCalendarProvider = new GoogleCalendarService('mock-access-token');
      this.calendarService.registerProvider('google', googleCalendarProvider);
      console.log('✓ Google Calendar provider configured');

      // List available providers
      const providers = this.calendarService.getAvailableProviders();
      console.log(`✓ Available calendar providers: ${providers.join(', ')}`);

      // Simulate creating a calendar event
      console.log('\n--- Creating Calendar Event Demo ---');
      const eventResult = await this.calendarService.createEvent('microsoft365', {
        title: 'Lead Follow-up Meeting',
        description: 'Follow-up meeting with potential client John Doe from ABC Company',
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        endTime: new Date(Date.now() + 86400000 + 3600000), // Tomorrow + 1 hour
        attendees: [
          {
            email: 'john.doe@abccompany.com',
            name: 'John Doe',
            required: true
          },
          {
            email: 'sales@ourcompany.com',
            name: 'Sales Representative',
            required: true
          }
        ],
        location: 'Conference Room A',
        reminders: [
          { method: 'email', minutes: 15 },
          { method: 'popup', minutes: 5 }
        ]
      });

      if (eventResult.status === 'created') {
        console.log(`✓ Calendar event created successfully. Event ID: ${eventResult.id}`);
        if (eventResult.meetingUrl) {
          console.log(`✓ Meeting URL: ${eventResult.meetingUrl}`);
        }
      } else {
        console.log(`✗ Calendar event failed to create: ${eventResult.error}`);
      }

      // Simulate checking availability
      console.log('\n--- Checking Availability Demo ---');
      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Next week
      const attendees = ['john.doe@abccompany.com', 'sales@ourcompany.com'];

      const availability = await this.calendarService.getAvailability(
        'microsoft365',
        startDate,
        endDate,
        attendees
      );

      console.log(`✓ Retrieved availability for ${attendees.length} attendees`);
      console.log(`✓ Found ${availability.length} availability slots`);

    } catch (error) {
      console.error('Calendar integration demo failed:', error);
    }
  }

  async demonstrateWebhookIntegration(): Promise<void> {
    console.log('\n=== Webhook Integration Demo ===');

    try {
      // Show existing webhook configurations
      const existingWebhooks = webhookService.getAllWebhooks();
      console.log(`✓ Found ${existingWebhooks.length} existing webhook configurations:`);
      existingWebhooks.forEach(webhook => {
        console.log(`  - ${webhook.name} (${webhook.id}): ${webhook.source}`);
      });

      // Create a custom webhook configuration
      console.log('\n--- Creating Custom Webhook Demo ---');
      const customWebhookConfig = {
        id: 'demo-contact-form',
        name: 'Demo Contact Form',
        url: '/webhooks/demo-contact-form',
        source: 'website_contact_form',
        isActive: true,
        fieldMapping: {
          'firstName': 'contact.name',
          'lastName': 'contact.name',
          'emailAddress': 'contact.email',
          'phoneNumber': 'contact.phone',
          'companyName': 'company.name',
          'jobTitle': 'contact.jobTitle',
          'industry': 'company.industry',
          'message': 'followUp.notes',
          'utm_source': 'source.utmParams.source',
          'utm_campaign': 'source.utmParams.campaign'
        },
        transformations: [
          { field: 'contact.email', type: 'email_normalize' },
          { field: 'contact.phone', type: 'phone_format' },
          { field: 'contact.name', type: 'trim' },
          { field: 'company.name', type: 'trim' }
        ]
      };

      webhookService.registerWebhook(customWebhookConfig);
      console.log(`✓ Custom webhook '${customWebhookConfig.name}' registered successfully`);

      // Simulate processing a webhook payload
      console.log('\n--- Processing Webhook Payload Demo ---');
      const mockPayload = {
        source: 'website_contact_form',
        timestamp: new Date(),
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          emailAddress: '  JANE.SMITH@EXAMPLE.COM  ',
          phoneNumber: '0812345678',
          companyName: '  Tech Solutions Ltd  ',
          jobTitle: 'Marketing Manager',
          industry: 'Technology',
          message: 'Interested in your lead management solution',
          utm_source: 'google',
          utm_campaign: 'lead-management-ads'
        }
      };

      const result = await webhookService.processWebhook('demo-contact-form', mockPayload);
      
      if (result.success) {
        console.log(`✓ Webhook processed successfully. Lead ID: ${result.leadId}`);
      } else {
        console.log(`✗ Webhook processing failed: ${result.error}`);
      }

      // Clean up demo webhook
      webhookService.unregisterWebhook('demo-contact-form');
      console.log('✓ Demo webhook configuration cleaned up');

    } catch (error) {
      console.error('Webhook integration demo failed:', error);
    }
  }

  async demonstrateCRMIntegration(): Promise<void> {
    console.log('\n=== CRM Integration Demo ===');

    try {
      // Show available CRM providers
      const providers = crmIntegrationService.getAvailableProviders();
      console.log(`✓ Available CRM providers: ${providers.join(', ')}`);

      // Configure Salesforce integration
      console.log('\n--- Configuring Salesforce Integration Demo ---');
      const salesforceConfig = {
        id: 'demo-salesforce',
        name: 'Demo Salesforce Integration',
        provider: 'salesforce',
        isActive: true,
        credentials: {
          type: 'oauth' as const,
          accessToken: 'mock-salesforce-token',
          instanceUrl: 'https://demo.salesforce.com'
        },
        fieldMappings: {
          lead: [
            { localField: 'contact.name', remoteField: 'Name' },
            { localField: 'contact.email', remoteField: 'Email' },
            { localField: 'contact.phone', remoteField: 'Phone' },
            { localField: 'company.name', remoteField: 'Company' },
            { localField: 'source.channel', remoteField: 'LeadSource' }
          ],
          account: [
            { localField: 'name', remoteField: 'Name' },
            { localField: 'industry', remoteField: 'Industry' },
            { localField: 'phone', remoteField: 'Phone' }
          ],
          contact: [
            { localField: 'firstName', remoteField: 'FirstName' },
            { localField: 'lastName', remoteField: 'LastName' },
            { localField: 'email', remoteField: 'Email' }
          ],
          opportunity: [
            { localField: 'name', remoteField: 'Name' },
            { localField: 'amount', remoteField: 'Amount' },
            { localField: 'stage', remoteField: 'StageName' }
          ]
        },
        syncSettings: {
          bidirectional: false,
          conflictResolution: 'local_wins' as const,
          syncFrequency: 60
        }
      };

      const configured = await crmIntegrationService.configureIntegration(salesforceConfig);
      if (configured) {
        console.log('✓ Salesforce integration configured successfully');
      }

      // Configure HubSpot integration
      console.log('\n--- Configuring HubSpot Integration Demo ---');
      const hubspotConfig = {
        id: 'demo-hubspot',
        name: 'Demo HubSpot Integration',
        provider: 'hubspot',
        isActive: true,
        credentials: {
          type: 'api_key' as const,
          apiKey: 'mock-hubspot-api-key'
        },
        fieldMappings: {
          lead: [
            { localField: 'contact.name', remoteField: 'firstname' },
            { localField: 'contact.email', remoteField: 'email' },
            { localField: 'contact.phone', remoteField: 'phone' },
            { localField: 'company.name', remoteField: 'company' }
          ],
          account: [],
          contact: [],
          opportunity: []
        },
        syncSettings: {
          bidirectional: true,
          conflictResolution: 'remote_wins' as const,
          syncFrequency: 30
        }
      };

      const hubspotConfigured = await crmIntegrationService.configureIntegration(hubspotConfig);
      if (hubspotConfigured) {
        console.log('✓ HubSpot integration configured successfully');
      }

      // Show configured integrations
      const configurations = crmIntegrationService.getConfigurations();
      console.log(`✓ Total configured CRM integrations: ${configurations.length}`);
      configurations.forEach(config => {
        console.log(`  - ${config.name} (${config.provider}): ${config.isActive ? 'Active' : 'Inactive'}`);
      });

      // Simulate syncing a lead to CRM
      console.log('\n--- Syncing Lead to CRM Demo ---');
      const mockLead = {
        id: 'demo-lead-123',
        contact: {
          name: 'Demo Lead Contact',
          email: 'demo@example.com',
          phone: '+66812345678'
        },
        company: {
          name: 'Demo Company Ltd'
        },
        source: {
          channel: 'website'
        },
        status: 'new',
        score: {
          value: 75,
          lastCalculated: new Date()
        }
      } as any;

      const syncResult = await crmIntegrationService.syncLead('demo-salesforce', mockLead);
      if (syncResult.success) {
        console.log(`✓ Lead synced to Salesforce successfully. External ID: ${syncResult.externalId}`);
      } else {
        console.log(`✗ Lead sync failed: ${syncResult.error}`);
      }

    } catch (error) {
      console.error('CRM integration demo failed:', error);
    }
  }

  async demonstrateMetaLeadAdsIntegration(): Promise<void> {
    console.log('\n=== Meta Lead Ads Integration Demo ===');

    try {
      // Show Meta Lead Ads webhook configuration
      const metaWebhook = webhookService.getWebhookConfig('meta_lead_ads');
      if (metaWebhook) {
        console.log('✓ Meta Lead Ads webhook configuration found:');
        console.log(`  - Name: ${metaWebhook.name}`);
        console.log(`  - URL: ${metaWebhook.url}`);
        console.log(`  - Source: ${metaWebhook.source}`);
        console.log(`  - Active: ${metaWebhook.isActive}`);
        console.log(`  - Field Mappings: ${Object.keys(metaWebhook.fieldMapping).length} fields`);
      }

      // Simulate Meta Lead Ads webhook payload
      console.log('\n--- Processing Meta Lead Ads Payload Demo ---');
      const metaPayload = {
        source: 'meta_lead_ads',
        timestamp: new Date(),
        data: {
          lead_id: 'meta_lead_12345',
          form_id: 'form_67890',
          page_id: 'page_11111',
          ad_id: 'ad_22222',
          campaign_id: 'campaign_33333',
          campaign_name: 'Lead Generation Campaign Q4',
          created_time: new Date().toISOString(),
          full_name: 'Michael Johnson',
          email: 'michael.johnson@company.com',
          phone_number: '+66987654321',
          company_name: 'Johnson Enterprises',
          job_title: 'CEO',
          industry: 'Manufacturing'
        }
      };

      const result = await webhookService.processWebhook('meta_lead_ads', metaPayload);
      
      if (result.success) {
        console.log(`✓ Meta Lead Ads payload processed successfully. Lead ID: ${result.leadId}`);
      } else {
        console.log(`✗ Meta Lead Ads processing failed: ${result.error}`);
      }

    } catch (error) {
      console.error('Meta Lead Ads integration demo failed:', error);
    }
  }

  async demonstrateGoogleFormsIntegration(): Promise<void> {
    console.log('\n=== Google Forms Integration Demo ===');

    try {
      // Show Google Forms webhook configuration
      const googleFormsWebhook = webhookService.getWebhookConfig('google_forms');
      if (googleFormsWebhook) {
        console.log('✓ Google Forms webhook configuration found:');
        console.log(`  - Name: ${googleFormsWebhook.name}`);
        console.log(`  - URL: ${googleFormsWebhook.url}`);
        console.log(`  - Source: ${googleFormsWebhook.source}`);
        console.log(`  - Active: ${googleFormsWebhook.isActive}`);
        console.log(`  - Field Mappings: ${Object.keys(googleFormsWebhook.fieldMapping).length} fields`);
      }

      // Simulate Google Forms webhook payload
      console.log('\n--- Processing Google Forms Payload Demo ---');
      const googleFormsPayload = {
        source: 'google_forms',
        timestamp: new Date(),
        data: {
          form_id: 'google_form_12345',
          response_id: 'response_67890',
          timestamp: new Date().toISOString(),
          name: 'Sarah Wilson',
          email: 'sarah.wilson@techcorp.com',
          phone: '0856789012',
          company: 'TechCorp Solutions',
          message: 'We are looking for a comprehensive lead management solution for our growing sales team. Please contact us to discuss our requirements.',
          budget: '50000-100000',
          timeline: 'Within 3 months'
        }
      };

      const result = await webhookService.processWebhook('google_forms', googleFormsPayload);
      
      if (result.success) {
        console.log(`✓ Google Forms payload processed successfully. Lead ID: ${result.leadId}`);
      } else {
        console.log(`✗ Google Forms processing failed: ${result.error}`);
      }

    } catch (error) {
      console.error('Google Forms integration demo failed:', error);
    }
  }

  async runFullDemo(): Promise<void> {
    console.log('🚀 Starting External Integrations Demo');
    console.log('=====================================');

    await this.demonstrateEmailIntegration();
    await this.demonstrateCalendarIntegration();
    await this.demonstrateWebhookIntegration();
    await this.demonstrateCRMIntegration();
    await this.demonstrateMetaLeadAdsIntegration();
    await this.demonstrateGoogleFormsIntegration();

    console.log('\n🎉 External Integrations Demo Completed');
    console.log('=====================================');
    console.log('All integration services are now configured and ready for use!');
  }
}

// Export for use in other files
export const integrationsDemo = new IntegrationsDemo();

// Run demo if this file is executed directly
if (require.main === module) {
  integrationsDemo.runFullDemo().catch(console.error);
}