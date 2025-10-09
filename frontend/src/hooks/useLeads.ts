import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LeadService } from '../services/leadService';
import { Lead, SearchFilters, PaginationParams } from '../types';

export const useLeads = (pagination: PaginationParams, filters: SearchFilters) => {
  const queryClient = useQueryClient();

  const leadsQuery = useQuery({
    queryKey: ['leads', pagination, filters],
    queryFn: () => LeadService.getLeads({ ...pagination, ...filters }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createLeadMutation = useMutation({
    mutationFn: LeadService.createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) =>
      LeadService.updateLead(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: LeadService.deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const bulkOperationMutation = useMutation({
    mutationFn: LeadService.bulkOperation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: string }) =>
      LeadService.updateLeadStatus(leadId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  return {
    // Queries
    leads: leadsQuery.data?.data || [],
    totalCount: leadsQuery.data?.pagination?.total || 0,
    isLoading: leadsQuery.isLoading,
    error: leadsQuery.error,

    // Mutations
    createLead: createLeadMutation.mutate,
    updateLead: updateLeadMutation.mutate,
    deleteLead: deleteLeadMutation.mutate,
    bulkOperation: bulkOperationMutation.mutate,
    updateStatus: updateStatusMutation.mutate,

    // Loading states
    isCreating: createLeadMutation.isPending,
    isUpdating: updateLeadMutation.isPending,
    isDeleting: deleteLeadMutation.isPending,
    isBulkOperating: bulkOperationMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
};

export const useLeadActivities = (leadId: string | null) => {
  return useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: () => leadId ? LeadService.getLeadActivities(leadId) : null,
    enabled: !!leadId,
  });
};

export const useLeadTasks = (leadId: string | null) => {
  return useQuery({
    queryKey: ['lead-tasks', leadId],
    queryFn: () => leadId ? LeadService.getLeadTasks(leadId) : null,
    enabled: !!leadId,
  });
};