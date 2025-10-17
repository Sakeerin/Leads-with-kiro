import { api } from './api';

export interface ImportValidationResult {
  isValid: boolean;
  totalRecords: number;
  suggestedMapping: Record<string, string>;
  validationErrors: ValidationError[];
  sampleData: Record<string, any>[];
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  code: string;
}

export interface ImportResult {
  importId: string;
  status: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  validationErrors: ValidationError[];
  duplicateReport: DuplicateReport;
}

export interface DuplicateReport {
  totalDuplicates: number;
  duplicatesByType: Record<string, number>;
  duplicateDetails: Array<{
    row: number;
    matches: any[];
  }>;
}

export interface ImportProgress {
  importId: string;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  currentStatus: string;
}

export interface ImportHistory {
  id: string;
  filename: string;
  originalFilename: string;
  fileType: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  status: string;
  importedBy: string;
  startedAt: string;
  completedAt?: string;
}

export interface ExportResult {
  exportId: string;
  filename: string;
  filePath: string;
  fileSize: number;
  recordCount: number;
  downloadUrl: string;
}

export interface ExportHistory {
  id: string;
  filename: string;
  exportType: string;
  fileFormat: string;
  recordCount: number;
  status: string;
  exportedBy: string;
  startedAt: string;
  completedAt?: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  reportType: string;
  fileFormat: string;
  filters?: Record<string, any>;
  columns?: string[];
  cronSchedule: string;
  emailRecipients: string[];
  emailSubject?: string;
  emailBody?: string;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdBy: string;
}

export class ImportExportService {
  /**
   * Validate import file
   */
  static async validateImportFile(
    file: File,
    fieldMapping?: Record<string, string>
  ): Promise<ImportValidationResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (fieldMapping) {
      formData.append('fieldMapping', JSON.stringify(fieldMapping));
    }

    const response = await api.post('/import/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * Import leads from file
   */
  static async importLeads(
    file: File,
    options: {
      fieldMapping?: Record<string, string>;
      skipDuplicates?: boolean;
      updateExisting?: boolean;
      validateOnly?: boolean;
    } = {}
  ): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.fieldMapping) {
      formData.append('fieldMapping', JSON.stringify(options.fieldMapping));
    }
    
    if (options.skipDuplicates !== undefined) {
      formData.append('skipDuplicates', options.skipDuplicates.toString());
    }
    
    if (options.updateExisting !== undefined) {
      formData.append('updateExisting', options.updateExisting.toString());
    }
    
    if (options.validateOnly !== undefined) {
      formData.append('validateOnly', options.validateOnly.toString());
    }

