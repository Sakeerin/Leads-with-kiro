import { Request, Response } from 'express';
import { ReportingService, DateRange } from '../services/reportingService';
import { AppError } from '../utils/errors';

export class ReportingController {
  /**
   * Get funnel metrics dashboard
   */
  static async getFunnelMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      let dateRange: DateRange | undefined;
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      }

      const metrics = await ReportingService.getFunnelMetrics(dateRange);
      
      res.json({
        success: true,
        data: {
          metrics,
          dateRange,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error getting funnel metrics:', error);
      throw new AppError('Failed to generate funnel metrics', 500);
    }
  }

  /**
   * Get time-to-first-touch report
   */
  static async getTimeToFirstTouchReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      let dateRange: DateRange | undefined;
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      }

      const report = await ReportingService.getTimeToFirstTouchReport(dateRange);
      
      res.json({
        success: true,
        data: {
          ...report,
          dateRange,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error getting time-to-first-touch report:', error);
      throw new AppError('Failed to generate time-to-first-touch report', 500);
    }
  }

  /**
   * Get SLA compliance report
   */
  static async getSLAComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, slaHours } = req.query;
      
      let dateRange: DateRange | undefined;
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      }

      const slaHoursNum = slaHours ? parseInt(slaHours as string) : 24;
      const report = await ReportingService.getSLAComplianceReport(slaHoursNum, dateRange);
      
      res.json({
        success: true,
        data: {
          ...report,
          slaHours: slaHoursNum,
          dateRange,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error getting SLA compliance report:', error);
      throw new AppError('Failed to generate SLA compliance report', 500);
    }
  }

  /**
   * Get source effectiveness report
   */
  static async getSourceEffectivenessReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      let dateRange: DateRange | undefined;
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      }

      const report = await ReportingService.getSourceEffectivenessReport(dateRange);
      
      res.json({
        success: true,
        data: {
          sources: report,
          dateRange,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error getting source effectiveness report:', error);
      throw new AppError('Failed to generate source effectiveness report', 500);
    }
  }

  /**
   * Get sales representative performance report
   */
  static async getSalesRepPerformanceReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, assigneeId } = req.query;
      
      let dateRange: DateRange | undefined;
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      }

      const report = await ReportingService.getSalesRepPerformanceReport(dateRange);
      
      // Filter by specific assignee if requested
      const filteredReport = assigneeId ? 
        report.filter(rep => rep.assigneeId === assigneeId) : 
        report;
      
      res.json({
        success: true,
        data: {
          representatives: filteredReport,
          dateRange,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error getting sales rep performance report:', error);
      throw new AppError('Failed to generate sales representative performance report', 500);
    }
  }

  /**
   * Get data quality report
   */
  static async getDataQualityReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      let dateRange: DateRange | undefined;
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      }

      const report = await ReportingService.getDataQualityReport(dateRange);
      
      res.json({
        success: true,
        data: {
          ...report,
          dateRange,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error getting data quality report:', error);
      throw new AppError('Failed to generate data quality report', 500);
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, slaHours } = req.query;
      
      let dateRange: DateRange | undefined;
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      }

      const slaHoursNum = slaHours ? parseInt(slaHours as string) : 24;

      // Fetch all reports in parallel
      const [
        funnelMetrics,
        timeToFirstTouch,
        slaCompliance,
        sourceEffectiveness,
        salesRepPerformance,
        dataQuality
      ] = await Promise.all([
        ReportingService.getFunnelMetrics(dateRange),
        ReportingService.getTimeToFirstTouchReport(dateRange),
        ReportingService.getSLAComplianceReport(slaHoursNum, dateRange),
        ReportingService.getSourceEffectivenessReport(dateRange),
        ReportingService.getSalesRepPerformanceReport(dateRange),
        ReportingService.getDataQualityReport(dateRange)
      ]);

      res.json({
        success: true,
        data: {
          funnelMetrics,
          timeToFirstTouch,
          slaCompliance,
          sourceEffectiveness,
          salesRepPerformance,
          dataQuality,
          dateRange,
          slaHours: slaHoursNum,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw new AppError('Failed to generate dashboard data', 500);
    }
  }

  /**
   * Export report data as CSV
   */
  static async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportType, startDate, endDate, format = 'json' } = req.query;
      
      if (!reportType) {
        throw new AppError('Report type is required', 400);
      }

      let dateRange: DateRange | undefined;
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      }

      let reportData: any;
      let filename: string;

      switch (reportType) {
        case 'funnel':
          reportData = await ReportingService.getFunnelMetrics(dateRange);
          filename = 'funnel-metrics';
          break;
        case 'time-to-first-touch':
          reportData = await ReportingService.getTimeToFirstTouchReport(dateRange);
          filename = 'time-to-first-touch';
          break;
        case 'sla-compliance':
          const slaHours = req.query.slaHours ? parseInt(req.query.slaHours as string) : 24;
          reportData = await ReportingService.getSLAComplianceReport(slaHours, dateRange);
          filename = 'sla-compliance';
          break;
        case 'source-effectiveness':
          reportData = await ReportingService.getSourceEffectivenessReport(dateRange);
          filename = 'source-effectiveness';
          break;
        case 'sales-performance':
          reportData = await ReportingService.getSalesRepPerformanceReport(dateRange);
          filename = 'sales-performance';
          break;
        case 'data-quality':
          reportData = await ReportingService.getDataQualityReport(dateRange);
          filename = 'data-quality';
          break;
        default:
          throw new AppError('Invalid report type', 400);
      }

      if (format === 'csv') {
        // Convert to CSV format
        const csv = convertToCSV(reportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
      } else {
        // Return JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.json"`);
        res.json({
          success: true,
          data: reportData,
          dateRange,
          generatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      throw new AppError('Failed to export report', 500);
    }
  }
}

/**
 * Helper function to convert data to CSV format
 */
function convertToCSV(data: any): string {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return '';
  }

  // Handle different data structures
  let rows: any[] = [];
  
  if (Array.isArray(data)) {
    rows = data;
  } else if (typeof data === 'object') {
    // For complex objects, flatten them
    rows = [data];
  }

  if (rows.length === 0) {
    return '';
  }

  // Get headers from the first row
  const headers = Object.keys(flattenObject(rows[0]));
  
  // Create CSV content
  const csvRows = [
    headers.join(','), // Header row
    ...rows.map(row => {
      const flatRow = flattenObject(row);
      return headers.map(header => {
        const value = flatRow[header];
        // Escape commas and quotes in values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',');
    })
  ];

  return csvRows.join('\n');
}

/**
 * Helper function to flatten nested objects for CSV export
 */
function flattenObject(obj: any, prefix: string = ''): any {
  const flattened: any = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        flattened[newKey] = value.join('; ');
      } else {
        flattened[newKey] = value;
      }
    }
  }
  
  return flattened;
}