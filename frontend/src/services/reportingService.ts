import { api } from './api';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface FunnelMetrics {
  stage: string;
  count: number;
  conversionRate: number;
  averageTimeInStage: number;
}

export interface TimeToFirstTouchReport {
  averageTimeToFirstTouch: number;
  medianTimeToFirstTouch: number;
  bySource: Array<{
    source: string;
    averageTime: number;
    medianTime: number;
  }>;
  byAssignee: Array<{
    assigneeId: string;
    assigneeName: string;
    averageTime: number;
    medianTime: number;
  }>;
}

export interface SLAComplianceReport {
  overallCompliance: number;
  totalLeads: number;
  compliantLeads: number;
  breachedLeads: number;
  averageResponseTime: number;
  byAssignee: Array<{
    assigneeId: string;
    assigneeName: string;
    compliance: number;
    totalLeads: number;
    compliantLeads: number;
    averageResponseTime: number;
  }>;
  bySource: Array<{
    source: string;
    compliance: number;
    totalLeads: number;
    compliantLeads: number;
    averageResponseTime: number;
  }>;
}

export interface SourceEffectivenessReport {
  source: string;
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  qualificationRate: number;
  conversionRate: number;
  costPerLead?: number;
  costPerConversion?: number;
  averageScore: number;
  averageTimeToConversion: number;
}

export interface SalesRepPerformanceReport {
  assigneeId: string;
  assigneeName: string;
  totalLeads: number;
  activeLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  qualificationRate: number;
  conversionRate: number;
  averageScore: number;
  averageTimeToFirstTouch: number;
  averageTimeToConversion: number;
  tasksCompleted: number;
  tasksOverdue: number;
  activitiesLogged: number;
  slaCompliance: number;
}

export interface DataQualityReport {
  totalLeads: number;
  duplicateLeads: number;
  duplicateRate: number;
  missingFields: Array<{
    field: string;
    missingCount: number;
    missingRate: number;
  }>;
  invalidEmails: number;
  invalidPhones: number;
  dataCompletenessScore: number;
  duplicateGroups: Array<{
    groupId: string;
    leads: Array<{
      id: string;
      accountLeadId: string;
      companyName: string;
      contactEmail: string;
      similarity: number;
    }>;
  }>;
}

export interface DashboardData {
  funnelMetrics: FunnelMetrics[];
  timeToFirstTouch: TimeToFirstTouchReport;
  slaCompliance: SLAComplianceReport;
  sourceEffectiveness: SourceEffectivenessReport[];
  salesRepPerformance: SalesRepPerformanceReport[];
  dataQuality: DataQualityReport;
  dateRange?: DateRange;
  slaHours: number;
  generatedAt: string;
}

class ReportingService {
  /**
   * Get funnel metrics showing conversion rates at each stage
   */
  async getFunnelMetrics(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
    }

    const response = await api.get(`/reporting/funnel-metrics?${params.toString()}`);
    return response.data;
  }

  /**
   * Get time-to-first-touch report
   */
  async getTimeToFirstTouchReport(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
    }

    const response = await api.get(`/reporting/time-to-first-touch?${params.toString()}`);
    return response.data;
  }

  /**
   * Get SLA compliance report
   */
  async getSLAComplianceReport(slaHours: number = 24, dateRange?: DateRange) {
    const params = new URLSearchParams();
    params.append('slaHours', slaHours.toString());
    if (dateRange) {
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
    }

    const response = await api.get(`/reporting/sla-compliance?${params.toString()}`);
    return response.data;
  }

  /**
   * Get source effectiveness report
   */
  async getSourceEffectivenessReport(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
    }

    const response = await api.get(`/reporting/source-effectiveness?${params.toString()}`);
    return response.data;
  }

  /**
   * Get sales representative performance report
   */
  async getSalesRepPerformanceReport(dateRange?: DateRange, assigneeId?: string) {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
    }
    if (assigneeId) {
      params.append('assigneeId', assigneeId);
    }

    const response = await api.get(`/reporting/sales-performance?${params.toString()}`);
    return response.data;
  }

  /**
   * Get data quality report
   */
  async getDataQualityReport(dateRange?: DateRange) {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
    }

    const response = await api.get(`/reporting/data-quality?${params.toString()}`);
    return response.data;
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(slaHours: number = 24, dateRange?: DateRange): Promise<{ data: DashboardData }> {
    const params = new URLSearchParams();
    params.append('slaHours', slaHours.toString());
    if (dateRange) {
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
    }

    const response = await api.get(`/reporting/dashboard?${params.toString()}`);
    return response.data;
  }

  /**
   * Export report data
   */
  async exportReport(
    reportType: string,
    format: 'json' | 'csv' = 'csv',
    dateRange?: DateRange,
    slaHours?: number
  ) {
    const params = new URLSearchParams();
    params.append('reportType', reportType);
    params.append('format', format);
    if (dateRange) {
      params.append('startDate', dateRange.startDate);
      params.append('endDate', dateRange.endDate);
    }
    if (slaHours) {
      params.append('slaHours', slaHours.toString());
    }

    const response = await api.get(`/reporting/export?${params.toString()}`, {
      responseType: format === 'csv' ? 'blob' : 'json'
    });

    // Create download link
    if (format === 'csv') {
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }

    return response.data;
  }

  /**
   * Schedule report email
   */
  async scheduleReportEmail(
    reportType: string,
    recipients: string[],
    frequency: 'daily' | 'weekly' | 'monthly',
    format: 'json' | 'csv' = 'csv'
  ) {
    const response = await api.post('/reporting/schedule', {
      reportType,
      recipients,
      frequency,
      format
    });
    return response.data;
  }

  /**
   * Get scheduled reports
   */
  async getScheduledReports() {
    const response = await api.get('/reporting/scheduled');
    return response.data;
  }

  /**
   * Cancel scheduled report
   */
  async cancelScheduledReport(scheduleId: string) {
    const response = await api.delete(`/reporting/scheduled/${scheduleId}`);
    return response.data;
  }
}

export const reportingService = new ReportingService();