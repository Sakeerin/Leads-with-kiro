import request from 'supertest';
import { app } from '../src/index';
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

// Mock external services
jest.mock('googleapis');
jest.mock('@microsoft/microsoft-graph-client');

describe('External Integrations', () => {
  let authToken: string;

  beforeAll(async () => {
    // Get auth token for testing
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;
  });

  describe('Email Service Integration', () => {
    describe('GET /api/integrations/email/providers', () => {
      it('should return available email providers', async () => {
        const response = await request(app)
          .get('/api/integrations/email/providers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('providers');
        expect(Array.isArray(response.body.providers)).toBe(true);
      });
    });

    describe('POST /api/integrations/email/configure', () => {
      it('should configure Microsoft 365 email provider', async () => {
        const response = await request(app)
          .post('/api/integrations/email/configure')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            provider: 'microsoft365',
            accessToken: 'mock-access-token'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('microsoft365');
      });

      it('should configure Gmail email provider', async () => {
        const response = await request(app)
          .post('/api/integrations/email/configure')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            provider: 'gmail',
            accessToken: 'mock-access-token'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('gmail');
      });

      it('should reject unsupported email provider', async () => {
        const response = await request(app)
          .post('/api/integrations/email/configure')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            provider: 'unsupported',
            accessToken: 'mock-access-token'
          })
          .expect(400);

        expect(response.body.error).toContain('Unsupported email provider');
      });
    });
  });

  describe('Calendar Service Integration', () => {
    describe('GET /api/integrations/calendar/providers', () => {
      it('should return available calendar providers', async () => {
        const response = await request(app)
          .get('/api/integrations/calendar/providers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('providers');
        expect(Array.isArray(response.body.providers)).toBe(true);
      });
    });

    describe('POST /api/integrations/calendar/configure', () => {
      it('should configure Microsoft 365 calendar provider', async () => {
        const response = await request(app)
          .post('/api/integrations/calendar/configure')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            provider: 'microsoft365',
            accessToken: 'mock-access-token'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('microsoft365');
      });

      it('should configure Google calendar provider', async () => {
        const response = await request(app)
          .post('/api/integrations/calendar/configure')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            provider: 'google',
            accessToken: 'mock-access-token'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('google');
      });
    });

    describe('POST /api/integrations/calendar/events', () => {
      it('should create calendar event', async () => {
        // First configure a provider
        await request(app)
          .post('/api/integrations/calendar/configure')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            provider: 'microsoft365',
            accessToken: 'mock-access-token'
          });

        const eventData = {
          provider: 'microsoft365',
          event: {
            title: 'Test Meeting',
            description: 'Test meeting description',
            startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(), // Tomorrow + 1 hour
            attendees: [
              { email: 'test@example.com', name: 'Test User', required: true }
            ],
            location: 'Conference Room A'
          }
        };

        const response = await request(app)
          .post('/api/integrations/calendar/events')
          .set('Authorization', `Bearer ${authToken}`)
          .send(eventData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('eventId');
      });
    });
  });

  describe('CRM Integration', () => {
    describe('GET /api/integrations/crm/providers', () => {
      it('should return available CRM providers', async () => {
        const response = await request(app)
          .get('/api/integrations/crm/providers')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('providers');
        expect(Array.isArray(response.body.providers)).toBe(true);
        expect(response.body.providers).toContain('salesforce');
        expect(response.body.providers).toContain('hubspot');
      });
    });

    describe('POST /api/integrations/crm/configure', () => {
      it('should configure Salesforce integration', async () => {
        const config = {
          id: 'test-salesforce',
          name: 'Test Salesforce',
          provider: 'salesforce',
          isActive: true,
          credentials: {
            type: 'oauth',
            accessToken: 'mock-access-token',
            instanceUrl: 'https://test.salesforce.com'
          },
          fieldMappings: {
            lead: [],
            account: [],
            contact: [],
            opportunity: []
          },
          syncSettings: {
            bidirectional: false,
            conflictResolution: 'local_wins',
            syncFrequency: 60
          }
        };

        const response = await request(app)
          .post('/api/integrations/crm/configure')
          .set('Authorization', `Bearer ${authToken}`)
          .send(config)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('configured successfully');
      });
    });

    describe('GET /api/integrations/crm/configurations', () => {
      it('should return CRM configurations', async () => {
        const response = await request(app)
          .get('/api/integrations/crm/configurations')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('configurations');
        expect(Array.isArray(response.body.configurations)).toBe(true);
      });
    });
  });

  describe('Webhook Management', () => {
    describe('GET /api/integrations/webhooks', () => {
      it('should return configured webhooks', async () => {
        const response = await request(app)
          .get('/api/integrations/webhooks')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('webhooks');
        expect(Array.isArray(response.body.webhooks)).toBe(true);
      });
    });

    describe('POST /api/integrations/webhooks', () => {
      it('should create new webhook configuration', async () => {
        const webhookConfig = {
          id: 'test-webhook',
          name: 'Test Webhook',
          url: '/webhooks/test',
          source: 'test_form',
          isActive: true,
          fieldMapping: {
            'name': 'contact.name',
            'email': 'contact.email',
            'company': 'company.name'
          },
          transformations: [
            { field: 'contact.email', type: 'email_normalize' }
          ]
        };

        const response = await request(app)
          .post('/api/integrations/webhooks')
          .set('Authorization', `Bearer ${authToken}`)
          .send(webhookConfig)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.webhookId).toBe('test-webhook');
      });
    });

    describe('POST /api/integrations/webhooks/:webhookId', () => {
      it('should process generic webhook payload', async () => {
        // First create a webhook configuration
        const webhookConfig = {
          id: 'generic-test',
          name: 'Generic Test Webhook',
          url: '/webhooks/generic-test',
          source: 'external_form',
          isActive: true,
          fieldMapping: {
            'full_name': 'contact.name',
            'email_address': 'contact.email',
            'company_name': 'company.name',
            'phone_number': 'contact.phone'
          },
          transformations: [
            { field: 'contact.email', type: 'email_normalize' },
            { field: 'contact.phone', type: 'phone_format' }
          ]
        };

        await request(app)
          .post('/api/integrations/webhooks')
          .set('Authorization', `Bearer ${authToken}`)
          .send(webhookConfig);

        // Now test the webhook endpoint
        const webhookPayload = {
          full_name: 'John Doe',
          email_address: 'JOHN.DOE@EXAMPLE.COM',
          company_name: 'Test Company',
          phone_number: '0812345678',
          message: 'Interested in your services'
        };

        const response = await request(app)
          .post('/api/integrations/webhooks/generic-test')
          .send(webhookPayload)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('leadId');
      });
    });
  });

  describe('Meta Lead Ads Webhook', () => {
    describe('GET /api/integrations/webhooks/meta', () => {
      it('should verify Meta webhook with correct token', async () => {
        process.env.META_VERIFY_TOKEN = 'test-verify-token';

        const response = await request(app)
          .get('/api/integrations/webhooks/meta')
          .query({
            'hub.mode': 'subscribe',
            'hub.verify_token': 'test-verify-token',
            'hub.challenge': 'test-challenge'
          })
          .expect(200);

        expect(response.text).toBe('test-challenge');
      });

      it('should reject Meta webhook with incorrect token', async () => {
        process.env.META_VERIFY_TOKEN = 'correct-token';

        await request(app)
          .get('/api/integrations/webhooks/meta')
          .query({
            'hub.mode': 'subscribe',
            'hub.verify_token': 'wrong-token',
            'hub.challenge': 'test-challenge'
          })
          .expect(403);
      });
    });

    describe('POST /api/integrations/webhooks/meta', () => {
      it('should process Meta Lead Ads webhook payload', async () => {
        const metaPayload = {
          object: 'page',
          entry: [
            {
              id: 'page-id',
              time: Date.now(),
              changes: [
                {
                  field: 'leadgen',
                  value: {
                    leadgen_id: 'lead-123',
                    form_id: 'form-456',
                    page_id: 'page-789',
                    ad_id: 'ad-101',
                    campaign_id: 'campaign-202',
                    created_time: Date.now(),
                    field_data: [
                      { name: 'full_name', values: ['John Doe'] },
                      { name: 'email', values: ['john.doe@example.com'] },
                      { name: 'phone_number', values: ['0812345678'] },
                      { name: 'company_name', values: ['Test Company'] }
                    ]
                  }
                }
              ]
            }
          ]
        };

        const response = await request(app)
          .post('/api/integrations/webhooks/meta')
          .send(metaPayload)
          .expect(200);

        expect(response.text).toBe('OK');
      });
    });
  });

  describe('Google Forms Webhook', () => {
    describe('POST /api/integrations/webhooks/google-forms', () => {
      it('should process Google Forms webhook payload', async () => {
        const googleFormsPayload = {
          form_id: 'form-123',
          response_id: 'response-456',
          timestamp: new Date().toISOString(),
          responses: {
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phone: '0987654321',
            company: 'Another Company',
            message: 'Looking for more information'
          }
        };

        const response = await request(app)
          .post('/api/integrations/webhooks/google-forms')
          .send(googleFormsPayload)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('leadId');
      });
    });
  });
});

describe('Email Service Unit Tests', () => {
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
});

describe('Calendar Service Unit Tests', () => {
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
});

describe('Webhook Service Unit Tests', () => {
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

describe('CRM Integration Service Unit Tests', () => {
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