import { AttachmentService } from '../src/services/attachmentService';
import { FileStorageService } from '../src/services/fileStorageService';
import { VirusScanService } from '../src/services/virusScanService';
import { ActivityService } from '../src/services/activityService';
import { AttachmentStorageProvider } from '../src/types';

// Mock dependencies
jest.mock('../src/services/fileStorageService');
jest.mock('../src/services/virusScanService');
jest.mock('../src/services/activityService');
jest.mock('../src/models/Attachment');

describe('AttachmentService', () => {
  let attachmentService: AttachmentService;
  let mockFileStorageService: jest.Mocked<FileStorageService>;
  let mockVirusScanService: jest.Mocked<VirusScanService>;
  let mockActivityService: jest.Mocked<ActivityService>;

  beforeEach(() => {
    mockFileStorageService = {
      uploadFile: jest.fn(),
      downloadFile: jest.fn(),
      deleteFile: jest.fn(),
      getSignedUrl: jest.fn()
    } as any;

    mockVirusScanService = {
      scanFile: jest.fn()
    } as any;

    mockActivityService = {
      logActivity: jest.fn().mockResolvedValue(undefined)
    } as any;

    attachmentService = new AttachmentService(
      mockFileStorageService,
      mockVirusScanService,
      mockActivityService
    );
  });

  describe('uploadAttachment', () => {
    it('should upload file and create attachment record', async () => {
      // Mock file
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test content')
      } as Express.Multer.File;

      // Mock upload result
      mockFileStorageService.uploadFile.mockResolvedValue({
        storagePath: 'leads/123/test.pdf',
        bucketName: 'test-bucket',
        fileHash: 'abc123',
        url: 'https://example.com/test.pdf'
      });

      // Mock virus scan result
      mockVirusScanService.scanFile.mockResolvedValue({
        isClean: true,
        scanResult: 'Clean',
        scanDate: new Date(),
        scanEngine: 'Mock'
      });

      const request = {
        leadId: '123',
        file: mockFile,
        metadata: { description: 'Test file' }
      };

      // Mock Attachment.create
      const mockAttachment = {
        id: 'att-123',
        lead_id: '123',
        filename: 'test_123456_abc.pdf',
        original_filename: 'test.pdf',
        content_type: 'application/pdf',
        size: 1024,
        storage_path: 'leads/123/test.pdf',
        storage_provider: 's3',
        bucket_name: 'test-bucket',
        file_hash: 'abc123',
        virus_scanned: false,
        virus_clean: null,
        scan_result: null,
        metadata: '{"description":"Test file"}',
        uploaded_by: 'user-123',
        uploaded_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true
      };

      const { Attachment } = require('../src/models/Attachment');
      Attachment.create = jest.fn().mockResolvedValue(mockAttachment);

      const result = await attachmentService.uploadAttachment(request, 'user-123');

      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        '123',
        'user-123'
      );
      expect(mockActivityService.logActivity).toHaveBeenCalled();
      expect(result).toEqual(mockAttachment);
    });

    it('should validate file size and type', async () => {
      const oversizedFile = {
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 100 * 1024 * 1024 + 1, // Over 100MB
        buffer: Buffer.alloc(100 * 1024 * 1024 + 1)
      } as Express.Multer.File;

      const request = {
        leadId: '123',
        file: oversizedFile
      };

      await expect(
        attachmentService.uploadAttachment(request, 'user-123')
      ).rejects.toThrow('File size exceeds maximum allowed size');
    });

    it('should reject unsupported file types', async () => {
      const unsupportedFile = {
        originalname: 'malware.exe',
        mimetype: 'application/x-executable',
        size: 1024,
        buffer: Buffer.from('test content')
      } as Express.Multer.File;

      const request = {
        leadId: '123',
        file: unsupportedFile
      };

      await expect(
        attachmentService.uploadAttachment(request, 'user-123')
      ).rejects.toThrow('File type application/x-executable is not allowed');
    });
  });

  describe('downloadAttachment', () => {
    it('should download file with proper permissions', async () => {
      const mockAttachment = {
        id: 'att-123',
        lead_id: '123',
        storage_path: 'leads/123/test.pdf',
        bucket_name: 'test-bucket',
        uploaded_by: 'user-123',
        virus_scanned: true,
        virus_clean: true,
        original_filename: 'test.pdf'
      };

      const { Attachment } = require('../src/models/Attachment');
      Attachment.findById = jest.fn().mockResolvedValue(mockAttachment);

      const mockStream = {
        pipe: jest.fn()
      } as any;

      mockFileStorageService.downloadFile.mockResolvedValue({
        stream: mockStream,
        contentType: 'application/pdf',
        contentLength: 1024,
        filename: 'test.pdf'
      });

      const request = {
        attachmentId: 'att-123',
        inline: false
      };

      const result = await attachmentService.downloadAttachment(
        request,
        'user-123',
        'admin' as any
      );

      expect(mockFileStorageService.downloadFile).toHaveBeenCalledWith(
        'leads/123/test.pdf',
        'test-bucket'
      );
      expect(result.filename).toBe('test.pdf');
    });

    it('should reject download of infected files', async () => {
      const mockAttachment = {
        id: 'att-123',
        lead_id: '123',
        virus_scanned: true,
        virus_clean: false,
        uploaded_by: 'user-123'
      };

      const { Attachment } = require('../src/models/Attachment');
      Attachment.findById = jest.fn().mockResolvedValue(mockAttachment);

      const request = {
        attachmentId: 'att-123'
      };

      await expect(
        attachmentService.downloadAttachment(request, 'user-123', 'admin' as any)
      ).rejects.toThrow('File failed virus scan and cannot be downloaded');
    });
  });

  describe('file validation', () => {
    it('should accept valid file types', () => {
      const validFile = {
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test')
      } as Express.Multer.File;

      // Should not throw
      expect(() => {
        (attachmentService as any).validateFile(validFile);
      }).not.toThrow();
    });

    it('should generate unique filenames', () => {
      const filename1 = (attachmentService as any).generateUniqueFilename('test.pdf');
      const filename2 = (attachmentService as any).generateUniqueFilename('test.pdf');
      
      expect(filename1).not.toBe(filename2);
      expect(filename1).toMatch(/test_\d+_[a-z0-9]+\.pdf/);
    });
  });
});

