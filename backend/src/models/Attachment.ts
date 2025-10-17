import { BaseModel } from './BaseModel';
import { AttachmentTable } from '../types';

export class Attachment extends BaseModel {
  protected static override tableName = 'attachments';

  static async findByLeadId(leadId: string): Promise<AttachmentTable[]> {
    return this.query
      .where('lead_id', leadId)
      .where('is_active', true)
      .orderBy('created_at', 'desc');
  }

  static async findByUploadedBy(uploadedBy: string): Promise<AttachmentTable[]> {
    return this.query
      .where('uploaded_by', uploadedBy)
      .where('is_active', true)
      .orderBy('created_at', 'desc');
  }

  static async findPendingVirusScan(): Promise<AttachmentTable[]> {
    return this.query
      .where('virus_scanned', false)
      .where('is_active', true)
      .orderBy('created_at', 'asc');
  }

  static async findByContentType(contentType: string): Promise<AttachmentTable[]> {
    return this.query
      .where('content_type', 'like', `${contentType}%`)
      .where('is_active', true)
      .orderBy('created_at', 'desc');
  }

  static async updateVirusScanResult(
    id: string, 
    isClean: boolean, 
    scanResult?: string
  ): Promise<AttachmentTable> {
    const [result] = await this.query
      .where('id', id)
      .update({
        virus_scanned: true,
        virus_clean: isClean,
        scan_result: scanResult,
        updated_at: new Date()
      })
      .returning('*');
    return result;
  }

  static async getTotalSizeByLead(leadId: string): Promise<number> {
    const result = await this.query
      .where('lead_id', leadId)
      .where('is_active', true)
      .sum('size as total_size')
      .first();
    
    return parseInt(result?.['total_size'] as string) || 0;
  }

  static async getTotalSizeByUser(uploadedBy: string): Promise<number> {
    const result = await this.query
      .where('uploaded_by', uploadedBy)
      .where('is_active', true)
      .sum('size as total_size')
      .first();
    
    return parseInt(result?.['total_size'] as string) || 0;
  }

  static async searchByFilename(
    filename: string, 
    leadId?: string
  ): Promise<AttachmentTable[]> {
    let query = this.query
      .where('is_active', true)
      .where(function() {
        this.where('filename', 'ilike', `%${filename}%`)
          .orWhere('original_filename', 'ilike', `%${filename}%`);
      });

    if (leadId) {
      query = query.where('lead_id', leadId);
    }

    return query.orderBy('created_at', 'desc');
  }

  static async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    virusScannedFiles: number;
    cleanFiles: number;
    infectedFiles: number;
  }> {
    const [stats] = await this.query
      .where('is_active', true)
      .select(
        this.db.raw('COUNT(*) as total_files'),
        this.db.raw('SUM(size) as total_size'),
        this.db.raw('COUNT(CASE WHEN virus_scanned = true THEN 1 END) as virus_scanned_files'),
        this.db.raw('COUNT(CASE WHEN virus_clean = true THEN 1 END) as clean_files'),
        this.db.raw('COUNT(CASE WHEN virus_clean = false THEN 1 END) as infected_files')
      );

    return {
      totalFiles: parseInt(stats.total_files) || 0,
      totalSize: parseInt(stats.total_size) || 0,
      virusScannedFiles: parseInt(stats.virus_scanned_files) || 0,
      cleanFiles: parseInt(stats.clean_files) || 0,
      infectedFiles: parseInt(stats.infected_files) || 0
    };
  }
}