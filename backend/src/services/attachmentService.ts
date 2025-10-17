import { Attachment } from '../models/Attachment';
import { FileStorageService } from './fileStorageService';
import { VirusScanService } from './virusScanService';
import { ActivityService } from './activityService';
import { 
  AttachmentTable, 
  AttachmentUploadRequest, 
  AttachmentDownloadRequest,
  ActivityType,
  UserRole
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface AttachmentPermissions {
  canView: boolean;
  canDownload: boolean;
  canDelete: boolean;
}

export class AttachmentService {
  private fileStorageService: FileStorageService;
  private virusScanService: VirusScanService;

  constructor(
    fileStorageService: FileStorageService,
    virusScanService: VirusScanService
  ) {
    this.fileStorageService = fileStorageService;
    this.virusScanService = virusScanService;
  }

  async uploadAttachment(
    request: AttachmentUploadRequest,
    uploadedBy: string
  ): Promise<AttachmentTable> {
    const { leadId, file, metadata } = request;

    // Validate file
    this.validateFile(file);

    // Upload to storage
    const uploadResult = await this.fileStorageService.uploadFile(
      file,
      leadId
    );

    // Create attachment record
    const attachmentData = {
      id: uuidv4(),
      lead_id: leadId,
      filename: this.generateUniqueFilename(file.originalname),
      original_filename: file.originalname,
      content_type: file.mimetype,
      size: file.size,
      storage_path: uploadResult.storagePath,
      storage_provider: 's3', // or from config
      bucket_name: uploadResult.bucketName,
      file_hash: uploadResult.fileHash,
      virus_scanned: false,
      virus_clean: null,
      scan_result: null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      uploaded_by: uploadedBy,
      uploaded_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true
    };

    const attachment = await Attachment.create(attachmentData);

    // Log activity
    await ActivityService.createActivity({
      leadId,
      type: ActivityType.FILE_UPLOADED,
      subject: `File uploaded: ${file.originalname}`,
      details: {
        filename: file.originalname,
        size: file.size,
        contentType: file.mimetype,
        attachmentId: attachment.id
      },
      performedBy: uploadedBy,
      performedAt: new Date()
    });

    // Schedule virus scan (async)
    this.scheduleVirusScan(attachment.id, file.buffer, file.originalname);

    return attachment;
  }

  async downloadAttachment(
    request: AttachmentDownloadRequest,
    userId: string,
    userRole: UserRole
  ): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
    contentLength: number;
    filename: string;
  }> {
    const attachment = await Attachment.findById(request.attachmentId);
    
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Check permissions
    const permissions = await this.checkPermissions(attachment, userId, userRole);
    if (!permissions.canDownload) {
      throw new Error('Insufficient permissions to download this file');
    }

    // Check virus scan status
    if (attachment.virus_scanned && attachment.virus_clean === false) {
      throw new Error('File failed virus scan and cannot be downloaded');
    }

    // Download from storage
    const downloadResult = await this.fileStorageService.downloadFile(
      attachment.storage_path,
      attachment.bucket_name
    );

    // Log activity
    await ActivityService.createActivity({
      leadId: attachment.lead_id,
      type: ActivityType.FILE_UPLOADED, // Would need FILE_DOWNLOADED activity type
      subject: `File downloaded: ${attachment.original_filename}`,
      details: {
        filename: attachment.original_filename,
        attachmentId: attachment.id,
        downloadType: request.inline ? 'preview' : 'download'
      },
      performedBy: userId,
      performedAt: new Date()
    });

    return downloadResult;
  }

  async deleteAttachment(
    attachmentId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    const attachment = await Attachment.findById(attachmentId);
    
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Check permissions
    const permissions = await this.checkPermissions(attachment, userId, userRole);
    if (!permissions.canDelete) {
      throw new Error('Insufficient permissions to delete this file');
    }

    // Soft delete attachment record
    await Attachment.softDelete(attachmentId);

    // Delete from storage (optional - could keep for audit)
    try {
      await this.fileStorageService.deleteFile(
        attachment.storage_path,
        attachment.bucket_name
      );
    } catch (error) {
      console.error('Failed to delete file from storage:', error);
      // Continue with soft delete even if storage deletion fails
    }

    // Log activity
    await ActivityService.createActivity({
      leadId: attachment.lead_id,
      type: ActivityType.FILE_UPLOADED, // Would need FILE_DELETED activity type
      subject: `File deleted: ${attachment.original_filename}`,
      details: {
        filename: attachment.original_filename,
        attachmentId: attachment.id
      },
      performedBy: userId,
      performedAt: new Date()
    });
  }

  async getAttachmentsByLead(
    leadId: string,
    userId: string,
    userRole: UserRole
  ): Promise<AttachmentTable[]> {
    const attachments = await Attachment.findByLeadId(leadId);
    
    // Filter based on permissions
    const filteredAttachments = [];
    for (const attachment of attachments) {
      const permissions = await this.checkPermissions(attachment, userId, userRole);
      if (permissions.canView) {
        filteredAttachments.push(attachment);
      }
    }

    return filteredAttachments;
  }

  async getAttachmentInfo(
    attachmentId: string,
    userId: string,
    userRole: UserRole
  ): Promise<AttachmentTable> {
    const attachment = await Attachment.findById(attachmentId);
    
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    const permissions = await this.checkPermissions(attachment, userId, userRole);
    if (!permissions.canView) {
      throw new Error('Insufficient permissions to view this file');
    }

    return attachment;
  }

  async getSignedDownloadUrl(
    attachmentId: string,
    userId: string,
    userRole: UserRole,
    expiresIn: number = 3600
  ): Promise<string> {
    const attachment = await Attachment.findById(attachmentId);
    
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    const permissions = await this.checkPermissions(attachment, userId, userRole);
    if (!permissions.canDownload) {
      throw new Error('Insufficient permissions to download this file');
    }

    if (attachment.virus_scanned && attachment.virus_clean === false) {
      throw new Error('File failed virus scan and cannot be downloaded');
    }

    return this.fileStorageService.getSignedUrl(
      attachment.storage_path,
      attachment.bucket_name,
      expiresIn
    );
  }

  private async scheduleVirusScan(
    attachmentId: string,
    fileBuffer: Buffer,
    filename: string
  ): Promise<void> {
    try {
      const scanResult = await this.virusScanService.scanFile(
        fileBuffer,
        filename
      );

      await Attachment.updateVirusScanResult(
        attachmentId,
        scanResult.isClean,
        scanResult.scanResult
      );

      // If infected, log security event
      if (!scanResult.isClean) {
        const attachment = await Attachment.findById(attachmentId);
        if (attachment) {
          await ActivityService.createActivity({
            leadId: attachment.lead_id,
            type: ActivityType.FILE_UPLOADED, // Would need SECURITY_ALERT activity type
            subject: `Virus detected in file: ${filename}`,
            details: {
              filename,
              attachmentId,
              scanResult: scanResult.scanResult,
              scanEngine: scanResult.scanEngine
            },
            performedBy: 'system',
            performedAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Virus scan failed:', error);
      // Mark as scan failed but don't block the upload
      await Attachment.updateVirusScanResult(
        attachmentId,
        false,
        'Scan failed: ' + (error as Error).message
      );
    }
  }

  private async checkPermissions(
    attachment: AttachmentTable,
    userId: string,
    userRole: UserRole
  ): Promise<AttachmentPermissions> {
    // Admin can do everything
    if (userRole === UserRole.ADMIN) {
      return {
        canView: true,
        canDownload: true,
        canDelete: true
      };
    }

    // File uploader can do everything with their files
    if (attachment.uploaded_by === userId) {
      return {
        canView: true,
        canDownload: true,
        canDelete: true
      };
    }

    // Check if user has access to the lead
    // This would integrate with lead assignment/permission logic
    const hasLeadAccess = await this.checkLeadAccess(attachment.lead_id, userId, userRole);
    
    if (!hasLeadAccess) {
      return {
        canView: false,
        canDownload: false,
        canDelete: false
      };
    }

    // Managers can view and download
    if (userRole === UserRole.MANAGER) {
      return {
        canView: true,
        canDownload: true,
        canDelete: true
      };
    }

    // Sales and marketing can view and download
    if (userRole === UserRole.SALES || userRole === UserRole.MARKETING) {
      return {
        canView: true,
        canDownload: true,
        canDelete: false
      };
    }

    // Read-only users can only view
    if (userRole === UserRole.READ_ONLY) {
      return {
        canView: true,
        canDownload: false,
        canDelete: false
      };
    }

    // Default: no access
    return {
      canView: false,
      canDownload: false,
      canDelete: false
    };
  }

  private async checkLeadAccess(
    leadId: string,
    userId: string,
    userRole: UserRole
  ): Promise<boolean> {
    // This would integrate with the lead service to check if user has access
    // For now, simplified implementation
    const Lead = require('../models/Lead').Lead;
    const lead = await Lead.findById(leadId);
    
    if (!lead) {
      return false;
    }

    // Admin and managers have access to all leads
    if (userRole === UserRole.ADMIN || userRole === UserRole.MANAGER) {
      return true;
    }

    // Check if user is assigned to the lead
    if (lead.assigned_to === userId) {
      return true;
    }

    // Additional team-based access logic could go here
    return false;
  }

  private validateFile(file: Express.Multer.File): void {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
      'application/zip'
    ];

    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }
  }

  private generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
    const baseName = originalFilename.substring(0, originalFilename.lastIndexOf('.'));
    
    return `${baseName}_${timestamp}_${random}${extension}`;
  }

  static create(): AttachmentService {
    const fileStorageService = FileStorageService.createFromEnv();
    const virusScanService = VirusScanService.createFromEnv();

    return new AttachmentService(
      fileStorageService,
      virusScanService
    );
  }
}