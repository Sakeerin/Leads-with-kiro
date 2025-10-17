import { Request, Response } from 'express';
import { ImportService } from '../services/importService';
import { ExportService } from '../services/exportService';
import { ScheduledReportService } from '../services/scheduledReportService';
import { 
  ImportFileType, 
  ExportType, 
  ExportFileFormat,
  ReportType
} from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';
import * as fs from 'fs';

export class ImportExportController {
  /**
   * Upload and validate import file
   */
  static async validateImportFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded'
          }
        });
        return;
      }

      const { fieldMapping } = req.body;
      let parsedFieldMapping;

      if (fieldMapping) {
        try {
          parsedFieldMapping = JSON.parse(fieldMapping);
        } catch (error) {
          res.status(400).json({
            error: {
              code: 'INVALID_FIELD_MAPPING',
              message: 'Invalid field mapping JSON'
            }
          });
          return;
        }
      }

      const validation = await ImportService.validateImportFile(req.file, parsedFieldMapping);

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      console.error('Error validating import file:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to validate import file'
          }
        });
      }
    }
  }

  /**
   * Import leads from file
   */
  static async importLeads(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded'
          }
        });
        return;
      }

      const { 
        fieldMapping, 
        skipDuplicates = false, 
        updateExisting = false, 
        validateOnly = false 
      } = req.body;

      let parsedFieldMapping;
      if (fieldMapping) {
        try {
          parsedFieldMapping = JSON.parse(fieldMapping);
        } catch (error) {
          res.status(400).json({
            error: {
              code: 'INVALID_FIELD_MAPPING',
              message: 'Invalid field mapping JSON'
            }
          });
          return;
        }
      }

      const importRequest = {
        file: req.file,
        fieldMapping: parsedFieldMapping,
        skipDuplicates: skipDuplicates === 'true',
        updateExisting: updateExisting === 'true',
        validateOnly: validateOnly === 'true'
      };

      const result = await ImportService.importLeads(
        importRequest,
        req.user!.id,
        { batchSize: 100 }
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error importing leads:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to import leads'
          }
        });
      }
    }
  }

  /**
   * Get import progress
   */
  static async getImportProgress(req: Request, res: Response): Promise<void> {
    try {
      const { importId } = req.params;
      
      const progress = await ImportService.getImportProgress(importId);

      res.json({
        success: true,
        data: progress
      });

    } catch (error) {
      console.error('Error getting import progress:', error);
      
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get import progress'
          }
        });
      }
    }
  }

  /**
   * Get import history
   */
  static async getImportHistory(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 20 } = req.query;
      const importedBy = req.user!.role === 'admin' ? undefined : req.user!.id;

      const history = await ImportService.getImportHistory(
        importedBy,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('Error getting import history:', error);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get import history'
        }
      });
    }
  }

  /**
   * Get import details
   */
  static async getImportDetails(req: Request, res: Response): Promise<void> {
    try {
      const { importId } = req.params;
      
      const details = await ImportService.getImportDetails(importId);

      res.json({
        success: true,
        data: details
      });

    } catch (error) {
      console.error('Error getting import details:', error);
      
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get import details'
          }
        });
      }
    }
  }

  /**
   * Rollback import
   */
  static async rollbackImport(req: Request, res: Response): Promise<void> {
    try {
      const { importId } = req.params;
      
      await ImportService.rollbackImport(importId, req.user!.id);

      res.json({
        success: true,
        message: 'Import rolled back successfully'
      });

    } catch (error) {
      console.error('Error rolling back import:', error);
      
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to rollback import'
          }
        });
      }
    }
  }

  /**
   * Export leads
   */
  static async exportLeads(req: Request, res: Response): Promise<void> {
    try {
      const { 
        fileFormat = ExportFileFormat.CSV,
        filters = {},
        columns,
        includeHeaders = true
      } = req.body;

      // Validate file format
      if (!Object.values(ExportFileFormat).includes(fileFormat)) {
        res.status(400).json({
          error: {
            code: 'INVALID_FORMAT',
            message: 'Invalid file format'
          }
        });
        return;
      }

      const exportRequest = {
        exportType: ExportType.LEADS,
        fileFormat,
        filters,
        columns
      };

      const result = await ExportService.exportLeads(
        exportRequest,
        req.user!.id,
        { includeHeaders: includeHeaders === 'true' }
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error exporting leads:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to export leads'
          }
        });
      }
    }
  }

  /**
   * Export reports
   */
  static async exportReports(req: Request, res: Response): Promise<void> {
    try {
      const { 
        fileFormat = ExportFileFormat.CSV,
        filters = {},
        columns,
        includeHeaders = true
      } = req.body;

      const exportRequest = {
        exportType: ExportType.REPORTS,
        fileFormat,
        filters,
        columns
      };

      const result = await ExportService.exportReports(
        exportRequest,
        req.user!.id,
        { includeHeaders: includeHeaders === 'true' }
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error exporting reports:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to export reports'
          }
        });
      }
    }
  }

  /**
   * Export analytics
   */
  static async exportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { 
        fileFormat = ExportFileFormat.CSV,
        filters = {},
        columns,
        includeHeaders = true
      } = req.body;

      const exportRequest = {
        exportType: ExportType.ANALYTICS,
        fileFormat,
        filters,
        columns
      };

      const result = await ExportService.exportAnalytics(
        exportRequest,
        req.user!.id,
        { includeHeaders: includeHeaders === 'true' }
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error exporting analytics:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to export analytics'
          }
        });
      }
    }
  }

  /**
   * Download export file
   */
  static async downloadExport(req: Request, res: Response): Promise<void> {
    try {
      const { exportId } = req.params;
      
      const exportFile = await ExportService.getExportFile(exportId);

      res.setHeader('Content-Type', exportFile.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportFile.filename}"`);
      
      const fileStream = fs.createReadStream(exportFile.filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error downloading export:', error);
      
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to download export file'
          }
        });
      }
    }
  }

  /**
   * Get export history
   */
  static async getExportHistory(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 20 } = req.query;
      const exportedBy = req.user!.role === 'admin' ? undefined : req.user!.id;

      const history = await ExportService.getExportHistory(
        exportedBy,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('Error getting export history:', error);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get export history'
        }
      });
    }
  }

  /**
   * Create scheduled report
   */
  static async createScheduledReport(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        description,
        reportType,
        fileFormat,
        filters,
        columns,
        cronSchedule,
        emailRecipients,
        emailSubject,
        emailBody
      } = req.body;

      // Validate required fields
      if (!name || !reportType || !fileFormat || !cronSchedule || !emailRecipients) {
        res.status(400).json({
          error: {
            code: 'MISSING_FIELDS',
            message: 'Missing required fields: name, reportType, fileFormat, cronSchedule, emailRecipients'
          }
        });
        return;
      }

      const request = {
        name,
        description,
        reportType,
        fileFormat,
        filters,
        columns,
        cronSchedule,
        emailRecipients,
        emailSubject,
        emailBody,
        createdBy: req.user!.id
      };

      const scheduledReport = await ScheduledReportService.createScheduledReport(request);

      res.status(201).json({
        success: true,
        data: scheduledReport
      });

    } catch (error) {
      console.error('Error creating scheduled report:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create scheduled report'
          }
        });
      }
    }
  }

  /**
   * Get scheduled reports
   */
  static async getScheduledReports(req: Request, res: Response): Promise<void> {
    try {
      const createdBy = req.user!.role === 'admin' ? undefined : req.user!.id;
      
      const reports = await ScheduledReportService.getScheduledReports(createdBy);

      res.json({
        success: true,
        data: reports
      });

    } catch (error) {
      console.error('Error getting scheduled reports:', error);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get scheduled reports'
        }
      });
    }
  }

  /**
   * Get scheduled report by ID
   */
  static async getScheduledReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      
      const report = await ScheduledReportService.getScheduledReport(reportId);

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Error getting scheduled report:', error);
      
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get scheduled report'
          }
        });
      }
    }
  }

  /**
   * Update scheduled report
   */
  static async updateScheduledReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const updateData = req.body;

      const report = await ScheduledReportService.updateScheduledReport(reportId, updateData);

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('Error updating scheduled report:', error);
      
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      } else if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update scheduled report'
          }
        });
      }
    }
  }

  /**
   * Delete scheduled report
   */
  static async deleteScheduledReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      
      await ScheduledReportService.deleteScheduledReport(reportId);

      res.json({
        success: true,
        message: 'Scheduled report deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting scheduled report:', error);
      
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete scheduled report'
          }
        });
      }
    }
  }

  /**
   * Execute scheduled report manually
   */
  static async executeScheduledReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      
      const execution = await ScheduledReportService.executeReportManually(reportId);

      res.json({
        success: true,
        data: execution
      });

    } catch (error) {
      console.error('Error executing scheduled report:', error);
      
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to execute scheduled report'
          }
        });
      }
    }
  }
}