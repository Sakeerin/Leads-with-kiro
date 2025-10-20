import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLeads } from '../../hooks/useLeads';
import * as leadService from '../../services/leadService';
import { LeadStatus, LeadChannel } from '../../types';

// Mock the lead service
jest.mock('../../services/leadService');
const mockedLeadService = leadService as jest.Mocked<typeof leadService>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useLeads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useLeadsQuery', () => {
    const mockLeadsData = {
      leads: [
        {
          id: 'lead-1',
          accountLeadId: 'AL-24-01-001',
          company: { name: 'Company A' },
          contact: { name: 'John Doe', email: 'john@companya.com' },
          status: LeadStatus.NEW,
          score: { value: 75, band: 'warm' }
        },
        {
          id: 'lead-2',
          accountLeadId: 'AL-24-01-002',
          company: { name: 'Company B' },
          contact: { name: 'Jane Smith', email: 'jane@companyb.com' },
          status: LeadStatus.CONTACTED,
          score: { value: 85, band: 'hot' }
        }
      ],
      pagination: {
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      }
    };

    it('should fetch leads successfully', async () => {
      mockedLeadService.searchLeads.mockResolvedValue(mockLeadsData);

      const { result } = renderHook(
        () => useLeads.useLeadsQuery({ page: 1, limit: 10 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.leads).toHaveLength(2);
      expect(result.current.data?.pagination.total).toBe(2);
      expect(mockedLeadService.searchLeads).toHaveBeenCalledWith({
        page: 1,
        limit: 10
      });
    });

    it('should handle search with filters', async () => {
      mockedLeadService.searchLeads.mockResolvedValue(mockLeadsData);

      const searchCriteria = {
        searchTerm: 'Company A',
        filters: {
          status: [LeadStatus.NEW],
          industry: 'Technology'
        },
        page: 1,
        limit: 10
      };

      const { result } = renderHook(
        () => useLeads.useLeadsQuery(searchCriteria),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedLeadService.searchLeads).toHaveBeenCalledWith(searchCriteria);
    });

    it('should handle loading state', () => {
      mockedLeadService.searchLeads.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(
        () => useLeads.useLeadsQuery({ page: 1, limit: 10 }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle error state', async () => {
      const errorMessage = 'Failed to fetch leads';
      mockedLeadService.searchLeads.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(
        () => useLeads.useLeadsQuery({ page: 1, limit: 10 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error(errorMessage));
    });
  });

  describe('useLeadQuery', () => {
    const mockLead = {
      id: 'lead-123',
      accountLeadId: 'AL-24-01-001',
      company: { name: 'Test Company', industry: 'Technology' },
      contact: { name: 'John Doe', email: 'john@test.com' },
      status: LeadStatus.NEW,
      score: { value: 75, band: 'warm' }
    };

    it('should fetch single lead successfully', async () => {
      mockedLeadService.getLeadById.mockResolvedValue(mockLead);

      const { result } = renderHook(
        () => useLeads.useLeadQuery('lead-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLead);
      expect(mockedLeadService.getLeadById).toHaveBeenCalledWith('lead-123');
    });

    it('should not fetch when leadId is undefined', () => {
      const { result } = renderHook(
        () => useLeads.useLeadQuery(undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.isIdle).toBe(true);
      expect(mockedLeadService.getLeadById).not.toHaveBeenCalled();
    });
  });

  describe('useCreateLeadMutation', () => {
    const leadData = {
      company: { name: 'New Company', industry: 'Technology' },
      contact: { name: 'John Doe', email: 'john@newcompany.com' },
      source: { channel: LeadChannel.WEB_FORM, campaign: 'Test Campaign' }
    };

    const mockCreatedLead = {
      id: 'lead-123',
      accountLeadId: 'AL-24-01-001',
      ...leadData,
      status: LeadStatus.NEW
    };

    it('should create lead successfully', async () => {
      mockedLeadService.createLead.mockResolvedValue(mockCreatedLead);

      const { result } = renderHook(
        () => useLeads.useCreateLeadMutation(),
        { wrapper: createWrapper() }
      );

      result.current.mutate(leadData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCreatedLead);
      expect(mockedLeadService.createLead).toHaveBeenCalledWith(leadData);
    });

    it('should handle creation error', async () => {
      const errorMessage = 'Validation failed';
      mockedLeadService.createLead.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(
        () => useLeads.useCreateLeadMutation(),
        { wrapper: createWrapper() }
      );

      result.current.mutate(leadData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error(errorMessage));
    });

    it('should show loading state during creation', () => {
      mockedLeadService.createLead.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(
        () => useLeads.useCreateLeadMutation(),
        { wrapper: createWrapper() }
      );

      result.current.mutate(leadData);

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('useUpdateLeadMutation', () => {
    const updateData = {
      status: LeadStatus.CONTACTED,
      qualification: { interest: 'high', budget: 'qualified' }
    };

    const mockUpdatedLead = {
      id: 'lead-123',
      status: LeadStatus.CONTACTED,
      qualification: updateData.qualification
    };

    it('should update lead successfully', async () => {
      mockedLeadService.updateLead.mockResolvedValue(mockUpdatedLead);

      const { result } = renderHook(
        () => useLeads.useUpdateLeadMutation(),
        { wrapper: createWrapper() }
      );

      result.current.mutate({ leadId: 'lead-123', data: updateData });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUpdatedLead);
      expect(mockedLeadService.updateLead).toHaveBeenCalledWith('lead-123', updateData);
    });

    it('should handle update error', async () => {
      const errorMessage = 'Invalid status transition';
      mockedLeadService.updateLead.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(
        () => useLeads.useUpdateLeadMutation(),
        { wrapper: createWrapper() }
      );

      result.current.mutate({ leadId: 'lead-123', data: updateData });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error(errorMessage));
    });
  });

  describe('useDeleteLeadMutation', () => {
    it('should delete lead successfully', async () => {
      mockedLeadService.deleteLead.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useLeads.useDeleteLeadMutation(),
        { wrapper: createWrapper() }
      );

      result.current.mutate('lead-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedLeadService.deleteLead).toHaveBeenCalledWith('lead-123');
    });

    it('should handle deletion error', async () => {
      const errorMessage = 'Insufficient permissions';
      mockedLeadService.deleteLead.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(
        () => useLeads.useDeleteLeadMutation(),
        { wrapper: createWrapper() }
      );

      result.current.mutate('lead-123');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(new Error(errorMessage));
    });
  });

  describe('useBulkUpdateStatusMutation', () => {
    const bulkData = {
      leadIds: ['lead-1', 'lead-2'],
      status: LeadStatus.CONTACTED
    };

    const mockBulkResult = {
      successful: ['lead-1', 'lead-2'],
      failed: []
    };

    it('should perform bulk status update successfully', async () => {
      mockedLeadService.bulkUpdateStatus.mockResolvedValue(mockBulkResult);

      const { result } = renderHook(
        () => useLeads.useBulkUpdateStatusMutation(),
        { wrapper: createWrapper() }
      );

      result.current.mutate(bulkData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBulkResult);
      expect(mockedLeadService.bulkUpdateStatus).toHaveBeenCalledWith(
        bulkData.leadIds,
        bulkData.status
      );
    });

    it('should handle partial failures in bulk update', async () => {
      const partialResult = {
        successful: ['lead-1'],
        failed: [{ leadId: 'lead-2', error: 'Invalid status' }]
      };

      mockedLeadService.bulkUpdateStatus.mockResolvedValue(partialResult);

      const { result } = renderHook(
        () => useLeads.useBulkUpdateStatusMutation(),
        { wrapper: createWrapper() }
      );

      result.current.mutate(bulkData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(partialResult);
    });
  });

  describe('useBulkAssignMutation', () => {
    const bulkAssignData = {
      leadIds: ['lead-1', 'lead-2'],
      assignedTo: 'user-456',
      reason: 'Workload balancing'
    };

    const mockBulkResult = {
      successful: ['lead-1', 'lead-2'],
      failed: []
    };

    it('should perform bulk assignment successfully', async () => {
      mockedLeadService.bulkAssignLeads.mockResolvedValue(mockBulkResult);

      const { result } = renderHook(
        () => useLeads.useBulkAssignMutation(),
        { wrapper: createWrapper() }
      );

      result.current.mutate(bulkAssignData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockBulkResult);
      expect(mockedLeadService.bulkAssignLeads).toHaveBeenCalledWith(
        bulkAssignData.leadIds,
        bulkAssignData.assignedTo,
        bulkAssignData.reason
      );
    });
  });

  describe('useLeadActivitiesQuery', () => {
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
        subject: 'Status changed',
        performedBy: 'user-456',
        performedAt: new Date(),
        details: { oldStatus: 'new', newStatus: 'contacted' }
      }
    ];

    it('should fetch lead activities successfully', async () => {
      mockedLeadService.getLeadActivities.mockResolvedValue(mockActivities);

      const { result } = renderHook(
        () => useLeads.useLeadActivitiesQuery('lead-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockActivities);
      expect(mockedLeadService.getLeadActivities).toHaveBeenCalledWith('lead-123');
    });

    it('should not fetch when leadId is undefined', () => {
      const { result } = renderHook(
        () => useLeads.useLeadActivitiesQuery(undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.isIdle).toBe(true);
      expect(mockedLeadService.getLeadActivities).not.toHaveBeenCalled();
    });
  });

  describe('useCheckDuplicatesQuery', () => {
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

    it('should check for duplicates successfully', async () => {
      mockedLeadService.checkDuplicates.mockResolvedValue(mockDuplicates);

      const { result } = renderHook(
        () => useLeads.useCheckDuplicatesQuery({ email: 'john@test.com' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockDuplicates);
      expect(mockedLeadService.checkDuplicates).toHaveBeenCalledWith({
        email: 'john@test.com'
      });
    });

    it('should not check when criteria is empty', () => {
      const { result } = renderHook(
        () => useLeads.useCheckDuplicatesQuery({}),
        { wrapper: createWrapper() }
      );

      expect(result.current.isIdle).toBe(true);
      expect(mockedLeadService.checkDuplicates).not.toHaveBeenCalled();
    });
  });

  describe('Query invalidation and refetching', () => {
    it('should invalidate leads query after successful creation', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      mockedLeadService.createLead.mockResolvedValue({
        id: 'lead-123',
        accountLeadId: 'AL-24-01-001'
      } as any);

      const { result } = renderHook(
        () => useLeads.useCreateLeadMutation(),
        { wrapper }
      );

      result.current.mutate({
        company: { name: 'Test Company' },
        contact: { name: 'John Doe', email: 'john@test.com' },
        source: { channel: LeadChannel.WEB_FORM }
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['leads']
      });
    });
  });
});