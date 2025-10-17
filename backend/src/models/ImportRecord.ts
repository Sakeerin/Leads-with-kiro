import { BaseModel } from './BaseModel';
import { ImportRecord as ImportRecordType, ImportRecordTable, ImportRecordStatus } from '../types';

export class ImportRecord extends BaseModel {
  protected static override tableName = 'import_records';

  static async findByImportId(importId: string): Promise<ImportRecordTable[]> {
    return this.query.where('import_id', importId).orderBy('row_number', 'asc');
  }

  static async findByStatus(importId: string, status: ImportRecordStatus): Promise<ImportRecordTable[]> {
    return this.query
      .where('import_id', importId)
      .where('status', status)
      .orderBy('row_number', 'asc');
  }

  static async findByLeadId(leadId: string): Promise<ImportRecordTable[]> {
    return this.query.where('lead_id', leadId).orderBy('created_at', 'desc');
  }

  static async createRecord(data: {
    importId: string;
    rowNumber: number;
    leadId?: string;
    status: ImportRecordStatus;
    originalData: Record<string, any>;
    processedData?: Record<string, any>;
    validationErrors?: string[];
    duplicateMatches?: any[];
  }): Promise<ImportRecordTable> {
    const recordData: Partial<ImportRecordTable> = {
      import_id: data.importId,
      row_number: data.rowNumber,
      lead_id: data.leadId,
      status: data.status,
      original_data: JSON.stringify(data.originalData),
      processed_data: data.processedData ? JSON.stringify(data.processedData) : null,
      validation_errors: data.validationErrors ? JSON.stringify(data.validationErrors) : null,
      duplicate_matches: data.duplicateMatches ? JSON.stringify(data.duplicateMatches) : null
    };

    return this.create(recordData);
  }

  static async updateRecordStatus(
    id: string,
    status: ImportRecordStatus,
    leadId?: string,
    processedData?: Record<string, any>
  ): Promise<ImportRecordTable> {
    const updateData: Partial<ImportRecordTable> = {
      status,
      ...(leadId && { lead_id: leadId }),
      ...(processedData && { processed_data: JSON.stringify(processedData) })
    };

    return this.update(id, updateData);
  }

  static async getRecordsByImportWithPagination(
    importId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    records: ImportRecordTable[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const offset = (page - 1) * limit;

    const [records, totalResult] = await Promise.all([
      this.query
        .where('import_id', importId)
        .orderBy('row_number', 'asc')
        .offset(offset)
        .limit(limit),
      this.query
        .where('import_id', importId)
        .count('* as count')
        .first()
    ]);

    const total = parseInt(totalResult?.['count'] as string) || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  static async getImportSummary(importId: string): Promise<{
    total: number;
    byStatus: Record<ImportRecordStatus, number>;
    errorSummary: Array<{ error: string; count: number }>;
  }> {
    const [total, byStatus, records] = await Promise.all([
      this.query.where('import_id', importId).count('* as count').first(),
      this.query
        .where('import_id', importId)
        .select('status')
        .count('* as count')
        .groupBy('status'),
      this.query
        .where('import_id', importId)
        .whereNotNull('validation_errors')
        .select('validation_errors')
    ]);

    const statusStats: Record<ImportRecordStatus, number> = {
      [ImportRecordStatus.SUCCESS]: 0,
      [ImportRecordStatus.FAILED]: 0,
      [ImportRecordStatus.DUPLICATE]: 0,
      [ImportRecordStatus.SKIPPED]: 0
    };

    byStatus.forEach((row: any) => {
      statusStats[row.status as ImportRecordStatus] = parseInt(row.count);
    });

    // Aggregate error messages
    const errorCounts: Record<string, number> = {};
    records.forEach((record: any) => {
      if (record.validation_errors) {
        const errors = JSON.parse(record.validation_errors);
        errors.forEach((error: string) => {
          errorCounts[error] = (errorCounts[error] || 0) + 1;
        });
      }
    });

    const errorSummary = Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: parseInt(total?.['count'] as string) || 0,
      byStatus: statusStats,
      errorSummary
    };
  }

  static async deleteRecordsByImportId(importId: string): Promise<number> {
    return this.query.where('import_id', importId).del();
  }

  static transformToImportRecordType(dbRecord: ImportRecordTable): ImportRecordType {
    return {
      id: dbRecord.id,
      importId: dbRecord.import_id,
      rowNumber: dbRecord.row_number,
      leadId: dbRecord.lead_id,
      status: dbRecord.status,
      originalData: JSON.parse(dbRecord.original_data),
      processedData: dbRecord.processed_data ? JSON.parse(dbRecord.processed_data) : undefined,
      validationErrors: dbRecord.validation_errors ? JSON.parse(dbRecord.validation_errors) : undefined,
      duplicateMatches: dbRecord.duplicate_matches ? JSON.parse(dbRecord.duplicate_matches) : undefined,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at
    };
  }
}