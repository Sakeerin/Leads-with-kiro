import { BaseModel } from './BaseModel';
import { ImportHistory as ImportHistoryType, ImportHistoryTable, ImportStatus, ImportFileType } from '../types';

export class ImportHistory extends BaseModel {
  protected static override tableName = 'import_history';

  static async findByImportedBy(importedBy: string): Promise<ImportHistoryTable[]> {
    return this.query.where('imported_by', importedBy).orderBy('started_at', 'desc');
  }

  static async findByStatus(status: ImportStatus): Promise<ImportHistoryTable[]> {
    return this.query.where('status', status).orderBy('started_at', 'desc');
  }

  static async findRecent(limit: number = 10): Promise<ImportHistoryTable[]> {
    return this.query.orderBy('started_at', 'desc').limit(limit);
  }

  static async createImport(data: {
    filename: string;
    originalFilename: string;
    fileType: ImportFileType;
    totalRecords: number;
    fieldMapping?: Record<string, string>;
    importedBy: string;
  }): Promise<ImportHistoryTable> {
    const importData: Partial<ImportHistoryTable> = {
      filename: data.filename,
      original_filename: data.originalFilename,
      file_type: data.fileType,
      total_records: data.totalRecords,
      successful_records: 0,
      failed_records: 0,
      duplicate_records: 0,
      status: ImportStatus.PROCESSING,
      field_mapping: data.fieldMapping ? JSON.stringify(data.fieldMapping) : null,
      imported_by: data.importedBy,
      started_at: new Date()
    };

    return this.create(importData);
  }

  static async updateImportStatus(
    id: string,
    status: ImportStatus,
    results?: {
      successfulRecords?: number;
      failedRecords?: number;
      duplicateRecords?: number;
      validationErrors?: any[];
      duplicateReport?: any;
    }
  ): Promise<ImportHistoryTable> {
    const updateData: Partial<ImportHistoryTable> = {
      status,
      ...(status === ImportStatus.COMPLETED || status === ImportStatus.FAILED) && {
        completed_at: new Date()
      },
      ...(results && {
        successful_records: results.successfulRecords || 0,
        failed_records: results.failedRecords || 0,
        duplicate_records: results.duplicateRecords || 0,
        ...(results.validationErrors && {
          validation_errors: JSON.stringify(results.validationErrors)
        }),
        ...(results.duplicateReport && {
          duplicate_report: JSON.stringify(results.duplicateReport)
        })
      })
    };

    return this.update(id, updateData);
  }

  static async markAsRolledBack(id: string, rolledBackBy: string): Promise<ImportHistoryTable> {
    return this.update(id, {
      status: ImportStatus.ROLLED_BACK,
      rolled_back_by: rolledBackBy,
      rolled_back_at: new Date()
    });
  }

  static async getImportStatistics(): Promise<{
    totalImports: number;
    successfulImports: number;
    failedImports: number;
    totalRecordsProcessed: number;
    totalRecordsSuccessful: number;
    recentImports: number;
  }> {
    const [total, byStatus, recordStats, recent] = await Promise.all([
      this.query.count('* as count').first(),
      this.query.select('status').count('* as count').groupBy('status'),
      this.query.select()
        .sum('total_records as total_processed')
        .sum('successful_records as total_successful')
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

    return {
      totalImports: parseInt(total?.['count'] as string) || 0,
      successfulImports: statusStats[ImportStatus.COMPLETED] || 0,
      failedImports: statusStats[ImportStatus.FAILED] || 0,
      totalRecordsProcessed: parseInt(recordStats?.['total_processed'] as string) || 0,
      totalRecordsSuccessful: parseInt(recordStats?.['total_successful'] as string) || 0,
      recentImports: parseInt(recent?.['count'] as string) || 0
    };
  }

  static transformToImportHistoryType(dbImport: ImportHistoryTable): ImportHistoryType {
    return {
      id: dbImport.id,
      filename: dbImport.filename,
      originalFilename: dbImport.original_filename,
      fileType: dbImport.file_type,
      totalRecords: dbImport.total_records,
      successfulRecords: dbImport.successful_records,
      failedRecords: dbImport.failed_records,
      duplicateRecords: dbImport.duplicate_records,
      status: dbImport.status,
      validationErrors: dbImport.validation_errors ? JSON.parse(dbImport.validation_errors) : undefined,
      duplicateReport: dbImport.duplicate_report ? JSON.parse(dbImport.duplicate_report) : undefined,
      fieldMapping: dbImport.field_mapping ? JSON.parse(dbImport.field_mapping) : undefined,
      importedBy: dbImport.imported_by,
      rolledBackBy: dbImport.rolled_back_by,
      startedAt: dbImport.started_at,
      completedAt: dbImport.completed_at,
      rolledBackAt: dbImport.rolled_back_at,
      createdAt: dbImport.created_at,
      updatedAt: dbImport.updated_at
    };
  }
}