import { leadService } from '../../services/leadService';
import { api } from '../../services/api';
import { LeadChannel, LeadStatus } from '../../types';

// Mock the API service
jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('LeadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLead', () => {
    const validLeadData = {
      company: {
        name: 'Test Company',
        industry: 'Technology'
      },
      contact: {
        name: 'John Doe',
        email: 'john@test.com',
        phone: '+1234567890'
      },
      source: {
        channel: LeadChannel.WEB_FORM,
        campaign: 'Test Campaign'
      }
    };

    const mockResponse = {
      data: {
        success: true,
        data: {
          id: 'lead-123',
          accountLeadId: 'AL-24-01-001',
          ...validLeadData,
          status: LeadStatus.NEW,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true
          }
        }
      }
    };

    it('should create a lead successfully', async () => {
      mockedApi.post.mockResolvedValue(mockResponse);

      const result = await leadService.createLead(validLeadData);

      expect(mockedApi.post).toHaveBeenCalledWith('/leads', validLeadData);
      expect(result.id).toBe('lead-123');
      expect(result.accountLeadId).toBe('AL-24-01-001');
      expect(result.company.name).toBe('Test Company');
    });

    it('should handle API errors gracefully', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: {
            error: {
              message: 'Validation failed',
              details: {
                email: 'Invalid email format'
              }
            }
          }
        }
      };

      mockedApi.post.mockRejectedValue(errorResponse);

      await expect(leadService.createLead(validLeadData)).rejects.toThrow('Validation failed');
    });

    it('should handle network errors', async () => {
      mockedApi.post.mockRejectedValue(new Error('Network Error'));

      await expect(leadService.createLead(validLeadData)).rejects.toThrow('Network Error');
    });
  });

  describe('getLeadById', () => {
    const mockLead = {
      id: 'lead-123',
      accountLeadId: 'AL-24-01-001',
      company: { name: 'Test Company' },
      contact: { name: 'John Doe', email: 'john@test.com' },
      status: LeadStatus.NEW
    };

    it('should retrieve a lead by ID', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          success: true,
          data: mockLead
        }
      });

      const result = await leadService.getLeadById('lead-123');

      expect(mockedApi.get).toHaveBeenCalledWith('/leads/lead-123');
      expect(result.id).toBe('lead-123');
      expect(result.company.name).toBe('Test Company');
    });

    it('should handle 404 errors for non-existent leads', async () => {
      mockedApi.get.mockRejectedValue({
        response: {
          status: 404,
          data: {
            error: {
              message: 'Lead not found'
            }
          }
        }
      });

      await expect(leadService.getLeadById('nonexistent')).rejects.toThrow('Lead not found');
    });
  });

  describe('updateLead', () => {
    const updateData = {
      status: LeadStatus.CONTACTED,
      qualification: {
        interest: 'high',
        budget: 'qualified'
      }
    };

    const mockUpdatedLead = {
      id: 'lead-123',
      status: LeadStatus.CONTACTED,
      qualification: updateData.qualification
    };

    it('should update a lead successfully', async () => {
      mockedApi.put.mockResolvedValue({
        data: {
          success: true,
          data: mockUpdatedLead
        }
      });

      const result = await leadService.updateLead('lead-123', updateData);

      expect(mockedApi.put).toHaveBeenCalledWith('/leads/lead-123', updateData);
      expect(result.status).toBe(LeadStatus.CONTACTED);
      expect(result.qualification).toEqual(updateData.qualification);
    });

    it('should handle validation errors during update', async () => {
      mockedApi.put.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: {
              message: 'Invalid status transition'
            }
          }
        }
      });

      await expect(leadService.updateLead('lead-123', updateData)).rejects.toThrow('Invalid status transition');
    });
  });

  describe('deleteLead', () => {
    it('should soft delete a lead', async () => {
      mockedApi.delete.mockResolvedValue({
        data: {
          success: true,
          message: 'Lead deleted successfully'
        }
      });

      await leadService.deleteLead('lead-123');

      expect(mockedApi.delete).toHaveBeenCalledWith('/leads/lead-123');
    });

    it('should handle deletion errors', async () => {
      mockedApi.delete.mockRejectedValue({
        response: {
          status: 403,
          data: {
            error: {
              message: 'Insufficient permissions'
            }
          }
        }
      });

      await expect(leadService.deleteLead('lead-123')).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('searchLeads', () => {
    const mockSearchResults = {
      leads: [
        {
          id: 'lead-1',
          accountLeadId: 'AL-24-01-001',
          company: { name: 'Company A' },
          contact: { name: 'John Doe' },
          status: LeadStatus.NEW
        },
        {
          id: 'lead-2',
          accountLeadId: 'AL-24-01-002',
          company: { name: 'Company B' },
          contact: { name: 'Jane Smith' },
          status: LeadStatus.CONTACTED
        }
      ],
      pagination: {
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      }
    };

    it('should search leads with text query', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          success: true,
          data: mockSearchResults
        }
      });

      const result = await leadService.searchLeads({
        searchTerm: 'Company A',
        page: 1,
        limit: 10
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/leads/search', {
        params: {
          q: 'Company A',
          page: 1,
          limit: 10
        }
      });
      expect(result.leads).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should search leads with filters', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          success: true,
          data: mockSearchResults
        }
      });

      const searchCriteria = {
        searchTerm: 'technology',
        filters: {
          status: [LeadStatus.NEW, LeadStatus.CONTACTED],
          industry: 'Technology',
          scoreMin: 50,
          scoreMax: 100
        },
        page: 1,
        limit: 20
      };

      const result = await leadService.searchLeads(searchCriteria);

      expect(mockedApi.get).toHaveBeenCalledWith('/leads/search', {
        params: {
          q: 'technology',
          status: 'new,contacted',
          industry: 'Technology',
          scoreMin: 50,
          scoreMax: 100,
          page: 1,
          limit: 20
        }
      });
      expect(result.leads).toHaveLength(2);
    });

    it('should handle empty search results', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            leads: [],
            pagination: {
              total: 0,
              page: 1,
              limit: 10,
              totalPages: 0
            }
          }
        }
      });

      const result = await leadService.searchLeads({
        searchTerm: 'nonexistent',
        page: 1,
        limit: 10
      });

      expect(result.leads).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('checkDuplicates', () => {
    const mockDuplicates = [
      {
        id: 'existing-lead',
        matchType: 'email',
        confidence: 1.0,
        lead: {
          id: 'existing-lead',
          company: { name: 'Existing Company' },
          contact: { name: 'Jane Doe', email: 'john@test.com' }
        }
      }
    ];

    it('should check for email duplicates', async () => {
      mockedApi.post.mockResolvedValue({
        data: {
          success: true,
          data: mockDuplicates
        }
      });

      const result = await leadService.checkDuplicates({
        email: 'john@test.com'
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/leads/duplicates', {
        email: 'john@test.com'
      });
      expect(result).toHaveLength(1);
      expect(result[0].matchType).toBe('email');
      expect(result[0].confidence).toBe(1.0);
    });

    it('should check for phone duplicates', async () => {
      mockedApi.post.mockResolvedValue({
        data: {
          success: true,
          data: mockDuplicates
        }
      });

      const result = await leadService.checkDuplicates({
        phone: '+1234567890'
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/leads/duplicates', {
        phone: '+1234567890'
      });
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no duplicates found', async () => {
      mockedApi.post.mockResolvedValue({
        data: {
          success: true,
          data: []
        }
      });

      const result = await leadService.checkDuplicates({
        email: 'unique@test.com'
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update status for multiple leads', async () => {
      const bulkResult = {
        successful: ['lead-1', 'lead-2'],
        failed: []
      };

      mockedApi.post.mockResolvedValue({
        data: {
          success: true,
          data: bulkResult
        }
      });

      const result = await leadService.bulkUpdateStatus(
        ['lead-1', 'lead-2'],
        LeadStatus.CONTACTED
      );

      expect(mockedApi.post).toHaveBeenCalledWith('/leads/bulk/update-status', {
        leadIds: ['lead-1', 'lead-2'],
        status: LeadStatus.CONTACTED
      });
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle partial failures in bulk operations', async () => {
      const bulkResult = {
        successful: ['lead-1'],
        failed: [
          {
            leadId: 'lead-2',
            error: 'Invalid status transition'
          }
        ]
      };

      mockedApi.post.mockResolvedValue({
        data: {
          success: true,
          data: bulkResult
        }
      });

      const result = await leadService.bulkUpdateStatus(
        ['lead-1', 'lead-2'],
        LeadStatus.CONTACTED
      );

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Invalid status transition');
    });
  });

  describe('bulkAssignLeads', () => {
    it('should assign multiple leads to a user', async () => {
      const bulkResult = {
        successful: ['lead-1', 'lead-2'],
        failed: []
      };

      mockedApi.post.mockResolvedValue({
        data: {
          success: true,
          data: bulkResult
        }
      });

      const result = await leadService.bulkAssignLeads(
        ['lead-1', 'lead-2'],
        'user-456',
        'Workload balancing'
      );

      expect(mockedApi.post).toHaveBeenCalledWith('/leads/bulk/assign', {
        leadIds: ['lead-1', 'lead-2'],
        assignedTo: 'user-456',
        reason: 'Workload balancing'
      });
      expect(result.successful).toHaveLength(2);
    });
  });

  describe('getLeadActivities', () => {
    const mockActivities = [
      {
        id: 'activity-1',
        type: 'lead_created',
        subject: 'Lead created',
        performedBy: 'user-123',
        performedAt: new Date(),
        details: {}
      },
      {
        id: 'activity-2',
        type: 'status_changed',
        subject: 'Status changed from New to Contacted',
        performedBy: 'user-456',
        performedAt: new Date(),
        details: {
          oldStatus: 'new',
          newStatus: 'contacted'
        }
      }
    ];

    it('should retrieve lead activities', async () => {
      mockedApi.get.mockResolvedValue({
        data: {
          success: true,
          data: mockActivities
        }
      });

      const result = await leadService.getLeadActivities('lead-123');

      expect(mockedApi.get).toHaveBeenCalledWith('/leads/lead-123/activities');
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('lead_created');
      expect(result[1].type).toBe('status_changed');
    });
  });

  describe('assignLead', () => {
    it('should assign a lead to a user', async () => {
      const assignmentResult = {
        leadId: 'lead-123',
        assignedTo: 'user-456',
        assignedBy: 'user-123',
        assignedAt: new Date(),
        reason: 'Territory match'
      };

      mockedApi.post.mockResolvedValue({
        data: {
          success: true,
          data: assignmentResult
        }
      });

      const result = await leadService.assignLead('lead-123', 'user-456', 'Territory match');

      expect(mockedApi.post).toHaveBeenCalledWith('/leads/lead-123/assign', {
        assignedTo: 'user-456',
        reason: 'Territory match'
      });
      expect(result.assignedTo).toBe('user-456');
      expect(result.reason).toBe('Territory match');
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized errors', async () => {
      mockedApi.get.mockRejectedValue({
        response: {
          status: 401,
          data: {
            error: {
              message: 'Unauthorized'
            }
          }
        }
      });

      await expect(leadService.getLeadById('lead-123')).rejects.toThrow('Unauthorized');
    });

    it('should handle 403 forbidden errors', async () => {
      mockedApi.delete.mockRejectedValue({
        response: {
          status: 403,
          data: {
            error: {
              message: 'Insufficient permissions'
            }
          }
        }
      });

      await expect(leadService.deleteLead('lead-123')).rejects.toThrow('Insufficient permissions');
    });

    it('should handle 500 server errors', async () => {
      mockedApi.post.mockRejectedValue({
        response: {
          status: 500,
          data: {
            error: {
              message: 'Internal server error'
            }
          }
        }
      });

      await expect(leadService.createLead({} as any)).rejects.toThrow('Internal server error');
    });

    it('should handle network errors without response', async () => {
      mockedApi.get.mockRejectedValue(new Error('Network Error'));

      await expect(leadService.getLeadById('lead-123')).rejects.toThrow('Network Error');
    });
  });

  describe('Request Cancellation', () => {
    it('should support request cancellation', async () => {
      const abortController = new AbortController();
      
      mockedApi.get.mockImplementation(() => 
        new Promise((_, reject) => {
          abortController.signal.addEventListener('abort', () => {
            reject(new Error('Request cancelled'));
          });
        })
      );

      const searchPromise = leadService.searchLeads({
        searchTerm: 'test',
        page: 1,
        limit: 10
      });

      abortController.abort();

      await expect(searchPromise).rejects.toThrow('Request cancelled');
    });
  });
});