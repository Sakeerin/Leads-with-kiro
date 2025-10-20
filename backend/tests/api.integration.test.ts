import request from 'supertest';
import app from '../src/index';
import { AuthService } from '../src/services/authService';
import { LeadService } from '../src/services/leadService';
import { ScoringService } from '../src/services/scoringService';
import { RoutingService } from '../src/services/routingService';
import { LeadChannel, LeadStatus } from '../src/types';

// Mock services
jest.mock('../src/services/authService');
jest.mock('../src/services/leadService');
jest.mock('../src/services/scoringService');
jest.mock('../src/services/routingService');

const MockedAuthService = AuthService as jest.Mocked<typeof AuthService>;
const MockedLeadService = LeadService as jest.Mocked<typeof LeadService>;
const MockedScoringService = ScoringService as jest.Mocked<typeof ScoringService>;
const MockedRoutingService = RoutingService as jest.Mocked<typeof RoutingService>;

describe('API Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'sales',
    permissions: ['leads:read', 'leads:write', 'leads:delete']
  };

  const mockLead = {
    id: 'lead-123',
    accountLeadId: 'AL-24-01-001',
    company: {
      name: 'Test Company',
      industry: 'Technology'
    },
    contact: {
      name: 'Jane Smith',
      email: 'jane@testcompany.com',
      phone: '+1234567890'
    },
    source: {
      channel: LeadChannel.WEB_FORM,
      campaign: 'Test Campaign'
    },
    assignment: {
      assignedTo: 'user-123',
      assignedAt: new Date(),
      assignmentReason: 'Territory match'
    },
    status: LeadStatus.NEW,
    score: {
      value: 75,
      band: 'warm',
      lastCalculated: new Date()
    },
    qualification: {},
    followUp: {},
    product: {},
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-123',
      isActive: true
    },
    customFields: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MockedAuthService.verifyToken.mockResolvedValue(mockUser as any);
  });

  describe('Lead Management API', () => {
    describe('POST /api/v1/leads', () => {
      const validLeadData = {
        company: {
          name: 'New Company',
          industry: 'Technology'
        },
        contact: {
          name: 'John Doe',
          email: 'john@newcompany.com',
          phone: '+1987654321'
        },
        source: {
          channel: LeadChannel.EMAIL,
          campaign: 'Email Campaign'
        }
      };

      it('should create a new lead successfully', async () => {
        MockedLeadService.createLead.mockResolvedValue(mockLead as any);

        const response = await request(app)
          .post('/api/v1/leads')
          .set('Authorization', 'Bearer valid-token')
          .send(validLeadData)
          .expect(201);

        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.company.name).toBe('Test Company');
        expect(MockedLeadService.createLead).toHaveBeenCalledWith(
          expect.objectContaining({
            company: validLeadData.company,
            contact: validLeadData.contact,
            source: validLeadData.source,
            createdBy: mockUser.id
          })
        );
      });

      it('should return 400 for invalid lead data', async () => {
        const invalidData = {
          company: { name: '' }, // Missing required field
          contact: { name: 'John Doe' } // Missing email
        };

        const response = await request(app)
          .post('/api/v1/leads')
          .set('Authorization', 'Bearer valid-token')
          .send(invalidData)
          .expect(400);

        expect(response.body.error).toHaveProperty('message');
        expect(response.body.error.message).toContain('validation');
      });

      it('should return 401 without authentication', async () => {
        await request(app)
          .post('/api/v1/leads')
          .send(validLeadData)
          .expect(401);
      });
    });

    describe('GET /api/v1/leads/:id', () => {
      it('should retrieve a lead by ID', async () => {
        MockedLeadService.getLeadById.mockResolvedValue(mockLead as any);

        const response = await request(app)
          .get('/api/v1/leads/lead-123')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body.data.id).toBe('lead-123');
        expect(response.body.data.accountLeadId).toBe('AL-24-01-001');
        expect(MockedLeadService.getLeadById).toHaveBeenCalledWith('lead-123');
      });

      it('should return 404 for non-existent lead', async () => {
        MockedLeadService.getLeadById.mockRejectedValue(new Error('Lead not found'));

        const response = await request(app)
          .get('/api/v1/leads/nonexistent')
          .set('Authorization', 'Bearer valid-token')
          .expect(404);

        expect(response.body.error).toHaveProperty('message');
      });
    });

    describe('PUT /api/v1/leads/:id', () => {
      const updateData = {
        status: LeadStatus.CONTACTED,
        qualification: {
          interest: 'high',
          budget: 'qualified'
        }
      };

      it('should update a lead successfully', async () => {
        const updatedLead = { ...mockLead, status: LeadStatus.CONTACTED };
        MockedLeadService.updateLead.mockResolvedValue(updatedLead as any);

        const response = await request(app)
          .put('/api/v1/leads/lead-123')
          .set('Authorization', 'Bearer valid-token')
          .send(updateData)
          .expect(200);

        expect(response.body.data.status).toBe(LeadStatus.CONTACTED);
        expect(MockedLeadService.updateLead).toHaveBeenCalledWith(
          'lead-123',
          updateData,
          mockUser.id
        );
      });

      it('should return 400 for invalid update data', async () => {
        const invalidUpdate = {
          contact: { email: 'invalid-email' }
        };

        MockedLeadService.updateLead.mockRejectedValue(new Error('Validation error'));

        const response = await request(app)
          .put('/api/v1/leads/lead-123')
          .set('Authorization', 'Bearer valid-token')
          .send(invalidUpdate)
          .expect(400);

        expect(response.body.error).toHaveProperty('message');
      });
    });

    describe('DELETE /api/v1/leads/:id', () => {
      it('should soft delete a lead', async () => {
        MockedLeadService.deleteLead.mockResolvedValue(undefined);

        const response = await request(app)
          .delete('/api/v1/leads/lead-123')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body.message).toContain('deleted');
        expect(MockedLeadService.deleteLead).toHaveBeenCalledWith('lead-123', mockUser.id);
      });

      it('should require appropriate permissions', async () => {
        const limitedUser = { ...mockUser, permissions: ['leads:read'] };
        MockedAuthService.verifyToken.mockResolvedValue(limitedUser as any);

        await request(app)
          .delete('/api/v1/leads/lead-123')
          .set('Authorization', 'Bearer valid-token')
          .expect(403);
      });
    });

    describe('GET /api/v1/leads/search', () => {
      it('should search leads with filters', async () => {
        const searchResults = {
          leads: [mockLead],
          pagination: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1
          }
        };

        MockedLeadService.searchLeads.mockResolvedValue(searchResults as any);

        const response = await request(app)
          .get('/api/v1/leads/search')
          .query({
            q: 'Test Company',
            status: LeadStatus.NEW,
            page: 1,
            limit: 10
          })
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body.data.leads).toHaveLength(1);
        expect(response.body.data.pagination.total).toBe(1);
        expect(MockedLeadService.searchLeads).toHaveBeenCalledWith(
          expect.objectContaining({
            searchTerm: 'Test Company',
            filters: expect.objectContaining({
              status: LeadStatus.NEW
            }),
            page: 1,
            limit: 10
          })
        );
      });

      it('should handle empty search results', async () => {
        const emptyResults = {
          leads: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0
          }
        };

        MockedLeadService.searchLeads.mockResolvedValue(emptyResults as any);

        const response = await request(app)
          .get('/api/v1/leads/search')
          .query({ q: 'nonexistent' })
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body.data.leads).toHaveLength(0);
        expect(response.body.data.pagination.total).toBe(0);
      });
    });
  });

  describe('Lead Scoring API', () => {
    describe('POST /api/v1/leads/:id/score', () => {
      it('should calculate lead score', async () => {
        const scoreResult = {
          leadId: 'lead-123',
          score: 85,
          band: 'hot',
          factors: [
            { factor: 'industry', score: 20, weight: 0.3 },
            { factor: 'company_size', score: 15, weight: 0.2 }
          ]
        };

        MockedScoringService.calculateScore.mockResolvedValue(scoreResult as any);

        const response = await request(app)
          .post('/api/v1/leads/lead-123/score')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body.data.score).toBe(85);
        expect(response.body.data.band).toBe('hot');
        expect(MockedScoringService.calculateScore).toHaveBeenCalledWith('lead-123');
      });
    });

    describe('GET /api/v1/scoring/models', () => {
      it('should retrieve scoring models', async () => {
        const models = [
          {
            id: 'model-1',
            name: 'Default Scoring Model',
            criteria: [
              { factor: 'industry', weight: 0.3 },
              { factor: 'company_size', weight: 0.2 }
            ],
            isActive: true
          }
        ];

        MockedScoringService.getScoringModels.mockResolvedValue(models as any);

        const response = await request(app)
          .get('/api/v1/scoring/models')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Default Scoring Model');
      });
    });
  });

  describe('Lead Assignment API', () => {
    describe('POST /api/v1/leads/:id/assign', () => {
      it('should assign lead to user', async () => {
        const assignmentData = {
          assignedTo: 'user-456',
          reason: 'Territory match'
        };

        const assignmentResult = {
          leadId: 'lead-123',
          assignedTo: 'user-456',
          assignedBy: 'user-123',
          assignedAt: new Date(),
          reason: 'Territory match'
        };

        MockedRoutingService.assignLead.mockResolvedValue(assignmentResult as any);

        const response = await request(app)
          .post('/api/v1/leads/lead-123/assign')
          .set('Authorization', 'Bearer valid-token')
          .send(assignmentData)
          .expect(200);

        expect(response.body.data.assignedTo).toBe('user-456');
        expect(response.body.data.reason).toBe('Territory match');
        expect(MockedRoutingService.assignLead).toHaveBeenCalledWith(
          'lead-123',
          'user-456',
          'user-123',
          'Territory match'
        );
      });
    });

    describe('GET /api/v1/routing/rules', () => {
      it('should retrieve assignment rules', async () => {
        const rules = [
          {
            id: 'rule-1',
            name: 'Territory Based Assignment',
            priority: 1,
            conditions: [
              { field: 'company.industry', operator: 'equals', value: 'Technology' }
            ],
            actions: [
              { type: 'assign_to_user', userId: 'user-456' }
            ],
            isActive: true
          }
        ];

        MockedRoutingService.getAssignmentRules.mockResolvedValue(rules as any);

        const response = await request(app)
          .get('/api/v1/routing/rules')
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Territory Based Assignment');
      });
    });
  });

  describe('Bulk Operations API', () => {
    describe('POST /api/v1/leads/bulk/assign', () => {
      it('should assign multiple leads', async () => {
        const bulkAssignData = {
          leadIds: ['lead-123', 'lead-456'],
          assignedTo: 'user-789',
          reason: 'Workload balancing'
        };

        MockedRoutingService.bulkAssignLeads.mockResolvedValue({
          successful: ['lead-123', 'lead-456'],
          failed: []
        } as any);

        const response = await request(app)
          .post('/api/v1/leads/bulk/assign')
          .set('Authorization', 'Bearer valid-token')
          .send(bulkAssignData)
          .expect(200);

        expect(response.body.data.successful).toHaveLength(2);
        expect(response.body.data.failed).toHaveLength(0);
      });
    });

    describe('POST /api/v1/leads/bulk/update-status', () => {
      it('should update status for multiple leads', async () => {
        const bulkUpdateData = {
          leadIds: ['lead-123', 'lead-456'],
          status: LeadStatus.CONTACTED
        };

        MockedLeadService.bulkUpdateStatus.mockResolvedValue({
          successful: ['lead-123', 'lead-456'],
          failed: []
        } as any);

        const response = await request(app)
          .post('/api/v1/leads/bulk/update-status')
          .set('Authorization', 'Bearer valid-token')
          .send(bulkUpdateData)
          .expect(200);

        expect(response.body.data.successful).toHaveLength(2);
        expect(MockedLeadService.bulkUpdateStatus).toHaveBeenCalledWith(
          ['lead-123', 'lead-456'],
          LeadStatus.CONTACTED,
          mockUser.id
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      MockedLeadService.getLeadById.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/leads/lead-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('Internal server error');
    });

    it('should return proper error format', async () => {
      MockedLeadService.createLead.mockRejectedValue(new Error('Validation failed'));

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
      expect(response.body.error).toHaveProperty('requestId');
    });
  });

  describe('Response Format', () => {
    it('should return consistent success response format', async () => {
      MockedLeadService.getLeadById.mockResolvedValue(mockLead as any);

      const response = await request(app)
        .get('/api/v1/leads/lead-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should include pagination metadata for list endpoints', async () => {
      const searchResults = {
        leads: [mockLead],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      };

      MockedLeadService.searchLeads.mockResolvedValue(searchResults as any);

      const response = await request(app)
        .get('/api/v1/leads/search')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.data).toHaveProperty('leads');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('page');
      expect(response.body.data.pagination).toHaveProperty('limit');
      expect(response.body.data.pagination).toHaveProperty('totalPages');
    });
  });
});