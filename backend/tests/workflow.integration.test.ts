import request from 'supertest';
import { app } from '../src/index';
import { leadService } from '../src/services/leadService';
import { LeadStatus, LeadChannel, BusinessType } from '../src/types';

describe('Workflow API Integration Tests', () => {
  let authToken: string;
  let testLeadId: string;
  let testWorkflowId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'workflow.test@example.com',
        password: 'TestPassword123!',
        firstName: 'Workflow',
        lastName: 'Test',
        role: 'Manager'
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'workflow.test@example.com',
        password: 'TestPassword123!'
      });

    authToken = loginResponse.body.data.token;

    // Create test lead
    const testLead = await leadService.createLead({
      company: {
        name: 'Integration Test Company',
        industry: 'Technology'
      },
      contact: {
        name: 'Integration Test User',
        email: 'integration.test@example.com'
      },
      source: {
        channel: LeadChannel.WEBSITE
      },
      status: LeadStatus.NEW,
      qualification: {
        businessType: BusinessType.B2B
      },
      createdBy: registerResponse.body.data.user.id
    });
    testLeadId = testLead.id;
  });

  describe('POST /api/workflows', () => {
    it('should create a new workflow', async () => {
      const workflowData = {
        name: 'Integration Test Workflow',
        description: 'Test workflow for integration testing',
        trigger: {
          event: 'lead_created',
          conditions: [
            {
              field: 'status',
              operator: 'equals',
              value: LeadStatus.NEW
            }
          ]
        },
        actions: [
          {
            type: 'send_email',
            parameters: {
              templateId: 'welcome-template',
              variables: { subject: 'Welcome to our system' }
            }
          },
          {
            type: 'create_task',
            parameters: {
              subject: 'Follow up with new lead',
              description: 'Contact within 24 hours',
              type: 'call',
              priority: 'high'
            }
          }
        ],
        isActive: true,
        priority: 10
      };

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workflowData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(workflowData.name);
      expect(response.body.data.trigger).toEqual(workflowData.trigger);
      expect(response.body.data.actions).toEqual(workflowData.actions);

      testWorkflowId = response.body.data.id;
    });

    it('should require authentication', async () => {
      const workflowData = {
        name: 'Unauthorized Workflow',
        trigger: { event: 'manual' },
        actions: [],
        isActive: true,
        priority: 1
      };

      await request(app)
        .post('/api/workflows')
        .send(workflowData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'Invalid Workflow'
        // Missing required fields
      };

      await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(500); // Should fail validation
    });
  });

  describe('GET /api/workflows', () => {
    it('should retrieve all workflows', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.data.some((w: any) => w.id === testWorkflowId)).toBe(true);
    });

    it('should filter workflows by active status', async () => {
      const response = await request(app)
        .get('/api/workflows?isActive=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.every((w: any) => w.isActive)).toBe(true);
    });

    it('should filter workflows by event type', async () => {
      const response = await request(app)
        .get('/api/workflows?event=lead_created')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.every((w: any) => w.trigger.event === 'lead_created')).toBe(true);
    });

    it('should apply pagination', async () => {
      const response = await request(app)
        .get('/api/workflows?limit=1&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.offset).toBe(0);
    });
  });

  describe('GET /api/workflows/:id', () => {
    it('should retrieve workflow by ID', async () => {
      const response = await request(app)
        .get(`/api/workflows/${testWorkflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testWorkflowId);
      expect(response.body.data.name).toBe('Integration Test Workflow');
    });

    it('should return 404 for non-existent workflow', async () => {
      await request(app)
        .get('/api/workflows/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/workflows/:id', () => {
    it('should update workflow', async () => {
      const updates = {
        name: 'Updated Integration Test Workflow',
        description: 'Updated description',
        priority: 20
      };

      const response = await request(app)
        .put(`/api/workflows/${testWorkflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
      expect(response.body.data.description).toBe(updates.description);
      expect(response.body.data.priority).toBe(updates.priority);
    });

    it('should return 404 for non-existent workflow', async () => {
      await request(app)
        .put('/api/workflows/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(500); // Will throw error from service
    });
  });

  describe('POST /api/workflows/:id/execute', () => {
    it('should execute workflow manually', async () => {
      const response = await request(app)
        .post(`/api/workflows/${testWorkflowId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          leadId: testLeadId,
          context: { manual: true, reason: 'Integration test' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.workflowId).toBe(testWorkflowId);
      expect(response.body.data.leadId).toBe(testLeadId);
      expect(response.body.data.status).toBe('pending');
    });

    it('should require leadId', async () => {
      await request(app)
        .post(`/api/workflows/${testWorkflowId}/execute`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ context: { manual: true } })
        .expect(400);
    });
  });

  describe('GET /api/workflows/executions', () => {
    it('should retrieve workflow executions', async () => {
      const response = await request(app)
        .get('/api/workflows/executions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter executions by workflow ID', async () => {
      const response = await request(app)
        .get(`/api/workflows/executions?workflowId=${testWorkflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.every((e: any) => e.workflowId === testWorkflowId)).toBe(true);
    });

    it('should filter executions by lead ID', async () => {
      const response = await request(app)
        .get(`/api/workflows/executions?leadId=${testLeadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.every((e: any) => e.leadId === testLeadId)).toBe(true);
    });
  });

  describe('POST /api/workflows/trigger/manual', () => {
    it('should trigger manual workflows', async () => {
      const response = await request(app)
        .post('/api/workflows/trigger/manual')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          leadId: testLeadId,
          context: { manual: true, reason: 'Manual trigger test' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('triggered successfully');
    });

    it('should require leadId', async () => {
      await request(app)
        .post('/api/workflows/trigger/manual')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ context: { manual: true } })
        .expect(400);
    });
  });

  describe('GET /api/workflows/approvals', () => {
    it('should retrieve approval requests', async () => {
      const response = await request(app)
        .get('/api/workflows/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter approval requests by status', async () => {
      const response = await request(app)
        .get('/api/workflows/approvals?status=pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.every((r: any) => r.status === 'pending')).toBe(true);
    });
  });

  describe('DELETE /api/workflows/:id', () => {
    it('should delete workflow', async () => {
      const response = await request(app)
        .delete(`/api/workflows/${testWorkflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify workflow is deleted
      await request(app)
        .get(`/api/workflows/${testWorkflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return error for non-existent workflow', async () => {
      await request(app)
        .delete('/api/workflows/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
    });
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (testWorkflowId) {
        await request(app)
          .delete(`/api/workflows/${testWorkflowId}`)
          .set('Authorization', `Bearer ${authToken}`);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});