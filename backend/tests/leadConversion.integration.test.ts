import request from 'supertest';
import { app } from '../src/index';
import { knex } from '../src/config/database';
import { ConversionType, LeadStatus, CloseReason } from '../src/types';

describe('Lead Conversion Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let leadId: string;

  beforeAll(async () => {
    // Run migrations
    await knex.migrate.latest();
    
    // Create test user
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'sales'
      });

    userId = userResponse.body.data.user.id;

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;

    // Create test lead
    const leadResponse = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        company: {
          name: 'Test Company',
          industry: 'Technology',
          size: 'medium'
        },
        contact: {
          name: 'John Doe',
          email: 'john@testcompany.com',
          phone: '+1234567890'
        },
        source: {
          channel: 'web_form',
          campaign: 'test-campaign'
        },
        status: 'qualified',
        product: {
          type: 'software'
        }
      });

    leadId = leadResponse.body.data.id;
  });

  afterAll(async () => {
    // Clean up database
    await knex('lead_conversions').del();
    await knex('opportunities').del();
    await knex('contacts').del();
    await knex('accounts').del();
    await knex('activities').del();
    await knex('leads').del();
    await knex('users').del();
    await knex.destroy();
  });

  describe('GET /api/leads/:id/conversion/preview', () => {
    it('should generate conversion preview', async () => {
      const response = await request(app)
        .get(`/api/leads/${leadId}/conversion/preview`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('lead');
      expect(response.body.data).toHaveProperty('suggestedAccountName');
      expect(response.body.data).toHaveProperty('suggestedContactName');
      expect(response.body.data).toHaveProperty('suggestedOpportunityName');
      expect(response.body.data).toHaveProperty('duplicateAccounts');
      expect(response.body.data).toHaveProperty('duplicateContacts');
      expect(response.body.data).toHaveProperty('fieldMapping');
      expect(response.body.data).toHaveProperty('warnings');
      
      expect(response.body.data.suggestedAccountName).toBe('Test Company');
      expect(response.body.data.suggestedContactName).toBe('John Doe');
      expect(response.body.data.duplicateAccounts).toHaveLength(0);
      expect(response.body.data.duplicateContacts).toHaveLength(0);
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .get('/api/leads/non-existent-id/conversion/preview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/leads/${leadId}/conversion/preview`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/leads/:id/convert', () => {
    it('should convert lead to full conversion', async () => {
      const response = await request(app)
        .post(`/api/leads/${leadId}/convert`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conversionType: ConversionType.FULL,
          accountData: {
            name: 'Test Company',
            industry: 'Technology',
            size: 'medium',
            website: 'https://testcompany.com'
          },
          contactData: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@testcompany.com',
            phone: '+1234567890',
            title: 'CEO',
            isPrimary: true,
            isDecisionMaker: true
          },
          opportunityData: {
            name: 'Test Company - Software Solution',
            stage: 'qualification',
            amount: 50000,
            currency: 'USD',
            probability: 75,
            expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            description: 'Software solution opportunity'
          },
          notes: 'Converted from qualified lead'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('leadConversion');
      expect(response.body.data).toHaveProperty('account');
      expect(response.body.data).toHaveProperty('contact');
      expect(response.body.data).toHaveProperty('opportunity');
      
      expect(response.body.data.account.name).toBe('Test Company');
      expect(response.body.data.contact.firstName).toBe('John');
      expect(response.body.data.contact.lastName).toBe('Doe');
      expect(response.body.data.opportunity.name).toBe('Test Company - Software Solution');
      expect(response.body.data.leadConversion.conversionType).toBe(ConversionType.FULL);

      // Verify lead status was updated
      const leadResponse = await request(app)
        .get(`/api/leads/${leadId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(leadResponse.body.data.status).toBe(LeadStatus.WON);
    });

    it('should return 400 for invalid conversion data', async () => {
      // Create another lead for this test
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company: { name: 'Another Company' },
          contact: { name: 'Jane Doe', email: 'jane@another.com' },
          source: { channel: 'email' }
        });

      const newLeadId = leadResponse.body.data.id;

      const response = await request(app)
        .post(`/api/leads/${newLeadId}/convert`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conversionType: 'invalid_type'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .post('/api/leads/non-existent-id/convert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          conversionType: ConversionType.ACCOUNT_ONLY,
          accountData: { name: 'Test Account' }
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/leads/:id/close', () => {
    let testLeadId: string;

    beforeEach(async () => {
      // Create a new lead for each close test
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company: { name: 'Close Test Company' },
          contact: { name: 'Close Test', email: 'close@test.com' },
          source: { channel: 'phone' },
          status: 'qualified'
        });

      testLeadId = leadResponse.body.data.id;
    });

    it('should close lead as won', async () => {
      const response = await request(app)
        .post(`/api/leads/${testLeadId}/close`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: LeadStatus.WON,
          closeReason: CloseReason.WON_NEW_BUSINESS,
          closeNotes: 'Successfully closed the deal'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LeadStatus.WON);

      // Verify lead status was updated
      const leadResponse = await request(app)
        .get(`/api/leads/${testLeadId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(leadResponse.body.data.status).toBe(LeadStatus.WON);
    });

    it('should close lead as lost', async () => {
      const response = await request(app)
        .post(`/api/leads/${testLeadId}/close`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: LeadStatus.LOST,
          closeReason: CloseReason.LOST_COMPETITOR,
          closeNotes: 'Lost to competitor'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LeadStatus.LOST);
    });

    it('should close lead as disqualified', async () => {
      const response = await request(app)
        .post(`/api/leads/${testLeadId}/close`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: LeadStatus.DISQUALIFIED,
          closeReason: CloseReason.DISQUALIFIED_BUDGET,
          closeNotes: 'No budget available'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(LeadStatus.DISQUALIFIED);
    });

    it('should return 400 for invalid close status', async () => {
      const response = await request(app)
        .post(`/api/leads/${testLeadId}/close`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'invalid_status',
          closeReason: CloseReason.WON_NEW_BUSINESS
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/leads/:id/conversions', () => {
    it('should get conversion history for lead', async () => {
      const response = await request(app)
        .get(`/api/leads/${leadId}/conversions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Should have the conversion from the previous test
      const conversion = response.body.data[0];
      expect(conversion).toHaveProperty('leadId');
      expect(conversion).toHaveProperty('conversionType');
      expect(conversion).toHaveProperty('leadDataSnapshot');
      expect(conversion.leadId).toBe(leadId);
    });

    it('should return empty array for lead with no conversions', async () => {
      // Create a new lead
      const leadResponse = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company: { name: 'No Conversion Company' },
          contact: { name: 'No Conversion', email: 'no@conversion.com' },
          source: { channel: 'email' }
        });

      const newLeadId = leadResponse.body.data.id;

      const response = await request(app)
        .get(`/api/leads/${newLeadId}/conversions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/conversions/statistics', () => {
    it('should get conversion statistics', async () => {
      const response = await request(app)
        .get('/api/conversions/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalConversions');
      expect(response.body.data).toHaveProperty('conversionsByType');
      expect(response.body.data).toHaveProperty('recentConversions');
      expect(response.body.data).toHaveProperty('conversionRate');
      expect(response.body.data).toHaveProperty('averageTimeToConversion');
      
      expect(typeof response.body.data.totalConversions).toBe('number');
      expect(typeof response.body.data.conversionsByType).toBe('object');
      expect(typeof response.body.data.recentConversions).toBe('number');
      expect(typeof response.body.data.conversionRate).toBe('number');
      expect(typeof response.body.data.averageTimeToConversion).toBe('number');
    });
  });
});