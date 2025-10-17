import { BaseModel } from './BaseModel';
import { ScheduledReport as ScheduledReportType, ScheduledReportTable, ReportType, ExportFileFormat } from '../types';

export class ScheduledReport extends BaseModel {
  protected static override tableName = 'scheduled_reports';

  static async findActive(): Promise<ScheduledReportTable[]> {
    return this.query.where('is_active', true).orderBy('next_run_at', 'asc');
  }

  static async findByCreatedBy(createdBy: string): Promise<ScheduledReportTable[]> {
    return this.query.where('created_by', createdBy).orderBy('created_at', 'desc');
  }

  static async findDue(currentTime: Date = new Date()): Promise<ScheduledReportTable[]> {
    return this.query
      .where('is_active', true)
      .where('next_run_at', '<=', currentTime)
      .orderBy('next_run_at', 'asc');
  }

  static async createScheduledReport(data: {
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
    nextRunAt: Date;
    createdBy: string;
  }): Promise<ScheduledReportTable> {
    const reportData: Partial<ScheduledReportTable> = {
      name: data.name,
      description: data.description,
      report_type: data.reportType,
      file_format: data.fileFormat,
      filters: data.filters ? JSON.stringify(data.filters) : null,
      columns: data.columns ? JSON.stringify(data.columns) : null,
      cron_schedule: data.cronSchedule,
      email_recipients: JSON.stringify(data.emailRecipients),
      email_subject: data.emailSubject,
      email_body: data.emailBody,
      is_active: true,
      next_run_at: data.nextRunAt,
      created_by: data.createdBy
    };

    return this.create(reportData);
  }

  static async updateScheduledReport(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      reportType: ReportType;
      fileFormat: ExportFileFormat;
      filters: Record<string, any>;
      columns: string[];
      cronSchedule: string;
      emailRecipients: string[];
      emailSubject: string;
      emailBody: string;
      isActive: boolean;
      nextRunAt: Date;
    }>
  ): Promise<ScheduledReportTable> {
    const updateData: Partial<ScheduledReportTable> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.reportType !== undefined) updateData.report_type = data.reportType;
    if (data.fileFormat !== undefined) updateData.file_format = data.fileFormat;
    if (data.filters !== undefined) updateData.filters = JSON.stringify(data.filters);
    if (data.columns !== undefined) updateData.columns = JSON.stringify(data.columns);
    if (data.cronSchedule !== undefined) updateData.cron_schedule = data.cronSchedule;
    if (data.emailRecipients !== undefined) updateData.email_recipients = JSON.stringify(data.emailRecipients);
    if (data.emailSubject !== undefined) updateData.email_subject = data.emailSubject;
    if (data.emailBody !== undefined) updateData.email_body = data.emailBody;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.nextRunAt !== undefined) updateData.next_run_at = data.nextRunAt;

    return this.update(id, updateData);
  }

  static async updateLastRun(id: string, lastRunAt: Date, nextRunAt: Date): Promise<ScheduledReportTable> {
    return this.update(id, {
      last_run_at: lastRunAt,
      next_run_at: nextRunAt
    });
  }

  static async deactivateReport(id: string): Promise<ScheduledReportTable> {
    return this.update(id, { is_active: false });
  }

  static async activateReport(id: string, nextRunAt: Date): Promise<ScheduledReportTable> {
    return this.update(id, {
      is_active: true,
      next_run_at: nextRunAt
    });
  }

  static async getScheduledReportStatistics(): Promise<{
    totalReports: number;
    activeReports: number;
    inactiveReports: number;
    reportsByType: Record<string, number>;
    upcomingRuns: number;
  }> {
    const [total, byActive, byType, upcoming] = await Promise.all([
      this.query.count('* as count').first(),
      this.query.select('is_active').count('* as count').groupBy('is_active'),
      this.query.select('report_type').count('* as count').groupBy('report_type'),
      this.query
        .where('is_active', true)
        .where('next_run_at', '<=', new Date(Date.now() + 24 * 60 * 60 * 1000))
        .count('* as count')
        .first()
    ]);

    const activeStats: Record<string, number> = {};
    byActive.forEach((row: any) => {
      activeStats[row.is_active ? 'active' : 'inactive'] = parseInt(row.count);
    });

    const typeStats: Record<string, number> = {};
    byType.forEach((row: any) => {
      typeStats[row.report_type] = parseInt(row.count);
    });

    return {
      totalReports: parseInt(total?.['count'] as string) || 0,
      activeReports: activeStats['active'] || 0,
      inactiveReports: activeStats['inactive'] || 0,
      reportsByType: typeStats,
      upcomingRuns: parseInt(upcoming?.['count'] as string) || 0
    };
  }

  static transformToScheduledReportType(dbReport: ScheduledReportTable): ScheduledReportType {
    return {
      id: dbReport.id,
      name: dbReport.name,
      description: dbReport.description,
      reportType: dbReport.report_type,
      fileFormat: dbReport.file_format,
      filters: dbReport.filters ? JSON.parse(dbReport.filters) : undefined,
      columns: dbReport.columns ? JSON.parse(dbReport.columns) : undefined,
      cronSchedule: dbReport.cron_schedule,
      emailRecipients: JSON.parse(dbReport.email_recipients),
      emailSubject: dbReport.email_subject,
      emailBody: dbReport.email_body,
      isActive: dbReport.is_active,
      lastRunAt: dbReport.last_run_at,
      nextRunAt: dbReport.next_run_at,
      createdBy: dbReport.created_by,
      createdAt: dbReport.created_at,
      updatedAt: dbReport.updated_at
    };
  }
}