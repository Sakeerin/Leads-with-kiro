import { apiService } from './api';
import { Lead, Task, Activity, SearchFilters, PaginationParams, BulkOperation, ApiResponse } from '../types';

export class LeadService {
  // Lead CRUD operations
  static async getLeads(params?: PaginationParams & SearchFilters): Promise<ApiResponse<Lead[]>> {
    return apiService.get<Lead[]>('/leads', params);
  }

  static async getLead(id: string): Promise<ApiResponse<Lead>> {
    return apiService.get<Lead>(`/leads/${id}`);
  }

  static async createLead(leadData: Partial<Lead>): Promise<ApiResponse<Lead>> {
    return apiService.post<Lead>('/leads', leadData);
  }

  static async updateLead(id: string, leadData: Partial<Lead>): Promise<ApiResponse<Lead>> {
    return apiService.put<Lead>(`/leads/${id}`, leadData);
  }

  static async deleteLead(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/leads/${id}`);
  }

  // Lead search and filtering
  static async searchLeads(searchTerm: string, filters?: SearchFilters): Promise<ApiResponse<Lead[]>> {
    return apiService.get<Lead[]>('/leads/search', { searchTerm, ...filters });
  }

  // Bulk operations
  static async bulkOperation(operation: BulkOperation): Promise<ApiResponse<void>> {
    return apiService.post<void>('/leads/bulk', operation);
  }

  // Lead assignment
  static async assignLead(leadId: string, assigneeId: string, reason?: string): Promise<ApiResponse<Lead>> {
    return apiService.post<Lead>(`/leads/${leadId}/assign`, { assigneeId, reason });
  }

  static async reassignLead(leadId: string, newAssigneeId: string, reason: string): Promise<ApiResponse<Lead>> {
    return apiService.post<Lead>(`/leads/${leadId}/reassign`, { newAssigneeId, reason });
  }

  // Lead status management
  static async updateLeadStatus(leadId: string, status: string, reason?: string): Promise<ApiResponse<Lead>> {
    return apiService.patch<Lead>(`/leads/${leadId}/status`, { status, reason });
  }

  // Lead activities
  static async getLeadActivities(leadId: string): Promise<ApiResponse<Activity[]>> {
    return apiService.get<Activity[]>(`/leads/${leadId}/activities`);
  }

  static async addLeadNote(leadId: string, note: string): Promise<ApiResponse<Activity>> {
    return apiService.post<Activity>(`/leads/${leadId}/notes`, { note });
  }

  // Lead tasks
  static async getLeadTasks(leadId: string): Promise<ApiResponse<Task[]>> {
    return apiService.get<Task[]>(`/leads/${leadId}/tasks`);
  }

  static async createLeadTask(leadId: string, taskData: Partial<Task>): Promise<ApiResponse<Task>> {
    return apiService.post<Task>(`/leads/${leadId}/tasks`, taskData);
  }

  // Lead conversion
  static async convertLead(leadId: string, conversionData: any): Promise<ApiResponse<any>> {
    return apiService.post<any>(`/leads/${leadId}/convert`, conversionData);
  }

  // Lead scoring
  static async recalculateLeadScore(leadId: string): Promise<ApiResponse<Lead>> {
    return apiService.post<Lead>(`/leads/${leadId}/score/recalculate`);
  }

  // Duplicate detection
  static async findDuplicates(leadData: Partial<Lead>): Promise<ApiResponse<Lead[]>> {
    return apiService.post<Lead[]>('/leads/duplicates/find', leadData);
  }

  static async mergeLeads(sourceId: string, targetId: string): Promise<ApiResponse<Lead>> {
    return apiService.post<Lead>('/leads/merge', { sourceId, targetId });
  }

  // Lead statistics
  static async getLeadStatistics(filters?: SearchFilters): Promise<ApiResponse<any>> {
    return apiService.get<any>('/leads/statistics', filters);
  }

  // Export leads
  static async exportLeads(filters?: SearchFilters, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const response = await apiService.get<any>('/leads/export', { ...filters, format });
    return new Blob([response.data], { 
      type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }
}