    const response = await api.post('/import/leads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  /**
   * Get import progress
   */
  static async getImportProgress(importId: string): Promise<ImportProgress> {
    const response = await api.get(`/import/${importId}/progress`);
    return response.data.data;
  }

  /**
   * Get import history
   */
  static async getImportHistory(limit: number = 20): Promise<ImportHistory[]> {
    const response = await api.get('/import/history', {
      params: { limit }
    });
    return response.data.data;
  }

  /**
   * Get import details
   */
  static async getImportDetails(importId: string): Promise<{
    import: ImportHistory;
    summary: any;
    records: any;
  }> {
    const response = await api.get(`/import/${importId}/details`);
    return response.data.data;
  }

  /**
   * Rollback import
   */
  static async rollbackImport(importId: string): Promise<void> {
    await api.post(`/import/${importId}/rollback`);
  }

  /**
   * Export leads
   */
  static async exportLeads(options: {
    fileFormat?: string;
    filters?: Record<string, any>;
    columns?: string[];
    includeHeaders?: boolean;
  } = {}): Promise<ExportResult> {
    const response = await api.post('/export/leads', {
      fileFormat: options.fileFormat || 'csv',
      filters: options.filters || {},
      columns: options.columns,
      includeHeaders: options.includeHeaders !== false
    });

    return response.data.data;
  }

  /**
   * Export reports
   */
  static async exportReports(options: {
    fileFormat?: string;
    filters?: Record<string, any>;
    columns?: string[];
    includeHeaders?: boolean;
  } = {}): Promise<ExportResult> {
    const response = await api.post('/export/reports', {
      fileFormat: options.fileFormat || 'csv',
      filters: options.filters || {},
      columns: options.columns,
      includeHeaders: options.includeHeaders !== false
    });

    return response.data.data;
  }

  /**
   * Export analytics
   */
  static async exportAnalytics(options: {
    fileFormat?: string;
    filters?: Record<string, any>;
    columns?: string[];
    includeHeaders?: boolean;
  } = {}): Promise<ExportResult> {
    const response = await api.post('/export/analytics', {
      fileFormat: options.fileFormat || 'csv',
      filters: options.filters || {},
      columns: options.columns,
      includeHeaders: options.includeHeaders !== false
    });

    return response.data.data;
  }

  /**
   * Download export file
   */
  static async downloadExport(exportId: string): Promise<Blob> {
    const response = await api.get(`/export/${exportId}/download`, {
      responseType: 'blob'
    });

    return response.data;
  }

  /**
   * Get export history
   */
  static async getExportHistory(limit: number = 20): Promise<ExportHistory[]> {
    const response = await api.get('/export/history', {
      params: { limit }
    });
    return response.data.data;
  }

  /**
   * Create scheduled report
   */
  static async createScheduledReport(data: {
    name: string;
    description?: string;
    reportType: string;
    fileFormat: string;
    filters?: Record<string, any>;
    columns?: string[];
    cronSchedule: string;
    emailRecipients: string[];
    emailSubject?: string;
    emailBody?: string;
  }): Promise<ScheduledReport> {
    const response = await api.post('/scheduled-reports', data);
    return response.data.data;
  }

  /**
   * Get scheduled reports
   */
  static async getScheduledReports(): Promise<ScheduledReport[]> {
    const response = await api.get('/scheduled-reports');
    return response.data.data;
  }

  /**
   * Get scheduled report by ID
   */
  static async getScheduledReport(reportId: string): Promise<ScheduledReport> {
    const response = await api.get(`/scheduled-reports/${reportId}`);
    return response.data.data;
  }

  /**
   * Update scheduled report
   */
  static async updateScheduledReport(
    reportId: string,
    data: Partial<ScheduledReport>
  ): Promise<ScheduledReport> {
    const response = await api.put(`/scheduled-reports/${reportId}`, data);
    return response.data.data;
  }

  /**
   * Delete scheduled report
   */
  static async deleteScheduledReport(reportId: string): Promise<void> {
    await api.delete(`/scheduled-reports/${reportId}`);
  }

  /**
   * Execute scheduled report manually
   */
  static async executeScheduledReport(reportId: string): Promise<any> {
    const response = await api.post(`/scheduled-reports/${reportId}/execute`);
    return response.data.data;
  }

  /**
   * Get available export columns for leads
   */
  static getAvailableLeadColumns(): Array<{ value: string; label: string }> {
    return [
      { value: 'accountLeadId', label: 'Account Lead ID' },
      { value: 'company.name', label: 'Company Name' },
      { value: 'company.industry', label: 'Industry' },
      { value: 'company.size', label: 'Company Size' },
      { value: 'contact.name', label: 'Contact Name' },
      { value: 'contact.email', label: 'Email' },
      { value: 'contact.phone', label: 'Phone' },
      { value: 'contact.mobile', label: 'Mobile' },
      { value: 'source.channel', label: 'Source Channel' },
      { value: 'source.campaign', label: 'Campaign' },
      { value: 'status', label: 'Status' },
      { value: 'score.value', label: 'Score Value' },
      { value: 'score.band', label: 'Score Band' },
      { value: 'qualification.interest', label: 'Interest Level' },
      { value: 'qualification.budget', label: 'Budget Status' },
      { value: 'qualification.timeline', label: 'Purchase Timeline' },
      { value: 'qualification.businessType', label: 'Business Type' },
      { value: 'followUp.nextDate', label: 'Follow Up Date' },
      { value: 'followUp.notes', label: 'Follow Up Notes' },
      { value: 'product.type', label: 'Product Type' },
      { value: 'product.adType', label: 'Ad Type' },
      { value: 'assignment.assignedTo', label: 'Assigned To' },
      { value: 'assignment.assignedAt', label: 'Assigned At' },
      { value: 'metadata.createdAt', label: 'Created At' },
      { value: 'metadata.updatedAt', label: 'Updated At' },
      { value: 'metadata.createdBy', label: 'Created By' }
    ];
  }

  /**
   * Get file format options
   */
  static getFileFormatOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'csv', label: 'CSV' },
      { value: 'xlsx', label: 'Excel (XLSX)' }
    ];
  }

  /**
   * Get report type options
   */
  static getReportTypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'leads', label: 'Leads Report' },
      { value: 'analytics', label: 'Analytics Report' },
      { value: 'performance', label: 'Performance Report' }
    ];
  }

  /**
   * Validate cron schedule format
   */
  static validateCronSchedule(schedule: string): boolean {
    // Basic cron validation - 5 or 6 parts separated by spaces
    const parts = schedule.trim().split(/\s+/);
    return parts.length === 5 || parts.length === 6;
  }

  /**
   * Get common cron schedule presets
   */
  static getCronPresets(): Array<{ value: string; label: string; description: string }> {
    return [
      { value: '0 9 * * 1', label: 'Weekly (Monday 9 AM)', description: 'Every Monday at 9:00 AM' },
      { value: '0 9 1 * *', label: 'Monthly (1st day 9 AM)', description: 'First day of every month at 9:00 AM' },
      { value: '0 9 * * *', label: 'Daily (9 AM)', description: 'Every day at 9:00 AM' },
      { value: '0 9 * * 1-5', label: 'Weekdays (9 AM)', description: 'Monday to Friday at 9:00 AM' },
      { value: '0 */6 * * *', label: 'Every 6 hours', description: 'Every 6 hours' },
      { value: '0 0 1 1,4,7,10 *', label: 'Quarterly', description: 'First day of each quarter at midnight' }
    ];
  }
}