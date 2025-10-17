import AWS from 'aws-sdk';
import crypto from 'crypto';
import path from 'path';
import { AttachmentStorageProvider } from '../types';

export interface FileStorageConfig {
  provider: AttachmentStorageProvider;
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string | undefined; // For S3-compatible services
  };
  local?: {
    uploadPath: string;
  };
}

export interface UploadResult {
  storagePath: string;
  bucketName?: string;
  fileHash: string;
  url?: string;
}

export interface DownloadResult {
  stream: NodeJS.ReadableStream;
  contentType: string;
  contentLength: number;
  filename: string;
}

export class FileStorageService {
  private s3Client?: AWS.S3;
  private config: FileStorageConfig;

  constructor(config: FileStorageConfig) {
    this.config = config;
    
    if (config.provider === AttachmentStorageProvider.S3 && config.s3) {
      const s3Config: AWS.S3.ClientConfiguration = {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
        region: config.s3.region,
        s3ForcePathStyle: !!config.s3.endpoint // Required for MinIO and other S3-compatible services
      };
      
      if (config.s3.endpoint) {
        s3Config.endpoint = config.s3.endpoint;
      }
      
      this.s3Client = new AWS.S3(s3Config);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    leadId: string
  ): Promise<UploadResult> {
    const fileHash = this.calculateFileHash(file.buffer);
    const timestamp = Date.now();
    const sanitizedFilename = this.sanitizeFilename(file.originalname);
    const storagePath = `leads/${leadId}/${timestamp}-${sanitizedFilename}`;

    switch (this.config.provider) {
      case AttachmentStorageProvider.S3:
        return this.uploadToS3(file, storagePath, fileHash);
      case AttachmentStorageProvider.LOCAL:
        return this.uploadToLocal(file, storagePath, fileHash);
      default:
        throw new Error(`Unsupported storage provider: ${this.config.provider}`);
    }
  }

  async downloadFile(
    storagePath: string,
    bucketName?: string
  ): Promise<DownloadResult> {
    switch (this.config.provider) {
      case AttachmentStorageProvider.S3:
        return this.downloadFromS3(storagePath, bucketName);
      case AttachmentStorageProvider.LOCAL:
        return this.downloadFromLocal(storagePath);
      default:
        throw new Error(`Unsupported storage provider: ${this.config.provider}`);
    }
  }

  async deleteFile(storagePath: string, bucketName?: string): Promise<void> {
    switch (this.config.provider) {
      case AttachmentStorageProvider.S3:
        return this.deleteFromS3(storagePath, bucketName);
      case AttachmentStorageProvider.LOCAL:
        return this.deleteFromLocal(storagePath);
      default:
        throw new Error(`Unsupported storage provider: ${this.config.provider}`);
    }
  }

  async getSignedUrl(
    storagePath: string,
    bucketName?: string,
    expiresIn: number = 3600
  ): Promise<string> {
    if (this.config.provider === AttachmentStorageProvider.S3 && this.s3Client) {
      const bucket = bucketName || this.config.s3!.bucket;
      return this.s3Client.getSignedUrl('getObject', {
        Bucket: bucket,
        Key: storagePath,
        Expires: expiresIn
      });
    }
    
    throw new Error('Signed URLs only supported for S3 storage');
  }

  private async uploadToS3(
    file: Express.Multer.File,
    storagePath: string,
    fileHash: string
  ): Promise<UploadResult> {
    if (!this.s3Client || !this.config.s3) {
      throw new Error('S3 client not configured');
    }

    const bucket = this.config.s3.bucket;
    
    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: bucket,
      Key: storagePath,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
      Metadata: {
        'original-filename': file.originalname,
        'file-hash': fileHash,
        'upload-timestamp': Date.now().toString()
      }
    };

    await this.s3Client.upload(uploadParams).promise();

    return {
      storagePath,
      bucketName: bucket,
      fileHash,
      url: `https://${bucket}.s3.${this.config.s3.region}.amazonaws.com/${storagePath}`
    };
  }

  private async uploadToLocal(
    file: Express.Multer.File,
    storagePath: string,
    fileHash: string
  ): Promise<UploadResult> {
    const fs = require('fs').promises;
    const path = require('path');
    
    if (!this.config.local) {
      throw new Error('Local storage not configured');
    }

    const fullPath = path.join(this.config.local.uploadPath, storagePath);
    const directory = path.dirname(fullPath);
    
    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, file.buffer);

    return {
      storagePath: fullPath,
      fileHash
    };
  }

  private async downloadFromS3(
    storagePath: string,
    bucketName?: string
  ): Promise<DownloadResult> {
    if (!this.s3Client || !this.config.s3) {
      throw new Error('S3 client not configured');
    }

    const bucket = bucketName || this.config.s3.bucket;
    
    const params: AWS.S3.GetObjectRequest = {
      Bucket: bucket,
      Key: storagePath
    };

    const result = await this.s3Client.getObject(params).promise();
    
    if (!result.Body) {
      throw new Error('File not found');
    }

    const stream = require('stream');
    const readable = new stream.PassThrough();
    readable.end(result.Body);

    return {
      stream: readable,
      contentType: result.ContentType || 'application/octet-stream',
      contentLength: result.ContentLength || 0,
      filename: result.Metadata?.['original-filename'] || path.basename(storagePath)
    };
  }

  private async downloadFromLocal(storagePath: string): Promise<DownloadResult> {
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(storagePath)) {
      throw new Error('File not found');
    }

    const stats = fs.statSync(storagePath);
    const stream = fs.createReadStream(storagePath);

    return {
      stream,
      contentType: 'application/octet-stream', // Would need mime-type detection
      contentLength: stats.size,
      filename: path.basename(storagePath)
    };
  }

  private async deleteFromS3(storagePath: string, bucketName?: string): Promise<void> {
    if (!this.s3Client || !this.config.s3) {
      throw new Error('S3 client not configured');
    }

    const bucket = bucketName || this.config.s3.bucket;
    
    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: bucket,
      Key: storagePath
    };

    await this.s3Client.deleteObject(params).promise();
  }

  private async deleteFromLocal(storagePath: string): Promise<void> {
    const fs = require('fs').promises;
    
    try {
      await fs.unlink(storagePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private calculateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private sanitizeFilename(filename: string): string {
    // Remove or replace dangerous characters
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  static createFromEnv(): FileStorageService {
    const provider = (process.env['FILE_STORAGE_PROVIDER'] as AttachmentStorageProvider) || AttachmentStorageProvider.S3;
    
    const config: FileStorageConfig = {
      provider,
      s3: {
        accessKeyId: process.env['AWS_ACCESS_KEY_ID'] || '',
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] || '',
        region: process.env['AWS_REGION'] || 'us-east-1',
        bucket: process.env['S3_BUCKET'] || 'lead-management-attachments',
        endpoint: process.env['S3_ENDPOINT'] // For MinIO or other S3-compatible services
      },
      local: {
        uploadPath: process.env['LOCAL_UPLOAD_PATH'] || './uploads'
      }
    };

    return new FileStorageService(config);
  }
}