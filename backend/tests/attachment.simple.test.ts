import { VirusScanService } from '../src/services/virusScanService';
import { FileStorageService } from '../src/services/fileStorageService';
import { AttachmentStorageProvider } from '../src/types';

describe('Attachment System - Simple Tests', () => {
  describe('VirusScanService', () => {
    it('should create service with mock provider', () => {
      const service = new VirusScanService({
        enabled: true,
        provider: 'mock'
      });
      
      expect(service).toBeInstanceOf(VirusScanService);
    });

    it('should scan clean file successfully', async () => {
      const service = new VirusScanService({
        enabled: true,
        provider: 'mock'
      });

      const result = await service.scanFile(
        Buffer.from('clean file content'),
        'clean-file.txt'
      );

      expect(result.isClean).toBe(true);
      expect(result.scanResult).toBe('Clean');
      expect(result.scanEngine).toBe('Mock Scanner');
    });

    it('should detect suspicious files', async () => {
      const service = new VirusScanService({
        enabled: true,
        provider: 'mock'
      });

      const result = await service.scanFile(
        Buffer.from('eicar test virus'),
        'eicar-test.txt'
      );

      expect(result.isClean).toBe(false);
      expect(result.scanResult).toBe('Mock virus detected');
    });

    it('should return clean when disabled', async () => {
      const service = new VirusScanService({
        enabled: false,
        provider: 'mock'
      });

      const result = await service.scanFile(
        Buffer.from('any content'),
        'any-file.txt'
      );

      expect(result.isClean).toBe(true);
      expect(result.scanResult).toBe('Virus scanning disabled');
    });
  });

  describe('FileStorageService', () => {
    it('should create service with local provider', () => {
      const service = new FileStorageService({
        provider: AttachmentStorageProvider.LOCAL,
        local: {
          uploadPath: './test-uploads'
        }
      });
      
      expect(service).toBeInstanceOf(FileStorageService);
    });

    it('should calculate file hash correctly', () => {
      const service = new FileStorageService({
        provider: AttachmentStorageProvider.LOCAL,
        local: { uploadPath: './test' }
      });

      const buffer = Buffer.from('test content');
      const hash = (service as any).calculateFileHash(buffer);
      
      // SHA-256 hash of "test content"
      expect(hash).toBe('6ae8a75555209fd6c44157c0aed8016e763ff435a19cf186f76863140143ff72');
    });

    it('should sanitize filenames properly', () => {
      const service = new FileStorageService({
        provider: AttachmentStorageProvider.LOCAL,
        local: { uploadPath: './test' }
      });

      const sanitized = (service as any).sanitizeFilename('My File (1).pdf');
      expect(sanitized).toBe('my_file_1_.pdf');
    });

    it('should handle special characters in filenames', () => {
      const service = new FileStorageService({
        provider: AttachmentStorageProvider.LOCAL,
        local: { uploadPath: './test' }
      });

      const sanitized = (service as any).sanitizeFilename('File@#$%^&*()Name.docx');
      expect(sanitized).toBe('file_name.docx');
    });
  });

  describe('File Validation', () => {
    it('should format file sizes correctly', () => {
      const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should identify file types correctly', () => {
      const getFileType = (contentType: string): string => {
        if (contentType.startsWith('image/')) return 'image';
        if (contentType === 'application/pdf') return 'pdf';
        if (contentType.includes('word')) return 'word';
        if (contentType.includes('excel') || contentType.includes('spreadsheet')) return 'excel';
        if (contentType.includes('zip')) return 'archive';
        if (contentType.startsWith('text/')) return 'text';
        return 'file';
      };

      expect(getFileType('image/jpeg')).toBe('image');
      expect(getFileType('application/pdf')).toBe('pdf');
      expect(getFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('word');
      expect(getFileType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('excel');
      expect(getFileType('application/zip')).toBe('archive');
      expect(getFileType('text/plain')).toBe('text');
      expect(getFileType('application/octet-stream')).toBe('file');
    });

    it('should identify previewable files', () => {
      const isPreviewable = (contentType: string): boolean => {
        const previewableTypes = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'text/plain'
        ];
        return previewableTypes.includes(contentType);
      };

      expect(isPreviewable('image/jpeg')).toBe(true);
      expect(isPreviewable('application/pdf')).toBe(true);
      expect(isPreviewable('text/plain')).toBe(true);
      expect(isPreviewable('application/zip')).toBe(false);
      expect(isPreviewable('application/octet-stream')).toBe(false);
    });
  });

  describe('Security Validation', () => {
    it('should validate file sizes', () => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      
      const validateFileSize = (size: number): boolean => {
        return size <= maxSize;
      };

      expect(validateFileSize(1024)).toBe(true); // 1KB
      expect(validateFileSize(maxSize)).toBe(true); // Exactly 50MB
      expect(validateFileSize(maxSize + 1)).toBe(false); // Over 50MB
    });

    it('should validate file types', () => {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'application/pdf',
        'application/msword', 'text/plain', 'application/zip'
      ];
      
      const validateFileType = (mimeType: string): boolean => {
        return allowedTypes.includes(mimeType);
      };

      expect(validateFileType('image/jpeg')).toBe(true);
      expect(validateFileType('application/pdf')).toBe(true);
      expect(validateFileType('application/x-executable')).toBe(false);
      expect(validateFileType('application/javascript')).toBe(false);
    });

    it('should detect dangerous file extensions', () => {
      const dangerousExtensions = [
        '.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'
      ];
      
      const isDangerousFile = (filename: string): boolean => {
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return dangerousExtensions.includes(extension);
      };

      expect(isDangerousFile('document.pdf')).toBe(false);
      expect(isDangerousFile('image.jpg')).toBe(false);
      expect(isDangerousFile('malware.exe')).toBe(true);
      expect(isDangerousFile('script.bat')).toBe(true);
      expect(isDangerousFile('virus.vbs')).toBe(true);
    });
  });
});