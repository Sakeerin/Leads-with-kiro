import request from 'supertest';
import app from '../src/index';
import { Lead } from '../src/models/Lead';
import { User } from '../src/models/User';
import { Activity } from '../src/models/Activity';
import { Task } from '../src/models/Task';
import { LeadStatus, LeadChannel, UserRole, ActivityType, TaskStatus } from '../src/types';

describe('Reporting API Integration Tests', () => {
  let authToken: string;
  let testUser: any;
  let testLeads: any[] = [];

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'hashedpassword',
      first_name: 'Test',
      last_name: 'User',
      role: UserRole.ADMIN,
      is_active: true
    });

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;

    // Create test leads for reporting
    const leadData = [
      {
        company_name: 'Test Company 1',
        contact_name: 'John Doe',
        contact_email: 'john@testcompany1.com',
        source_channel: LeadChannel.WEB_FORM,
        status: LeadStatus.NEW,
        score_value: 75,
        score_band: 'warm',
        score_last_calculated: new Date(),
        assigned_to: testUser.id,
        assigned_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        is_active: true,
        created_by: testUser.id
      },
      {
        company_name: 'Test Company 2',
        contact_name: 'Jane Smith',
        contact_email: 'jane@testcompany2.com',
        source_channel: LeadChannel.EMAIL,
        status: LeadStatus.CONTACTED,
        score_value: 85,
        score_band: 'hot',
        score_last_calculated: new Date(),
        assigned_to: testUser.id,
        assigned_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        is_active: true,
        created_by: testUser.id
      },
      {
        company_name: 'Test Company 3',
        contact_name: 'Bob Johnson',
        contact_email: 'bob@testcompany3.com',
        source_channel: LeadChannel.PAID_ADS,
        status: LeadStatus.QUALIFIED,
        score_value: 90,
        score_band: 'hot',
        score_last_calculated: new Date(),
        assigned_to: testUser.id,
        assigned_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        is_active: true,
        created_by: testUser.id
      }
    ];

    for (const lead of leadData) {
      const createdLead = await Lead.create({
        ...lead,
        account_lead_id: await Lead.generateAccountLeadId()
      });
      testLeads.push(createdLead);
    }

    // Create test activities
    for (const lead of testLeads) {
      await Activity.create({
        lead_id: lead.id,
        type: ActivityType.LEAD_CREATED,
        subject: 'Lead created',
        details: JSON.stringify({ source: 'test' }),
        performed_by: testUser.id,
        performed_at: new Date()
      });
    }

    // Create test tasks
    await Task.create({
      lead_id: testLeads[0].id,
      subject: 'Follow up call',
      type: 'call',
      priority: 'medium',
      assigned_to: testUser.id,
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: TaskStatus.COMPLETED,
      created_by: testUser.id
    });

    await Task.create({
      lead_id: testLeads[1].id,
      subject: 'Send proposal',
      type: 'email',
      priority: 'high',
      assigned_to: testUser.id,
      due_date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Overdue
      status: TaskStatus.PENDING,
      created_by: testUser.id
    });
  });

  afterAll(async () => {
    // Clean up test data
    await Activity.query.where('performed_by', testUser.id).del();
    await Task.query.where('created_by', testUser.id).del();
    await Lead.query.where('created_by', testUser.id).del();
    await User.query.where('id', testUser.id).del();
  });

  describe('GET /api/reporting/funnel-metrics', () => {
    it('should return funnel metrics', async () => {
      const response = await request(app)
        .get('/api/reporting/funnel-metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics).toBeInstanceOf(Array);
      expect(response.body.data.generatedAt).toBeDefined();
    });

    it('should accept date range parameters', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get('/api/reporting/funnel-metrics')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dateRange).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/reporting/funnel-metrics')
        .expect(401);
    });
  });

  describe('GET /api/reporting/time-to-first-touch', () => {
    it('should return time-to-first-touch report', async () => {
      const response = await request(app)
        .get('/api/reporting/time-to-first-touch')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.averageTimeToFirstTouch).toBeDefined();
      expect(response.body.data.medianTimeToFirstTouch).toBeDefined();
      expect(response.body.data.bySource).toBeInstanceOf(Array);
      expect(response.body.data.byAssignee).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/reporting/sla-compliance', () => {
    it('should return SLA compliance report', async () => {
      const response = await request(app)
        .get('/api/reporting/sla-compliance')
        .query({ slaHours: 24 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overallCompliance).toBeDefined();
      expect(response.body.data.totalLeads).toBeDefined();
      expect(response.body.data.compliantLeads).toBeDefined();
      expect(response.body.data.byAssignee).toBeInstanceOf(Array);
      expect(response.body.data.bySource).toBeInstanceOf(Array);
      expect(response.body.data.slaHours).toBe(24);
    });

    it('should use default SLA hours if not provided', async () => {
      const response = await request(app)
        .get('/api/reporting/sla-compliance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.slaHours).toBe(24);
    });
  });

  describe('GET /api/reporting/source-effectiveness', () => {
    it('should return source effectiveness report', async () => {
      const response = await request(app)
        .get('/api/reporting/source-effectiveness')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sources).toBeInstanceOf(Array);
      
      if (response.body.data.sources.length > 0) {
        const source = response.body.data.sources[0];
        expect(source.source).toBeDefined();
        expect(source.totalLeads).toBeDefined();
        expect(source.qualificationRate).toBeDefined();
        expect(source.conversionRate).toBeDefined();
      }
    });
  });

  describe('GET /api/reporting/sales-performance', () => {
    it('should return sales performance report', async () => {
      const response = await request(app)
        .get('/api/reporting/sales-performance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.representatives).toBeInstanceOf(Array);
      
      if (response.body.data.representatives.length > 0) {
        const rep = response.body.data.representatives[0];
        expect(rep.assigneeId).toBeDefined();
        expect(rep.assigneeName).toBeDefined();
        expect(rep.totalLeads).toBeDefined();
        expect(rep.conversionRate).toBeDefined();
      }
    });

    it('should filter by assignee ID', async () => {
      const response = await request(app)
        .get('/api/reporting/sales-performance')
        .query({ assigneeId: testUser.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.representatives.length > 0) {
        expect(response.body.data.representatives[0].assigneeId).toBe(testUser.id);
      }
    });
  });

  describe('GET /api/reporting/data-quality', () => {
    it('should return data quality report', async () => {
      const response = await request(app)
        .get('/api/reporting/data-quality')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalLeads).toBeDefined();
      expect(response.body.data.duplicateRate).toBeDefined();
      expect(response.body.data.dataCompletenessScore).toBeDefined();
      expect(response.body.data.missingFields).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/reporting/dashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      const response = await request(app)
        .get('/api/reporting/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.funnelMetrics).toBeInstanceOf(Array);
      expect(response.body.data.timeToFirstTouch).toBeDefined();
      expect(response.body.data.slaCompliance).toBeDefined();
      expect(response.body.data.sourceEffectiveness).toBeInstanceOf(Array);
      expect(response.body.data.salesRepPerformance).toBeInstanceOf(Array);
      expect(response.body.data.dataQuality).toBeDefined();
      expect(response.body.data.generatedAt).toBeDefined();
    });
  });

  describe('GET /api/reporting/export', () => {
    it('should export funnel metrics as JSON', async () => {
      const response = await request(app)
        .get('/api/reporting/export')
        .query({ reportType: 'funnel', format: 'json' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should export SLA compliance as CSV', async () => {
      const response = await request(app)
        .get('/api/reporting/export')
        .query({ reportType: 'sla-compliance', format: 'csv', slaHours: 24 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should return error for invalid report type', async () => {
      await request(app)
        .get('/api/reporting/export')
        .query({ reportType: 'invalid-type' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should require report type parameter', async () => {
      await request(app)
        .get('/api/reporting/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error by using an invalid date range
      const response = await request(app)
        .get('/api/reporting/funnel-metrics')
        .query({ startDate: 'invalid-date', endDate: 'invalid-date' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});