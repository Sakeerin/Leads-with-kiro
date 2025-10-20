import { 
  ExternalEmailService, 
  Microsoft365EmailService, 
  GmailEmailService 
} from '../src/services/externalEmailService';
import { 
  ExternalCalendarService, 
  Microsoft365CalendarService, 
  GoogleCalendarService 
} from '../src/services/externalCalendarService';
import { webhookService } from '../src/services/webhookService';
import { crmIntegrationService } from '../src/services/crmIntegrationService';

// Mock external dependencies
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn()
      }))
    },
    gmail: jest.fn().mockReturnValue({
      users: {
        messages: {
          send: jest.fn().mockResolvedValue({ data: { id: 'mock-message-id' } }),
          list: jest.fn().mockResolvedValue({ data: { messages: [] } }),
          get: jest.fn().mockResolvedValue({ data: { payload: { headers: [] } } })
        },
        labels: {
          create: jest.fn().mockResolvedValue({ data: { id: 'mock-label-id' } })
        }
      }
    }),
    calendar: jest.fn().mockReturnValue({
      events: {
        insert: jest.fn().mockResolvedValue({ data: { id: 'mock-event-id' } }),
        patch: jest.fn().mockResolvedValue({ data: { id: 'mock-event-id' } }),
        delete: jest.fn().mockResolvedValue({}),
        list: jest.fn().mockResolvedValue({ data: { items: [] } })
      },
      freebusy: {
        query: jest.fn().mockResolvedValue({ data: { calendars: {} } })
      }
    })
  }
}));

jest.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    initWithMiddleware: jest.fn().mockReturnValue({
      api: jest.fn().mockReturnValue({
        post: jest.fn().mockResolvedValue({ id: 'mock-id' }),
        patch: jest.fn().mockResolvedValue({ id: 'mock-id' }),
        delete: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue({ value: [] }),
        top: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis()
      })
    })
  }
}));

