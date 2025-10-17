import { api } from './api';

export interface Attachment {
  id: string;
  leadId?: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  uploadedBy: string;
  virusScanned: boolean;
  virusClean?: boolean;
  scanResult?: string;
  metadata?: Record<string, any>;
}

export interface AttachmentUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface AttachmentUploadOptions {
  onProgress?: (progress: AttachmentUploadProgress) => void;
  metadata?: Record<string, any>;
}

export class AttachmentService {
  async uploadAttachment(
    leadId: string,
    file: File,
    options?: AttachmentUploadOptions
  ): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options?.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }

    const response = await api.post(`/leads/${leadId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const progress: AttachmentUploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
          };
          options.onProgress(progress);
        }
      }
    });

    return response.data.data;
  }

  async uploadMultipleAttachments(
    leadId: string,
    files: File[],
    options?: AttachmentUploadOptions
  ): Promise<Attachment[]> {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await api.post(`/leads/${leadId}/attachments/bulk`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const progress: AttachmentUploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
          };
          options.onProgress(progress);
        }
      }
    });

    return response.data.data;
  }

  async getAttachmentsByLead(leadId: string): Promise<Attachment[]> {
    const response = await api.get(`/leads/${leadId}/attachments`);
    return response.data.data;
  }

  async getAttachmentInfo(attachmentId: string): Promise<Attachment> {
    const response = await api.get(`/attachments/${attachmentId}`);
    return response.data.data;
  }

  async downloadAttachment(attachmentId: string, inline: boolean = false): Promise<Blob> {
    const response = await api.get(`/attachments/${attachmentId}/download`, {
      params: { inline },
      responseType: 'blob'
    });
    return response.data;
  }

  async getSignedDownloadUrl(
    attachmentId: string,
    expiresIn: number = 3600
  ): Promise<{ url: string; expiresIn: number }> {
    const response = await api.get(`/attachments/${attachmentId}/signed-url`, {
      params: { expiresIn }
    });
    return response.data.data;
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    await api.delete(`/attachments/${attachmentId}`);
  }

  async previewAttachment(attachmentId: string): Promise<string> {
    try {
      // Try to get signed URL for preview
      const { url } = await this.getSignedDownloadUrl(attachmentId, 300); // 5 minutes
      return url;
    } catch (error) {
      // Fallback to direct download
      const blob = await this.downloadAttachment(attachmentId, true);
      return URL.createObjectURL(blob);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(contentType: string): string {
    if (contentType.startsWith('image/')) {
      return '🖼️';
    } else if (contentType === 'application/pdf') {
      return '📄';
    } else if (contentType.includes('word') || contentType.includes('document')) {
      return '📝';
    } else if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
      return '📊';
    } else if (contentType.includes('zip') || contentType.includes('archive')) {
      return '🗜️';
    } else if (contentType.startsWith('text/')) {
      return '📃';
    } else {
      return '📎';
    }
  }

  isPreviewable(contentType: string): boolean {
    const previewableTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain'
    ];
    
    return previewableTypes.includes(contentType);
  }
}

export const attachmentService = new AttachmentService();