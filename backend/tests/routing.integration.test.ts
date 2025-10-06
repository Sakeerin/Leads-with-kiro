import request from 'supertest';
import { app } from '../src/index';
import { Lead } from '../src/models/Lead';
import { User } from '../src/models/User';
import { AssignmentRule } from '../src/models/AssignmentRule';
import { UserRole, LeadStatus, ScoreBand, LeadChannel } from '../src/types';

describe('Routing API Integration Tests', () => {
  let authToken: string;
  let testUser: any;
  let testLead: any;
  let testAssignmentRule: any;

  beforeAll(async () => {
    // Create test user and get auth token
    const userData = {
      email: 'test@routing.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.MANAGER,
      isActive: true,
      profile: {}
    };

    testUser = await User.createUser(userData);

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@routing.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;

    // Create test lead
    const leadData = {
      company: { name: 'Test Company' },
      contact: { name: 'John Doe', email: 'john@test.com' },
      source: { channel: LeadChannel.WEB_FORM },
      assignment: {},
      status: LeadStatus.NEW,
      score: { value: 75, band: ScoreBand.WARM, lastCalculated: new Date() },
      qualification: {},
      followUp: {},
      product: {},
      customFields: {}
    };

    testLead = await Lead.createLead(leadData);

    // Create test assignment rule
    const ruleData = {
      name: 'Test Rule',
      priority: 1,
      conditions: [
        { field: 'score.value', operator: 'greater_than', value: 50 }
      ],
      actions: [
        { type: 'assign_to_user', parameters: { userId: testUser.id } }
      ],
      isActive: true,
      createdBy: testUser.id
    };

    testAssignmentRule = await AssignmentRule.createRule(ruleData);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testLead) await Lead.delete(testLead.id);
    if (testAssignmentRule) await AssignmentRule.delete(testAssignmentRule.id);
    if (testUser) await User.delete(testUser.id);
  });

  describe('POST /api/routing/leads/:leadId/assign', () => {
    it('should assign a lead automatically', async () => {
      const response = await request(app)
        .post(`/api/routing/leads/${testLead.id}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('leadId', testLead.id);
      expect(response.body.data).toHaveProperty('assignedTo');
      expect(response.body.data).toHaveProperty('assignmentReason');
    });

    it('should assign a lead manually', async () => {
      // Create another lead for manual assignment
      const leadData = {
        company: { name: 'Manual Test Company' },
        contact: { name: 'Jane Doe', email: 'jane@test.com' },
        source: { channel: LeadChannel.EMAIL },
        assignment: {},
        status: LeadStatus.NEW,
        score: { value: 60, band: ScoreBand.WARM, lastCalculated: new Date() },
        qualification: {},
        followUp: {},
        product: {},
        customFields: {}
      };

      const manualLead = await Lead.createLead(leadData);

      const response = await request(app)
        .post(`/api/routing/leads/${manualLead.id}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ assigneeId: testUser.id });

      expect(response.status).toBe(200);
      expect(response.body.data.assignedTo).toBe(testUser.id);
      expect(response.body.data.assignmentReason).toBe('Manual assignment');

      // Cleanup
      await Lead.delete(manualLead.id);
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .post('/api/routing/leads/non-existent-id/assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/routing/leads/${testLead.id}/assign`)
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/routing/leads/:leadId/reassign', () => {
    it('should reassign a lead with proper authorization', async () => {
      // First assign the lead
      await request(app)
        .post(`/api/routing/leads/${testLead.id}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ assigneeId: testUser.id });

      // Create another user to reassign to
      const newAssigneeData = {
        email: 'newassignee@test.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'Assignee',
        role: UserRole.SALES,
        isActive: true,
        profile: {}
      };

      const newAssignee = await User.createUser(newAssigneeData);

      const response = await request(app)
        .post(`/api/routing/leads/${testLead.id}/reassign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          newAssigneeId: newAssignee.id,
          reason: 'Better expertise match'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.assignedTo).toBe(newAssignee.id);
      expect(response.body.data.assignmentReason).toContain('Better expertise match');

      // Cleanup
      await User.delete(newAssignee.id);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post(`/api/routing/leads/${testLead.id}/reassign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ newAssigneeId: testUser.id }); // Missing reason

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/routing/workloads', () => {
    it('should return workload information for all users', async () => {
      const response = await request(app)
        .get('/api/routing/workloads')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/routing/workloads/:userId', () => {
    it('should return workload information for specific user', async () => {
      const response = await request(app)
        .get(`/api/routing/workloads/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('userId', testUser.id);
      expect(response.body.data).toHaveProperty('activeLeads');
      expect(response.body.data).toHaveProperty('workloadScore');
    });
  });

  describe('GET /api/routing/leads/:leadId/sla', () => {
    it('should return SLA status for assigned lead', async () => {
      // Assign the lead first
      await request(app)
        .post(`/api/routing/leads/${testLead.id}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ assigneeId: testUser.id });

      const response = await request(app)
        .get(`/api/routing/leads/${testLead.id}/sla`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('leadId', testLead.id);
      expect(response.body.data).toHaveProperty('assignedAt');
      expect(response.body.data).toHaveProperty('slaDeadline');
      expect(response.body.data).toHaveProperty('isOverdue');
      expect(response.body.data).toHaveProperty('hoursRemaining');
    });
  });

  describe('GET /api/routing/sla/overdue', () => {
    it('should return list of overdue leads', async () => {
      const response = await request(app)
        .get('/api/routing/sla/overdue')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/routing/sla/escalate', () => {
    it('should escalate overdue leads', async () => {
      const response = await request(app)
        .post('/api/routing/sla/escalate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Assignment Rules Management', () => {
    describe('GET /api/routing/rules', () => {
      it('should return all assignment rules', async () => {
        const response = await request(app)
          .get('/api/routing/rules')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should return only active rules when filtered', async () => {
        const response = await request(app)
          .get('/api/routing/rules?active=true')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('POST /api/routing/rules', () => {
      it('should create a new assignment rule', async () => {
        const ruleData = {
          name: 'New Test Rule',
          priority: 2,
          conditions: [
            { field: 'source.channel', operator: 'equals', value: 'email' }
          ],
          actions: [
            { type: 'assign_to_user', parameters: { userId: testUser.id } }
          ],
          isActive: true
        };

        const response = await request(app)
          .post('/api/routing/rules')
          .set('Authorization', `Bearer ${authToken}`)
          .send(ruleData);

        expect(response.status).toBe(201);
        expect(response.body.data.name).toBe('New Test Rule');
        expect(response.body.data.priority).toBe(2);

        // Cleanup
        await AssignmentRule.delete(response.body.data.id);
      });

      it('should return 400 for invalid rule data', async () => {
        const response = await request(app)
          .post('/api/routing/rules')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Incomplete Rule' }); // Missing required fields

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/routing/rules/:ruleId', () => {
      it('should return specific assignment rule', async () => {
        const response = await request(app)
          .get(`/api/routing/rules/${testAssignmentRule.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(testAssignmentRule.id);
        expect(response.body.data.name).toBe('Test Rule');
      });

      it('should return 404 for non-existent rule', async () => {
        const response = await request(app)
          .get('/api/routing/rules/non-existent-id')
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
      });
    });

    describe('PUT /api/routing/rules/:ruleId', () => {
      it('should update assignment rule', async () => {
        const updateData = {
          name: 'Updated Test Rule',
          priority: 3
        };

        const response = await request(app)
          .put(`/api/routing/rules/${testAssignmentRule.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('Updated Test Rule');
        expect(response.body.data.priority).toBe(3);
      });
    });

    describe('POST /api/routing/rules/:ruleId/activate', () => {
      it('should activate assignment rule', async () => {
        const response = await request(app)
          .post(`/api/routing/rules/${testAssignmentRule.id}/activate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.data.isActive).toBe(true);
      });
    });

    describe('POST /api/routing/rules/:ruleId/deactivate', () => {
      it('should deactivate assignment rule', async () => {
        const response = await request(app)
          .post(`/api/routing/rules/${testAssignmentRule.id}/deactivate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.data.isActive).toBe(false);
      });
    });
  });

  describe('GET /api/routing/statistics', () => {
    it('should return assignment statistics', async () => {
      const response = await request(app)
        .get('/api/routing/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalAssignments');
      expect(response.body.data).toHaveProperty('assignmentsByRule');
      expect(response.body.data).toHaveProperty('assignmentsByUser');
    });
  });

  describe('GET /api/routing/rules/statistics', () => {
    it('should return assignment rule statistics', async () => {
      const response = await request(app)
        .get('/api/routing/rules/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalRules');
      expect(response.body.data).toHaveProperty('activeRules');
      expect(response.body.data).toHaveProperty('inactiveRules');
    });
  });
});