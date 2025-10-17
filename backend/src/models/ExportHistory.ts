import { BaseModel } from './BaseModel';
import { ExportHistory as ExportHistoryType, ExportHistoryTable, ExportStatus, ExportType, ExportFileFormat } from '../types';

export class ExportHistory extends BaseModel {
  protected static override tableName = 'export_history';

  static async findByExportedBy(exportedBy: string): Promise<ExportHistoryTable[]> {
    return this.query.where('exported_by', exportedBy).orderBy('started_at', 'desc');
  }

  static async findByType(exportType: ExportType): Promise<ExportHistoryTable[]> {
    return this.query.where('export_type', exportType).orderBy('started_at', 'desc');
  }

  static async findByStatus(status: ExportStatus): Promise<ExportHistoryTable[]> {
    return this.query.where('status', status).orderBy('started_at', 'desc');
  }

  static async findRecent(limit: number = 10): Promise<ExportHistoryTable[]> {
    return this.query.orderBy('started_at', 'desc').limit(limit);
  }

  static async createExport(data: {
    filename: string;
    exportType: ExportType;
    fileFormat: ExportFileFormat;
    recordCount: number;
    filtersApplied?: Record<string, any>;
    columnsExported?: string[];
    exportedBy: string;
  }): Promise<ExportHistoryTable> {
    const exportData: Partial<ExportHistoryTable> = {
      filename: data.filename,
      export_type: data.exportType,
      file_format: data.fileFormat,
      record_count: data.recordCount,
      filters_applied: data.filtersApplied ? JSON.stringify(data.filtersApplied) : null,
      columns_exported: data.columnsExported ? JSON.stringify(data.columnsExported) : null,
      status: ExportStatus.PROCESSING,
      exported_by: data.exportedBy,
      started_at: new Date()
    };

    return this.create(exportData);
  }

  static async updateExportStatus(
    id: string,
    status: ExportStatus,
    results?: {
      filePath?: string;
      fileSize?: number;
      errorMessage?: string;
    }
  ): Promise<ExportHistoryTable> {
    const updateData: Partial<ExportHistoryTable> = {
      status,
      ...(status === ExportStatus.COMPLETED || status === ExportStatus.FAILED) && {
        completed_at: new Date()
      },
      ...(results && {
        ...(results.filePath && { file_path: results.filePath }),
        ...(results.fileSize && { file_size: results.fileSize }),
        ...(results.errorMessage && { error_message: results.errorMessage })
      })
    };

    return this.update(id, updateData);
  }

  static async getExportStatistics(): Promise<{
    totalExports: number;
    successfulExports: number;
    failedExports: number;
    totalRecordsExported: number;
    exportsByType: Record<string, number>;
    recentExports: number;
  }> {
    const [total, byStatus, byType, recordStats, recent] = await Promise.all([
      this.query.count('* as count').first(),
      this.query.select('status').count('* as count').groupBy('status'),
      this.query.select('export_type').count('* as count').groupBy('export_type'),
      this.query.select()
        .sum('record_count as total_exported')
        .where('status', ExportStatus.COMPLETED)
        .first(),
      this.query
        .where('started_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000))
        .count('* as count')
        .first()
    ]);

    const statusStats: Record<string, number> = {};
    byStatus.forEach((row: any) => {
      statusStats[row.status] = parseInt(row.count);
    });

    const typeStats: Record<string, number> = {};
    byType.forEach((row: any) => {
      typeStats[row.export_type] = parseInt(row.count);
    });

    return {
      totalExports: parseInt(total?.['count'] as string) || 0,
      successfulExports: statusStats[ExportStatus.COMPLETED] || 0,
      failedExports: statusStats[ExportStatus.FAILED] || 0,
      totalRecordsExported: parseInt(recordStats?.['total_exported'] as string) || 0,
      exportsByType: typeStats,
      recentExports: parseInt(recent?.['count'] as string) || 0
    };
  }

  static async cleanupOldExports(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    return this.query
      .where('created_at', '<', cutoffDate)
      .where('status', ExportStatus.COMPLETED)
      .del();
  }

  static transformToExportHistoryType(dbExport: ExportHistoryTable): ExportHistoryType {
    return {
      id: dbExport.id,
      filename: dbExport.filename,
      exportType: dbExport.export_type,
      fileFormat: dbExport.file_format,
      recordCount: dbExport.record_count,
      filtersApplied: dbExport.filters_applied ? JSON.parse(dbExport.filters_applied) : undefined,
      columnsExported: dbExport.columns_exported ? JSON.parse(dbExport.columns_exported) : undefined,
      filePath: dbExport.file_path,
      fileSize: dbExport.file_size,
      status: dbExport.status,
      errorMessage: dbExport.error_message,
      exportedBy: dbExport.exported_by,
      startedAt: dbExport.started_at,
      completedAt: dbExport.completed_at,
      createdAt: dbExport.created_at,
      updatedAt: dbExport.updated_at
    };
  }
}