describe('External Integrations - Simple Tests', () => {
  describe('Email Service', () => {
    let emailService: ExternalEmailService;

    beforeEach(() => {
      emailService = new ExternalEmailService();
    });

    it('should register email providers', () => {
      const mockProvider = new Microsoft365EmailService('mock-token');
      emailService.registerProvider('test-provider', mockProvider);
      
      const providers = emailService.getAvailableProviders();
      expect(providers).toContain('test-provider');
    });

    it('should throw error for unknown provider', async () => {
      await expect(
        emailService.sendEmail('unknown-provider', 'test@example.com', 'Subject', 'Body')
      ).rejects.toThrow("Email provider 'unknown-provider' not found");
    });

    it('should send email with registered provider', async () => {
      const mockProvider = new Microsoft365EmailService('mock-token');
      emailService.registerProvider('microsoft365', mockProvider);
      
      const result = await emailService.sendEmail(
        'microsoft365', 
        'test@example.com', 
        'Test Subject', 
        'Test Body'
      );
      
      expect(result.status).toBe('sent');
      expect(result.messageId).toBeDefined();
    });
  });

  describe('Calendar Service', () => {
    let calendarService: ExternalCalendarService;

    beforeEach(() => {
      calendarService = new ExternalCalendarService();
    });

    it('should register calendar providers', () => {
      const mockProvider = new Microsoft365CalendarService('mock-token');
      calendarService.registerProvider('test-calendar', mockProvider);
      
      const providers = calendarService.getAvailableProviders();
      expect(providers).toContain('test-calendar');
    });

    it('should throw error for unknown provider', async () => {
      const mockEvent = {
        title: 'Test Event',
        startTime: new Date(),
        endTime: new Date(),
        attendees: []
      };

      await expect(
        calendarService.createEvent('unknown-provider', mockEvent)
      ).rejects.toThrow("Calendar provider 'unknown-provider' not found");
    });

    it('should create calendar event with registered provider', async () => {
      const mockProvider = new Microsoft365CalendarService('mock-token');
      calendarService.registerProvider('microsoft365', mockProvider);
      
      const event = {
        title: 'Test Meeting',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        attendees: [{ email: 'test@example.com', required: true }]
      };
      
      const result = await calendarService.createEvent('microsoft365', event);
      
      expect(result.status).toBe('created');
      expect(result.id).toBeDefined();
    });
  });

  describe('Webhook Service', () => {
    it('should register and retrieve webhook configurations', () => {
      const config = {
        id: 'test-webhook',
        name: 'Test Webhook',
        url: '/test',
        source: 'test',
        isActive: true,
        fieldMapping: {}
      };

      webhookService.registerWebhook(config);
      
      const retrieved = webhookService.getWebhookConfig('test-webhook');
      expect(retrieved).toEqual(config);
    });

    it('should unregister webhooks', () => {
      const config = {
        id: 'temp-webhook',
        name: 'Temporary Webhook',
        url: '/temp',
        source: 'temp',
        isActive: true,
        fieldMapping: {}
      };

      webhookService.registerWebhook(config);
      expect(webhookService.getWebhookConfig('temp-webhook')).toBeDefined();
      
      webhookService.unregisterWebhook('temp-webhook');
      expect(webhookService.getWebhookConfig('temp-webhook')).toBeUndefined();
    });

    it('should return all webhook configurations', () => {
      const webhooks = webhookService.getAllWebhooks();
      expect(Array.isArray(webhooks)).toBe(true);
      
      // Should include the default webhooks (meta_lead_ads, google_forms)
      const webhookIds = webhooks.map(w => w.id);
      expect(webhookIds).toContain('meta_lead_ads');
      expect(webhookIds).toContain('google_forms');
    });
  });

  describe('CRM Integration Service', () => {
    it('should return available CRM providers', () => {
      const providers = crmIntegrationService.getAvailableProviders();
      expect(providers).toContain('salesforce');
      expect(providers).toContain('hubspot');
    });

    it('should throw error for unknown CRM provider', async () => {
      const config = {
        id: 'test-config',
        name: 'Test Config',
        provider: 'unknown-crm',
        isActive: true,
        credentials: { type: 'api_key' as const, apiKey: 'test' },
        fieldMappings: { lead: [], account: [], contact: [], opportunity: [] },
        syncSettings: {
          bidirectional: false,
          conflictResolution: 'local_wins' as const,
          syncFrequency: 60
        }
      };

      await expect(
        crmIntegrationService.configureIntegration(config)
      ).rejects.toThrow("CRM provider 'unknown-crm' not found");
    });
  });

  describe('Webhook Data Transformation', () => {
    it('should transform webhook data correctly', async () => {
      const config = {
        id: 'transform-test',
        name: 'Transform Test',
        url: '/transform-test',
        source: 'test_form',
        isActive: true,
        fieldMapping: {
          'full_name': 'contact.name',
          'email_address': 'contact.email',
          'company_name': 'company.name'
        },
        transformations: [
          { field: 'contact.email', type: 'email_normalize' as const }
        ]
      };

      webhookService.registerWebhook(config);

      const payload = {
        source: 'test_form',
        timestamp: new Date(),
        data: {
          full_name: 'John Doe',
          email_address: '  JOHN.DOE@EXAMPLE.COM  ',
          company_name: 'Test Company'
        }
      };

      // Mock leadService.createLead to avoid database operations
      const mockLeadService = {
        createLead: jest.fn().mockResolvedValue({ id: 'mock-lead-id' })
      };

      // Replace the leadService import temporarily
      const originalCreateLead = require('../src/services/leadService').leadService.createLead;
      require('../src/services/leadService').leadService.createLead = mockLeadService.createLead;

      const result = await webhookService.processWebhook('transform-test', payload);

      // Restore original function
      require('../src/services/leadService').leadService.createLead = originalCreateLead;

      expect(result.success).toBe(true);
      expect(result.leadId).toBe('mock-lead-id');

      // Verify the transformation was applied
      expect(mockLeadService.createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          contact: expect.objectContaining({
            name: 'John Doe',
            email: 'john.doe@example.com' // Should be normalized
          }),
          company: expect.objectContaining({
            name: 'Test Company'
          })
        })
      );

      // Clean up
      webhookService.unregisterWebhook('transform-test');
    });
  });
});