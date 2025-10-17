import * as cron from 'node-cron';
import { ScheduledReport } from '../models/ScheduledReport';
import { ExportService } from './exportService';
import { EmailService } from './emailService';
import { 
  ScheduledReport as ScheduledReportType,
  ScheduledReportExecution,
  ReportType,
  ExportFileFormat,
  ExportType,
  ExecutionStatus
} from '../types';
import { ValidationError as AppValidationError, NotFoundError } from '../utils/errors';

export interface CreateScheduledReportRequest {
  name: string;
  description?: string;
  reportType: ReportType;
  fileFormat: ExportFileFormat;
  filters?: Record<string, any>;
  columns?: string[];
  cronSchedule: string;
  emailRecipients: string[];
  emailSubject?: string;
  emailBody?: string;
  createdBy: string;
}

export interface UpdateScheduledReportRequest {
  name?: string;
  description?: string;
  reportType?: ReportType;
  fileFormat?: ExportFileFormat;
  filters?: Record<string, any>;
  columns?: string[];
  cronSchedule?: string;
  emailRecipients?: string[];
  emailSubject?: string;
  emailBody?: string;
  isActive?: boolean;
}

export class ScheduledReportService {
  private static scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private static isInitialized = false;

  /**
   * Initialize the scheduled report service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing Scheduled Report Service...');

    // Load all active scheduled reports and start their cron jobs
    const activeReports = await ScheduledReport.findActive();
    
    for (const report of activeReports) {
      await this.scheduleReport(report.id, report.cron_schedule);
    }

    this.isInitialized = true;
    console.log(`Scheduled Report Service initialized with ${activeReports.length} active reports`);
  }

  /**
   * Create a new scheduled report
   */
  static async createScheduledReport(request: CreateScheduledReportRequest): Promise<ScheduledReportType> {
    // Validate cron schedule
    if (!cron.validate(request.cronSchedule)) {
      throw new AppValidationError('Invalid cron schedule format');
    }

    // Validate email recipients
    if (!request.emailRecipients || request.emailRecipients.length === 0) {
      throw new AppValidationError('At least one email recipient is required');
    }

    for (const email of request.emailRecipients) {
      if (!this.isValidEmail(email)) {
        throw new AppValidationError(`Invalid email address: ${email}`);
      }
    }

    // Calculate next run time
    const nextRunAt = this.getNextRunTime(request.cronSchedule);

    // Create the scheduled report
    const dbReport = await ScheduledReport.createScheduledReport({
      ...request,
      nextRunAt
    });

    // Start the cron job
    await this.scheduleReport(dbReport.id, request.cronSchedule);

    return ScheduledReport.transformToScheduledReportType(dbReport);
  }

  /**
   * Update a scheduled report
   */
  static async updateScheduledReport(
    reportId: string,
    request: UpdateScheduledReportRequest
  ): Promise<ScheduledReportType> {
    const existingReport = await ScheduledReport.findById(reportId);
    
    if (!existingReport) {
      throw new NotFoundError(`Scheduled report with ID ${reportId} not found`);
    }

    // Validate cron schedule if provided
    if (request.cronSchedule && !cron.validate(request.cronSchedule)) {
      throw new AppValidationError('Invalid cron schedule format');
    }

    // Validate email recipients if provided
    if (request.emailRecipients) {
      if (request.emailRecipients.length === 0) {
        throw new AppValidationError('At least one email recipient is required');
      }

      for (const email of request.emailRecipients) {
        if (!this.isValidEmail(email)) {
          throw new AppValidationError(`Invalid email address: ${email}`);
        }
      }
    }

    // Calculate next run time if schedule changed
    let nextRunAt: Date | undefined;
    if (request.cronSchedule) {
      nextRunAt = this.getNextRunTime(request.cronSchedule);
    }

    // Update the report
    const updateData = {
      ...request,
      ...(nextRunAt && { nextRunAt })
    };

    const dbReport = await ScheduledReport.updateScheduledReport(reportId, updateData);

    // Update cron job if schedule changed or report was activated/deactivated
    if (request.cronSchedule || request.isActive !== undefined) {
      await this.unscheduleReport(reportId);
      
      if (dbReport.is_active) {
        await this.scheduleReport(reportId, dbReport.cron_schedule);
      }
    }

    return ScheduledReport.transformToScheduledReportType(dbReport);
  }

