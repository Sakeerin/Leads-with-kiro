import request from 'supertest';
import { app } from '../src/index';
import { Lead } from '../src/models/Lead';
import { Activity } from '../src/models/Activity';
import { User } from '../src/models/User';
import { AuthService } from '../src/services/authService';
import { LeadChannel, CompanySize, BusinessType, InterestLevel, BudgetStatus, PurchaseTimeline, ScoreBand, LeadStatus, UserRole } from '../src/types';

describe('Scoring API Integration Tests', () => {
  let authToken: string;
  let testUser: any;
  let testLead: any;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      email: 'scoring-test@example.com',
      password: 'hashedpassword',
      first_name: 'Scoring',
      last_name: 'Test',
      role: UserRole.ADMIN,
      is_active: true
    });

    // Generate auth token
    authToken = AuthService.generateAccessToken(testUser.id, testUser.email, testUser.role);

    // Create test lead
    testLead = await Lead.createLead({
      company: {
        name: 'Test Scoring Company',
        industry: 'technology',
        size: CompanySize.LARGE
      },
      contact: {
        name: 'John Scorer',
        email: 'john.scorer@test.com',
        phone: '+1234567890'
      },
      source: {
        channel: LeadChannel.WEB_FORM,
        campaign: 'scoring-test'
      },
      assignment: {},
      status: LeadStatus.NEW,
      score: {
        value: 0,
        band: ScoreBand.COLD,
        lastCalculated: new Date()
      },
      qualification: {
        interest: InterestLevel.HIGH,
        budget: BudgetStatus.CONFIRMED,
        timeline: PurchaseTimeline.IMMEDIATE,
        businessType: BusinessType.B2B
      },
      followUp: {},
      product: {},
      customFields: {}
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testLead) {
      await Lead.delete(testLead.id);
    }
    if (testUser) {
      await User.delete(testUser.id);
    }
  });

  describe('POST /api/scoring/leads/:leadId/calculate', () => {
    it('should calculate score for a lead', async () => {
      const response = await request(app)
        .post(`/api/scoring/leads/${testLead.id}/calculate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.leadId).toBe(testLead.id);
      expect(response.body.data.totalScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.scoreBand).toBeDefined();
      expect(response.body.data.breakdown).toBeDefined();
      expect(response.body.data.calculatedAt).toBeDefined();
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .post('/api/scoring/leads/non-existent/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('LEAD_NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post(`/api/scoring/leads/${testLead.id}/calculate`)
        .expect(401);
    });

    it('should return 400 for missing lead ID', async () => {
      const response = await request(app)
        .post('/api/scoring/leads//calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404); // Express returns 404 for malformed routes
    });
  });

  describe('POST /api/scoring/recalculate/leads', () => {
    it('should recalculate scores for specific leads', async () => {
      const response = await request(app)
        .post('/api/scoring/recalculate/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          leadIds: [testLead.id]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.processed).toBe(1);
      expect(response.body.data.successful).toBe(1);
      expect(response.body.data.failed).toBe(0);
    });

    it('should return 400 for invalid lead IDs', async () => {
      const response = await request(app)
        .post('/api/scoring/recalculate/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          leadIds: 'not-an-array'
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_LEAD_IDS');
    });

    it('should return 400 for empty lead IDs array', async () => {
      const response = await request(app)
        .post('/api/scoring/recalculate/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          leadIds: []
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_LEAD_IDS');
    });
  });

  describe('GET /api/scoring/bands', () => {
    it('should return score bands configuration', async () => {
      const response = await request(app)
        .get('/api/scoring/bands')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check structure of first band
      const firstBand = response.body.data[0];
      expect(firstBand.band).toBeDefined();
      expect(firstBand.minScore).toBeDefined();
      expect(firstBand.maxScore).toBeDefined();
      expect(firstBand.actions).toBeDefined();
    });
  });

  describe('PUT /api/scoring/bands', () => {
    it('should update score bands configuration', async () => {
      const newScoreBands = [
        {
          band: ScoreBand.HOT,
          minScore: 80,
          maxScore: 100,
          actions: [
            {
              type: 'assign_to_senior',
              parameters: { priority: 'high' }
            }
          ]
        },
        {
          band: ScoreBand.WARM,
          minScore: 50,
          maxScore: 79,
          actions: []
        },
        {
          band: ScoreBand.COLD,
          minScore: 0,
          maxScore: 49,
          actions: []
        }
      ];

      const response = await request(app)
        .put('/api/scoring/bands')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scoreBands: newScoreBands
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(newScoreBands);
    });

    it('should return 400 for invalid score bands', async () => {
      const invalidBands = [
        {
          band: ScoreBand.HOT,
          minScore: 150, // Invalid: > 100
          maxScore: 200,
          actions: []
        }
      ];

      const response = await request(app)
        .put('/api/scoring/bands')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scoreBands: invalidBands
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/scoring/models/:modelId', () => {
    it('should return default scoring model', async () => {
      const response = await request(app)
        .get('/api/scoring/models/default')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('default');
      expect(response.body.data.name).toBeDefined();
      expect(response.body.data.criteria).toBeDefined();
      expect(response.body.data.scoreBands).toBeDefined();
    });

    it('should return 404 for non-existent model', async () => {
      const response = await request(app)
        .get('/api/scoring/models/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('MODEL_NOT_FOUND');
    });
  });

  describe('POST /api/scoring/models', () => {
    it('should create new scoring model', async () => {
      const modelData = {
        name: 'Test Scoring Model',
        description: 'Test model for integration tests',
        criteria: {
          profileFit: {
            industry: { technology: 15 },
            companySize: { large: 20 },
            businessType: { b2b: 15 }
          },
          behavioral: {
            emailOpens: 2,
            emailReplies: 8,
            websiteVisits: 3,
            formCompletions: 5,
            callAnswered: 10,
            meetingAttended: 15
          },
          recency: {
            createdWithinDays: { 1: 10, 7: 8, 30: 5 },
            lastActivityWithinDays: { 1: 8, 7: 6, 30: 3 }
          },
          source: {
            channels: { web_form: 10, email: 6 }
          },
          qualification: {
            interest: { high: 15, medium: 8, low: 3 },
            budget: { confirmed: 12, estimated: 6, unknown: 0 },
            timeline: { immediate: 15, within_month: 10 }
          },
          weights: {
            profileFit: 0.25,
            behavioral: 0.30,
            recency: 0.15,
            source: 0.15,
            qualification: 0.15
          }
        },
        scoreBands: [
          {
            band: ScoreBand.HOT,
            minScore: 70,
            maxScore: 100,
            actions: []
          },
          {
            band: ScoreBand.WARM,
            minScore: 40,
            maxScore: 69,
            actions: []
          },
          {
            band: ScoreBand.COLD,
            minScore: 0,
            maxScore: 39,
            actions: []
          }
        ],
        isActive: true,
        isDefault: false
      };

      const response = await request(app)
        .post('/api/scoring/models')
        .set('Authorization', `Bearer ${authToken}`)
        .send(modelData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(modelData.name);
      expect(response.body.data.id).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/scoring/models')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Incomplete Model'
          // Missing criteria and scoreBands
        })
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });
  });

  describe('GET /api/scoring/scores', () => {
    beforeAll(async () => {
      // Calculate score for test lead to have data
      await request(app)
        .post(`/api/scoring/leads/${testLead.id}/calculate`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should return lead scores with pagination', async () => {
      const response = await request(app)
        .get('/api/scoring/scores')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.scores).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(20);
    });

    it('should filter by score band', async () => {
      const response = await request(app)
        .get('/api/scoring/scores?scoreBand=hot')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.scores).toBeDefined();
    });

    it('should filter by score range', async () => {
      const response = await request(app)
        .get('/api/scoring/scores?minScore=50&maxScore=100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.scores).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/scoring/scores?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/scoring/statistics', () => {
    it('should return scoring statistics', async () => {
      const response = await request(app)
        .get('/api/scoring/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalScored).toBeDefined();
      expect(response.body.data.scoreBandDistribution).toBeDefined();
      expect(response.body.data.averageScore).toBeDefined();
      expect(response.body.data.scoreRanges).toBeDefined();
      
      // Check structure
      expect(response.body.data.scoreBandDistribution.hot).toBeDefined();
      expect(response.body.data.scoreBandDistribution.warm).toBeDefined();
      expect(response.body.data.scoreBandDistribution.cold).toBeDefined();
      
      expect(response.body.data.scoreRanges['0-25']).toBeDefined();
      expect(response.body.data.scoreRanges['26-50']).toBeDefined();
      expect(response.body.data.scoreRanges['51-75']).toBeDefined();
      expect(response.body.data.scoreRanges['76-100']).toBeDefined();
    });
  });

  describe('POST /api/scoring/recalculate/all', () => {
    it('should recalculate all lead scores', async () => {
      const response = await request(app)
        .post('/api/scoring/recalculate/all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.processed).toBeGreaterThanOrEqual(0);
      expect(response.body.data.successful).toBeGreaterThanOrEqual(0);
      expect(response.body.data.failed).toBeGreaterThanOrEqual(0);
      expect(response.body.data.startedAt).toBeDefined();
      expect(response.body.data.completedAt).toBeDefined();
    });
  });
});