describe('FileStorageService', () => {
  describe('S3 storage', () => {
    it('should create service from environment variables', () => {
      process.env['FILE_STORAGE_PROVIDER'] = 's3';
      process.env['AWS_ACCESS_KEY_ID'] = 'test-key';
      process.env['AWS_SECRET_ACCESS_KEY'] = 'test-secret';
      process.env['AWS_REGION'] = 'us-east-1';
      process.env['S3_BUCKET'] = 'test-bucket';

      const service = FileStorageService.createFromEnv();
      expect(service).toBeInstanceOf(FileStorageService);
    });

    it('should calculate file hash correctly', () => {
      const service = new FileStorageService({
        provider: AttachmentStorageProvider.S3,
        s3: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
          region: 'us-east-1',
          bucket: 'test'
        }
      });

      const buffer = Buffer.from('test content');
      const hash = (service as any).calculateFileHash(buffer);
      
      expect(hash).toBe('1eebdf4fdc9fc7bf283031b93f9aef3338de9052f584b10f7ea7f0b4526745f2');
    });

    it('should sanitize filenames', () => {
      const service = new FileStorageService({
        provider: AttachmentStorageProvider.S3,
        s3: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
          region: 'us-east-1',
          bucket: 'test'
        }
      });

      const sanitized = (service as any).sanitizeFilename('My File (1).pdf');
      expect(sanitized).toBe('my_file__1_.pdf');
    });
  });
});

describe('VirusScanService', () => {
  it('should create service from environment variables', () => {
    process.env['VIRUS_SCAN_ENABLED'] = 'true';
    process.env['VIRUS_SCAN_PROVIDER'] = 'mock';

    const service = VirusScanService.createFromEnv();
    expect(service).toBeInstanceOf(VirusScanService);
  });

  it('should perform mock virus scan', async () => {
    const service = new VirusScanService({
      enabled: true,
      provider: 'mock'
    });

    const cleanFile = Buffer.from('clean content');
    const result = await service.scanFile(cleanFile, 'clean.txt', 'text/plain');

    expect(result.isClean).toBe(true);
    expect(result.scanResult).toBe('Clean');
    expect(result.scanEngine).toBe('Mock Scanner');
  });

  it('should detect suspicious files in mock mode', async () => {
    const service = new VirusScanService({
      enabled: true,
      provider: 'mock'
    });

    const suspiciousFile = Buffer.from('eicar test file');
    const result = await service.scanFile(suspiciousFile, 'eicar-test.txt', 'text/plain');

    expect(result.isClean).toBe(false);
    expect(result.scanResult).toBe('Mock virus detected');
  });

  it('should return clean when disabled', async () => {
    const service = new VirusScanService({
      enabled: false,
      provider: 'mock'
    });

    const anyFile = Buffer.from('any content');
    const result = await service.scanFile(anyFile, 'any.txt', 'text/plain');

    expect(result.isClean).toBe(true);
    expect(result.scanResult).toBe('Virus scanning disabled');
  });
});