  /**
   * Delete a scheduled report
   */
  static async deleteScheduledReport(reportId: string): Promise<void> {
    const existingReport = await ScheduledReport.findById(reportId);
    
    if (!existingReport) {
      throw new NotFoundError(`Scheduled report with ID ${reportId} not found`);
    }

    // Stop the cron job
    await this.unscheduleReport(reportId);

    // Delete the report
    await ScheduledReport.delete(reportId);
  }

  /**
   * Activate a scheduled report
   */
  static async activateReport(reportId: string): Promise<ScheduledReportType> {
    const existingReport = await ScheduledReport.findById(reportId);
    
    if (!existingReport) {
      throw new NotFoundError(`Scheduled report with ID ${reportId} not found`);
    }

    if (existingReport.is_active) {
      throw new AppValidationError('Report is already active');
    }

    const nextRunAt = this.getNextRunTime(existingReport.cron_schedule);
    const dbReport = await ScheduledReport.activateReport(reportId, nextRunAt);

    // Start the cron job
    await this.scheduleReport(reportId, existingReport.cron_schedule);

    return ScheduledReport.transformToScheduledReportType(dbReport);
  }

  /**
   * Deactivate a scheduled report
   */
  static async deactivateReport(reportId: string): Promise<ScheduledReportType> {
    const existingReport = await ScheduledReport.findById(reportId);
    
    if (!existingReport) {
      throw new NotFoundError(`Scheduled report with ID ${reportId} not found`);
    }

    if (!existingReport.is_active) {
      throw new AppValidationError('Report is already inactive');
    }

    // Stop the cron job
    await this.unscheduleReport(reportId);

    const dbReport = await ScheduledReport.deactivateReport(reportId);

    return ScheduledReport.transformToScheduledReportType(dbReport);
  }

  /**
   * Execute a scheduled report manually
   */
  static async executeReportManually(reportId: string): Promise<ScheduledReportExecution> {
    const report = await ScheduledReport.findById(reportId);
    
    if (!report) {
      throw new NotFoundError(`Scheduled report with ID ${reportId} not found`);
    }

    return this.executeReport(ScheduledReport.transformToScheduledReportType(report));
  }

  /**
   * Get scheduled reports
   */
  static async getScheduledReports(createdBy?: string): Promise<ScheduledReportType[]> {
    const dbReports = createdBy 
      ? await ScheduledReport.findByCreatedBy(createdBy)
      : await ScheduledReport.findAll();

    return dbReports.map(ScheduledReport.transformToScheduledReportType);
  }

  /**
   * Get scheduled report by ID
   */
  static async getScheduledReport(reportId: string): Promise<ScheduledReportType> {
    const dbReport = await ScheduledReport.findById(reportId);
    
    if (!dbReport) {
      throw new NotFoundError(`Scheduled report with ID ${reportId} not found`);
    }

    return ScheduledReport.transformToScheduledReportType(dbReport);
  }

  /**
   * Get scheduled report statistics
   */
  static async getScheduledReportStatistics(): Promise<any> {
    return ScheduledReport.getScheduledReportStatistics();
  }

