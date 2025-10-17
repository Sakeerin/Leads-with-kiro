import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { ExportHistory } from '../models/ExportHistory';
import { LeadService, SearchCriteria } from './leadService';
import { ReportingService } from './reportingService';
import { 
  ExportRequest, 
  ExportResult, 
  ExportType, 
  ExportFileFormat, 
  ExportStatus,
  Lead
} from '../types';
import { ValidationError as AppValidationError, NotFoundError } from '../utils/errors';

export interface ExportOptions {
  includeHeaders?: boolean;
  dateFormat?: string;
  timezone?: string;
}

export class ExportService {
  private static readonly EXPORT_DIR = process.env.EXPORT_DIR || './exports';
  private static readonly MAX_EXPORT_RECORDS = 50000; // Limit for performance

  /**
   * Export leads to file
   */
  static async exportLeads(
    request: ExportRequest,
    exportedBy: string,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const { exportType, fileFormat, filters, columns, includeHeaders = true } = request;
    const { dateFormat = 'YYYY-MM-DD', timezone = 'UTC' } = options;

    // Validate export type
    if (exportType !== ExportType.LEADS) {
      throw new AppValidationError('Invalid export type for lead export');
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `leads_export_${timestamp}.${fileFormat}`;
    const filePath = path.join(this.EXPORT_DIR, filename);

    // Ensure export directory exists
    await this.ensureExportDirectory();

    // Create export history record
    const exportHistory = await ExportHistory.createExport({
      filename,
      exportType,
      fileFormat,
      recordCount: 0, // Will be updated after processing
      filtersApplied: filters,
      columnsExported: columns,
      exportedBy
    });

    try {
      // Get leads data
      const searchCriteria: SearchCriteria = {
        ...filters,
        limit: this.MAX_EXPORT_RECORDS
      };

      const leadsResult = await LeadService.searchLeads(searchCriteria);
      
      if (leadsResult.leads.length === 0) {
        throw new AppValidationError('No leads found matching the specified criteria');
      }

      // Prepare data for export
      const exportData = this.prepareLeadExportData(leadsResult.leads, columns, {
        dateFormat,
        timezone,
        includeHeaders
      });

      // Generate file
      let fileSize: number;
      if (fileFormat === ExportFileFormat.CSV) {
        fileSize = await this.generateCSV(exportData, filePath, includeHeaders);
      } else if (fileFormat === ExportFileFormat.XLSX) {
        fileSize = await this.generateXLSX(exportData, filePath, includeHeaders);
      } else {
        throw new AppValidationError(`Unsupported export format: ${fileFormat}`);
      }

      // Update export history
      await ExportHistory.updateExportStatus(exportHistory.id, ExportStatus.COMPLETED, {
        filePath,
        fileSize
      });

      // Update record count
      await ExportHistory.update(exportHistory.id, {
        record_count: leadsResult.leads.length
      });

      return {
        exportId: exportHistory.id,
        filename,
        filePath,
        fileSize,
        recordCount: leadsResult.leads.length,
        downloadUrl: `/api/exports/${exportHistory.id}/download`
      };

    } catch (error) {
      // Update export history with error
      await ExportHistory.updateExportStatus(exportHistory.id, ExportStatus.FAILED, {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Export reports data
   */
  static async exportReports(
    request: ExportRequest,
    exportedBy: string,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const { exportType, fileFormat, filters, columns } = request;
    const { includeHeaders = true } = options;

    if (exportType !== ExportType.REPORTS) {
      throw new AppValidationError('Invalid export type for reports export');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `reports_export_${timestamp}.${fileFormat}`;
    const filePath = path.join(this.EXPORT_DIR, filename);

    await this.ensureExportDirectory();

    const exportHistory = await ExportHistory.createExport({
      filename,
      exportType,
      fileFormat,
      recordCount: 0,
      filtersApplied: filters,
      columnsExported: columns,
      exportedBy
    });

    try {
      // Get reports data based on filters
      const reportsData = await this.getReportsData(filters || {});
      
      if (reportsData.length === 0) {
        throw new AppValidationError('No report data found matching the specified criteria');
      }

      // Prepare data for export
      const exportData = this.prepareReportExportData(reportsData, columns);

      // Generate file
      let fileSize: number;
      if (fileFormat === ExportFileFormat.CSV) {
        fileSize = await this.generateCSV(exportData, filePath, includeHeaders);
      } else if (fileFormat === ExportFileFormat.XLSX) {
        fileSize = await this.generateXLSX(exportData, filePath, includeHeaders);
      } else {
        throw new AppValidationError(`Unsupported export format: ${fileFormat}`);
      }

      await ExportHistory.updateExportStatus(exportHistory.id, ExportStatus.COMPLETED, {
        filePath,
        fileSize
      });

      await ExportHistory.update(exportHistory.id, {
        record_count: reportsData.length
      });

      return {
        exportId: exportHistory.id,
        filename,
        filePath,
        fileSize,
        recordCount: reportsData.length,
        downloadUrl: `/api/exports/${exportHistory.id}/download`
      };

    } catch (error) {
      await ExportHistory.updateExportStatus(exportHistory.id, ExportStatus.FAILED, {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Export analytics data
   */
  static async exportAnalytics(
    request: ExportRequest,
    exportedBy: string,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const { exportType, fileFormat, filters, columns } = request;
    const { includeHeaders = true } = options;

    if (exportType !== ExportType.ANALYTICS) {
      throw new AppValidationError('Invalid export type for analytics export');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `analytics_export_${timestamp}.${fileFormat}`;
    const filePath = path.join(this.EXPORT_DIR, filename);

    await this.ensureExportDirectory();

    const exportHistory = await ExportHistory.createExport({
      filename,
      exportType,
      fileFormat,
      recordCount: 0,
      filtersApplied: filters,
      columnsExported: columns,
      exportedBy
    });

    try {
      // Get analytics data
      const analyticsData = await this.getAnalyticsData(filters || {});
      
      if (analyticsData.length === 0) {
        throw new AppValidationError('No analytics data found matching the specified criteria');
      }

      // Prepare data for export
      const exportData = this.prepareAnalyticsExportData(analyticsData, columns);

      // Generate file
      let fileSize: number;
      if (fileFormat === ExportFileFormat.CSV) {
        fileSize = await this.generateCSV(exportData, filePath, includeHeaders);
      } else if (fileFormat === ExportFileFormat.XLSX) {
        fileSize = await this.generateXLSX(exportData, filePath, includeHeaders);
      } else {
        throw new AppValidationError(`Unsupported export format: ${fileFormat}`);
      }

      await ExportHistory.updateExportStatus(exportHistory.id, ExportStatus.COMPLETED, {
        filePath,
        fileSize
      });

      await ExportHistory.update(exportHistory.id, {
        record_count: analyticsData.length
      });

      return {
        exportId: exportHistory.id,
        filename,
        filePath,
        fileSize,
        recordCount: analyticsData.length,
        downloadUrl: `/api/exports/${exportHistory.id}/download`
      };

    } catch (error) {
      await ExportHistory.updateExportStatus(exportHistory.id, ExportStatus.FAILED, {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Prepare lead data for export
   */
  private static prepareLeadExportData(
    leads: Lead[],
    columns?: string[],
    options: { dateFormat: string; timezone: string; includeHeaders: boolean } = {
      dateFormat: 'YYYY-MM-DD',
      timezone: 'UTC',
      includeHeaders: true
    }
  ): Record<string, any>[] {
    const defaultColumns = [
      'accountLeadId',
      'company.name',
      'company.industry',
      'company.size',
      'contact.name',
      'contact.email',
      'contact.phone',
      'contact.mobile',
      'source.channel',
      'source.campaign',
      'status',
      'score.value',
      'score.band',
      'qualification.interest',
      'qualification.budget',
      'qualification.timeline',
      'qualification.businessType',
      'followUp.nextDate',
      'followUp.notes',
      'product.type',
      'product.adType',
      'assignment.assignedTo',
      'assignment.assignedAt',
      'metadata.createdAt',
      'metadata.updatedAt',
      'metadata.createdBy'
    ];

    const exportColumns = columns || defaultColumns;

    return leads.map(lead => {
      const row: Record<string, any> = {};

      exportColumns.forEach(column => {
        const value = this.getNestedValue(lead, column);
        
        // Format dates
        if (value instanceof Date) {
          row[this.formatColumnHeader(column)] = this.formatDate(value, options.dateFormat, options.timezone);
        } else {
          row[this.formatColumnHeader(column)] = value || '';
        }
      });

      return row;
    });
  }

  /**
   * Prepare report data for export
   */
  private static prepareReportExportData(
    data: Record<string, any>[],
    columns?: string[]
  ): Record<string, any>[] {
    if (!columns || columns.length === 0) {
      return data;
    }

    return data.map(row => {
      const exportRow: Record<string, any> = {};
      columns.forEach(column => {
        exportRow[column] = row[column] || '';
      });
      return exportRow;
    });
  }

  /**
   * Prepare analytics data for export
   */
  private static prepareAnalyticsExportData(
    data: Record<string, any>[],
    columns?: string[]
  ): Record<string, any>[] {
    if (!columns || columns.length === 0) {
      return data;
    }

    return data.map(row => {
      const exportRow: Record<string, any> = {};
      columns.forEach(column => {
        exportRow[column] = row[column] || '';
      });
      return exportRow;
    });
  }

  /**
   * Get nested object value using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Format column header for display
   */
  private static formatColumnHeader(column: string): string {
    return column
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /**
   * Format date for export
   */
  private static formatDate(date: Date, format: string, timezone: string): string {
    // Simple date formatting - in production, use a proper date library like moment.js or date-fns
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };

    if (format.includes('HH:mm')) {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false;
    }

    return date.toLocaleDateString('en-CA', options); // en-CA gives YYYY-MM-DD format
  }

  /**
   * Generate CSV file
   */
  private static async generateCSV(
    data: Record<string, any>[],
    filePath: string,
    includeHeaders: boolean = true
  ): Promise<number> {
    if (data.length === 0) {
      throw new AppValidationError('No data to export');
    }

    const headers = Object.keys(data[0]);
    let csvContent = '';

    if (includeHeaders) {
      csvContent += headers.map(header => this.escapeCsvValue(header)).join(',') + '\n';
    }

    data.forEach(row => {
      const values = headers.map(header => this.escapeCsvValue(row[header]));
      csvContent += values.join(',') + '\n';
    });

    await fs.promises.writeFile(filePath, csvContent, 'utf8');
    
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  }

  /**
   * Generate XLSX file
   */
  private static async generateXLSX(
    data: Record<string, any>[],
    filePath: string,
    includeHeaders: boolean = true
  ): Promise<number> {
    if (data.length === 0) {
      throw new AppValidationError('No data to export');
    }

    const worksheet = XLSX.utils.json_to_sheet(data, { 
      header: includeHeaders ? Object.keys(data[0]) : undefined 
    });
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
    
    XLSX.writeFile(workbook, filePath);
    
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  }

  /**
   * Escape CSV values
   */
  private static escapeCsvValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);
    
    // If the value contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }

  /**
   * Get reports data based on filters
   */
  private static async getReportsData(filters: Record<string, any>): Promise<Record<string, any>[]> {
    // This would integrate with your reporting service
    // For now, return sample data structure
    const reportType = filters.reportType || 'funnel';
    
    switch (reportType) {
      case 'funnel':
        return await ReportingService.getFunnelMetrics(filters);
      case 'source':
        return await ReportingService.getSourceEffectiveness(filters);
      case 'performance':
        return await ReportingService.getPerformanceMetrics(filters);
      default:
        return [];
    }
  }

  /**
   * Get analytics data based on filters
   */
  private static async getAnalyticsData(filters: Record<string, any>): Promise<Record<string, any>[]> {
    // This would integrate with your analytics service
    const analyticsType = filters.analyticsType || 'conversion';
    
    switch (analyticsType) {
      case 'conversion':
        return await ReportingService.getConversionAnalytics(filters);
      case 'activity':
        return await ReportingService.getActivityAnalytics(filters);
      case 'quality':
        return await ReportingService.getDataQualityMetrics(filters);
      default:
        return [];
    }
  }

  /**
   * Get export file
   */
  static async getExportFile(exportId: string): Promise<{
    filePath: string;
    filename: string;
    contentType: string;
  }> {
    const exportHistory = await ExportHistory.findById(exportId);
    
    if (!exportHistory) {
      throw new NotFoundError(`Export with ID ${exportId} not found`);
    }

    if (exportHistory.status !== ExportStatus.COMPLETED || !exportHistory.file_path) {
      throw new AppValidationError('Export file is not available');
    }

    // Check if file exists
    if (!fs.existsSync(exportHistory.file_path)) {
      throw new NotFoundError('Export file not found on disk');
    }

    const contentType = this.getContentType(exportHistory.file_format);

    return {
      filePath: exportHistory.file_path,
      filename: exportHistory.filename,
      contentType
    };
  }

  /**
   * Get content type for file format
   */
  private static getContentType(fileFormat: ExportFileFormat): string {
    switch (fileFormat) {
      case ExportFileFormat.CSV:
        return 'text/csv';
      case ExportFileFormat.XLSX:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case ExportFileFormat.PDF:
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Get export history
   */
  static async getExportHistory(exportedBy?: string, limit: number = 20): Promise<any[]> {
    const dbExports = exportedBy 
      ? await ExportHistory.findByExportedBy(exportedBy)
      : await ExportHistory.findRecent(limit);

    return dbExports.map(ExportHistory.transformToExportHistoryType);
  }

  /**
   * Get export statistics
   */
  static async getExportStatistics(): Promise<any> {
    return ExportHistory.getExportStatistics();
  }

  /**
   * Cleanup old export files
   */
  static async cleanupOldExports(olderThanDays: number = 30): Promise<{
    deletedRecords: number;
    deletedFiles: number;
  }> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    // Get old exports
    const oldExports = await ExportHistory.query
      .where('created_at', '<', cutoffDate)
      .where('status', ExportStatus.COMPLETED);

    let deletedFiles = 0;

    // Delete physical files
    for (const exportRecord of oldExports) {
      if (exportRecord.file_path && fs.existsSync(exportRecord.file_path)) {
        try {
          await fs.promises.unlink(exportRecord.file_path);
          deletedFiles++;
        } catch (error) {
          console.warn(`Failed to delete export file ${exportRecord.file_path}:`, error);
        }
      }
    }

    // Delete database records
    const deletedRecords = await ExportHistory.cleanupOldExports(olderThanDays);

    return {
      deletedRecords,
      deletedFiles
    };
  }

  /**
   * Ensure export directory exists
   */
  private static async ensureExportDirectory(): Promise<void> {
    try {
      await fs.promises.access(this.EXPORT_DIR);
    } catch {
      await fs.promises.mkdir(this.EXPORT_DIR, { recursive: true });
    }
  }
}