import { Request, Response } from 'express';
import { AttachmentService } from '../services/attachmentService';
import { AttachmentUploadRequest, AttachmentDownloadRequest } from '../types';
import multer from 'multer';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10 // Maximum 10 files per request
  },
  fileFilter: (req, file, cb) => {
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

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  }
});

export class AttachmentController {
  private attachmentService: AttachmentService;

  constructor(attachmentService: AttachmentService) {
    this.attachmentService = attachmentService;
  }

  // Middleware for single file upload
  uploadSingle = upload.single('file');

  // Middleware for multiple file upload
  uploadMultiple = upload.array('files', 10);

  async uploadAttachment(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const file = req.file;
      const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : undefined;
      const userId = req.user?.id;

      if (!file) {
        res.status(400).json({
          error: {
            code: 'MISSING_FILE',
            message: 'No file provided'
          }
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
        return;
      }

      const uploadRequest: AttachmentUploadRequest = {
        leadId,
        file,
        metadata
      };

      const attachment = await this.attachmentService.uploadAttachment(
        uploadRequest,
        userId
      );

      res.status(201).json({
        data: {
          id: attachment.id,
          filename: attachment.original_filename,
          size: attachment.size,
          contentType: attachment.content_type,
          uploadedAt: attachment.uploaded_at,
          virusScanned: attachment.virus_scanned,
          virusClean: attachment.virus_clean
        }
      });
    } catch (error: any) {
      console.error('Upload attachment error:', error);
      res.status(500).json({
        error: {
          code: 'UPLOAD_FAILED',
          message: error.message || 'Failed to upload attachment'
        }
      });
    }
  }

  async uploadMultipleAttachments(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const files = req.files as Express.Multer.File[];
      const userId = req.user?.id;

      if (!files || files.length === 0) {
        res.status(400).json({
          error: {
            code: 'MISSING_FILES',
            message: 'No files provided'
          }
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
        return;
      }

      const uploadPromises = files.map(file => {
        const uploadRequest: AttachmentUploadRequest = {
          leadId,
          file
        };
        return this.attachmentService.uploadAttachment(uploadRequest, userId);
      });

      const attachments = await Promise.all(uploadPromises);

      res.status(201).json({
        data: attachments.map(attachment => ({
          id: attachment.id,
          filename: attachment.original_filename,
          size: attachment.size,
          contentType: attachment.content_type,
          uploadedAt: attachment.uploaded_at,
          virusScanned: attachment.virus_scanned,
          virusClean: attachment.virus_clean
        }))
      });
    } catch (error: any) {
      console.error('Upload multiple attachments error:', error);
      res.status(500).json({
        error: {
          code: 'UPLOAD_FAILED',
          message: error.message || 'Failed to upload attachments'
        }
      });
    }
  }

  async downloadAttachment(req: Request, res: Response): Promise<void> {
    try {
      const { attachmentId } = req.params;
      const { inline } = req.query;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
        return;
      }

      const downloadRequest: AttachmentDownloadRequest = {
        attachmentId,
        inline: inline === 'true'
      };

      const downloadResult = await this.attachmentService.downloadAttachment(
        downloadRequest,
        userId,
        userRole
      );

      // Set appropriate headers
      res.setHeader('Content-Type', downloadResult.contentType);
      res.setHeader('Content-Length', downloadResult.contentLength);
      
      if (inline === 'true') {
        res.setHeader('Content-Disposition', `inline; filename="${downloadResult.filename}"`);
      } else {
        res.setHeader('Content-Disposition', `attachment; filename="${downloadResult.filename}"`);
      }

      // Pipe the file stream to response
      downloadResult.stream.pipe(res);
    } catch (error: any) {
      console.error('Download attachment error:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'ATTACHMENT_NOT_FOUND',
            message: 'Attachment not found'
          }
        });
      } else if (error.message.includes('permissions')) {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: error.message
          }
        });
      } else if (error.message.includes('virus')) {
        res.status(403).json({
          error: {
            code: 'VIRUS_DETECTED',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'DOWNLOAD_FAILED',
            message: 'Failed to download attachment'
          }
        });
      }
    }
  }

  async getSignedDownloadUrl(req: Request, res: Response): Promise<void> {
    try {
      const { attachmentId } = req.params;
      const { expiresIn } = req.query;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
        return;
      }

      const expires = expiresIn ? parseInt(expiresIn as string) : 3600;
      
      const signedUrl = await this.attachmentService.getSignedDownloadUrl(
        attachmentId,
        userId,
        userRole,
        expires
      );

      res.json({
        data: {
          url: signedUrl,
          expiresIn: expires
        }
      });
    } catch (error: any) {
      console.error('Get signed URL error:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'ATTACHMENT_NOT_FOUND',
            message: 'Attachment not found'
          }
        });
      } else if (error.message.includes('permissions')) {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'URL_GENERATION_FAILED',
            message: 'Failed to generate signed URL'
          }
        });
      }
    }
  }

  async deleteAttachment(req: Request, res: Response): Promise<void> {
    try {
      const { attachmentId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
        return;
      }

      await this.attachmentService.deleteAttachment(
        attachmentId,
        userId,
        userRole
      );

      res.status(204).send();
    } catch (error: any) {
      console.error('Delete attachment error:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'ATTACHMENT_NOT_FOUND',
            message: 'Attachment not found'
          }
        });
      } else if (error.message.includes('permissions')) {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to delete attachment'
          }
        });
      }
    }
  }

  async getAttachmentsByLead(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
        return;
      }

      const attachments = await this.attachmentService.getAttachmentsByLead(
        leadId,
        userId,
        userRole
      );

      res.json({
        data: attachments.map(attachment => ({
          id: attachment.id,
          filename: attachment.original_filename,
          size: attachment.size,
          contentType: attachment.content_type,
          uploadedAt: attachment.uploaded_at,
          uploadedBy: attachment.uploaded_by,
          virusScanned: attachment.virus_scanned,
          virusClean: attachment.virus_clean,
          metadata: attachment.metadata ? JSON.parse(attachment.metadata) : null
        }))
      });
    } catch (error: any) {
      console.error('Get attachments by lead error:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch attachments'
        }
      });
    }
  }

  async getAttachmentInfo(req: Request, res: Response): Promise<void> {
    try {
      const { attachmentId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          }
        });
        return;
      }

      const attachment = await this.attachmentService.getAttachmentInfo(
        attachmentId,
        userId,
        userRole
      );

      res.json({
        data: {
          id: attachment.id,
          leadId: attachment.lead_id,
          filename: attachment.original_filename,
          size: attachment.size,
          contentType: attachment.content_type,
          uploadedAt: attachment.uploaded_at,
          uploadedBy: attachment.uploaded_by,
          virusScanned: attachment.virus_scanned,
          virusClean: attachment.virus_clean,
          scanResult: attachment.scan_result,
          metadata: attachment.metadata ? JSON.parse(attachment.metadata) : null
        }
      });
    } catch (error: any) {
      console.error('Get attachment info error:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          error: {
            code: 'ATTACHMENT_NOT_FOUND',
            message: 'Attachment not found'
          }
        });
      } else if (error.message.includes('permissions')) {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          error: {
            code: 'FETCH_FAILED',
            message: 'Failed to fetch attachment info'
          }
        });
      }
    }
  }
}