  /**
   * Schedule a report using cron
   */
  private static async scheduleReport(reportId: string, cronSchedule: string): Promise<void> {
    // Stop existing job if any
    await this.unscheduleReport(reportId);

    // Create new cron job
    const task = cron.schedule(cronSchedule, async () => {
      try {
        console.log(`Executing scheduled report: ${reportId}`);
        
        const report = await ScheduledReport.findById(reportId);
        if (!report || !report.is_active) {
          console.log(`Scheduled report ${reportId} is no longer active, stopping job`);
          await this.unscheduleReport(reportId);
          return;
        }

        await this.executeReport(ScheduledReport.transformToScheduledReportType(report));
        
        // Update last run and next run times
        const nextRunAt = this.getNextRunTime(cronSchedule);
        await ScheduledReport.updateLastRun(reportId, new Date(), nextRunAt);
        
      } catch (error) {
        console.error(`Error executing scheduled report ${reportId}:`, error);
      }
    }, {
      scheduled: false // Don't start immediately
    });

    // Store the task
    this.scheduledJobs.set(reportId, task);
    
    // Start the task
    task.start();

    console.log(`Scheduled report ${reportId} with cron schedule: ${cronSchedule}`);
  }

  /**
   * Unschedule a report
   */
  private static async unscheduleReport(reportId: string): Promise<void> {
    const existingTask = this.scheduledJobs.get(reportId);
    
    if (existingTask) {
      existingTask.stop();
      existingTask.destroy();
      this.scheduledJobs.delete(reportId);
      console.log(`Unscheduled report: ${reportId}`);
    }
  }

  /**
   * Execute a report and send via email
   */
  private static async executeReport(report: ScheduledReportType): Promise<ScheduledReportExecution> {
    const execution: Partial<ScheduledReportExecution> = {
      scheduledReportId: report.id,
      status: ExecutionStatus.RUNNING,
      startedAt: new Date()
    };

    // Create execution record (you'll need to create this model)
    // const dbExecution = await ScheduledReportExecution.create(execution);

    try {
      // Determine export type based on report type
      let exportType: ExportType;
      switch (report.reportType) {
        case ReportType.LEADS:
          exportType = ExportType.LEADS;
          break;
        case ReportType.ANALYTICS:
          exportType = ExportType.ANALYTICS;
          break;
        case ReportType.PERFORMANCE:
          exportType = ExportType.REPORTS;
          break;
        default:
          exportType = ExportType.REPORTS;
      }

      // Generate the export
      const exportResult = await ExportService.exportLeads({
        exportType,
        fileFormat: report.fileFormat,
        filters: report.filters,
        columns: report.columns
      }, 'system');

      // Send email with attachment
      const emailSubject = report.emailSubject || `Scheduled Report: ${report.name}`;
      const emailBody = report.emailBody || `Please find attached the scheduled report: ${report.name}`;

      await EmailService.sendEmailWithAttachment({
        to: report.emailRecipients,
        subject: emailSubject,
        body: emailBody,
        attachments: [{
          filename: exportResult.filename,
          path: exportResult.filePath
        }]
      });

      // Update execution as completed
      execution.status = ExecutionStatus.COMPLETED;
      execution.completedAt = new Date();
      execution.filePath = exportResult.filePath;
      execution.recordCount = exportResult.recordCount;

      console.log(`Successfully executed scheduled report ${report.id} and sent to ${report.emailRecipients.length} recipients`);

    } catch (error) {
      console.error(`Failed to execute scheduled report ${report.id}:`, error);
      
      execution.status = ExecutionStatus.FAILED;
      execution.completedAt = new Date();
      execution.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    // Update execution record
    // await ScheduledReportExecution.update(dbExecution.id, execution);

    return execution as ScheduledReportExecution;
  }

  /**
   * Get next run time for cron schedule
   */
  private static getNextRunTime(cronSchedule: string): Date {
    // Simple implementation - in production, use a proper cron parser
    const now = new Date();
    
    // For demo purposes, just add 1 day
    // In production, use a library like 'cron-parser' to calculate the actual next run time
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return nextRun;
  }

  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Shutdown the service and stop all cron jobs
   */
  static async shutdown(): Promise<void> {
    console.log('Shutting down Scheduled Report Service...');
    
    for (const [reportId, task] of this.scheduledJobs) {
      task.stop();
      task.destroy();
      console.log(`Stopped scheduled report: ${reportId}`);
    }
    
    this.scheduledJobs.clear();
    this.isInitialized = false;
    
    console.log('Scheduled Report Service shutdown complete');
  }
}