import { VirusScanResult } from '../types';

export interface VirusScanConfig {
  enabled: boolean;
  provider: 'clamav' | 'virustotal' | 'mock';
  clamav?: {
    host: string;
    port: number;
  };
  virustotal?: {
    apiKey: string;
  };
}

export class VirusScanService {
  private config: VirusScanConfig;

  constructor(config: VirusScanConfig) {
    this.config = config;
  }

  async scanFile(
    fileBuffer: Buffer,
    filename: string
  ): Promise<VirusScanResult> {
    if (!this.config.enabled) {
      return {
        isClean: true,
        scanResult: 'Virus scanning disabled',
        scanDate: new Date(),
        scanEngine: 'disabled'
      };
    }

    switch (this.config.provider) {
      case 'clamav':
        return this.scanWithClamAV(fileBuffer, filename);
      case 'virustotal':
        return this.scanWithVirusTotal(fileBuffer, filename);
      case 'mock':
        return this.mockScan(fileBuffer, filename);
      default:
        throw new Error(`Unsupported virus scan provider: ${this.config.provider}`);
    }
  }

  async scanFileByPath(filePath: string): Promise<VirusScanResult> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const fileBuffer = await fs.readFile(filePath);
    const filename = path.basename(filePath);
    
    return this.scanFile(fileBuffer, filename);
  }

  private async scanWithClamAV(
    fileBuffer: Buffer,
    filename: string
  ): Promise<VirusScanResult> {
    try {
      // This would integrate with ClamAV daemon
      // For now, implementing a basic check
      const NodeClam = require('clamscan');
      
      if (!this.config.clamav) {
        throw new Error('ClamAV configuration not provided');
      }

      const clamscan = await new NodeClam().init({
        clamdscan: {
          host: this.config.clamav.host,
          port: this.config.clamav.port,
        },
        preference: 'clamdscan'
      });

      const scanResult = await clamscan.scanBuffer(fileBuffer);
      
      return {
        isClean: !scanResult.isInfected,
        scanResult: scanResult.viruses?.join(', ') || 'Clean',
        scanDate: new Date(),
        scanEngine: 'ClamAV'
      };
    } catch (error: any) {
      console.error('ClamAV scan error:', error);
      
      // Fallback to basic checks if ClamAV is unavailable
      return this.basicSecurityCheck(fileBuffer, filename);
    }
  }

  private async scanWithVirusTotal(
    fileBuffer: Buffer,
    filename: string
  ): Promise<VirusScanResult> {
    try {
      if (!this.config.virustotal?.apiKey) {
        throw new Error('VirusTotal API key not provided');
      }

      const crypto = require('crypto');
      const axios = require('axios');
      
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Check if file hash is already known
      const reportResponse = await axios.get(
        `https://www.virustotal.com/vtapi/v2/file/report`,
        {
          params: {
            apikey: this.config.virustotal.apiKey,
            resource: fileHash
          }
        }
      );

      if (reportResponse.data.response_code === 1) {
        // File already scanned
        const positives = reportResponse.data.positives || 0;
        const total = reportResponse.data.total || 0;
        
        return {
          isClean: positives === 0,
          scanResult: `${positives}/${total} engines detected threats`,
          scanDate: new Date(),
          scanEngine: 'VirusTotal'
        };
      }

      // File not known, would need to upload for scanning
      // This is a simplified implementation
      return this.basicSecurityCheck(fileBuffer, filename);
      
    } catch (error: any) {
      console.error('VirusTotal scan error:', error);
      return this.basicSecurityCheck(fileBuffer, filename);
    }
  }

  private async mockScan(
    _fileBuffer: Buffer,
    filename: string
  ): Promise<VirusScanResult> {
    // Mock implementation for testing
    const suspiciousPatterns = [
      'eicar', 'test-virus', 'malware', 'trojan'
    ];
    
    const lowerFilename = filename.toLowerCase();
    const isInfected = suspiciousPatterns.some(pattern => 
      lowerFilename.includes(pattern)
    );

    return {
      isClean: !isInfected,
      scanResult: isInfected ? 'Mock virus detected' : 'Clean',
      scanDate: new Date(),
      scanEngine: 'Mock Scanner'
    };
  }

  private async basicSecurityCheck(
    _fileBuffer: Buffer,
    filename: string
  ): Promise<VirusScanResult> {
    // Basic security checks without external virus scanner
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
      '.jar', '.app', '.deb', '.pkg', '.dmg', '.msi'
    ];
    
    const suspiciousPatterns = [
      // Common malware signatures (simplified)
      Buffer.from('4D5A', 'hex'), // PE header
      Buffer.from('504B0304', 'hex') // ZIP header (could contain malware)
    ];

    const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const isDangerousExtension = dangerousExtensions.includes(fileExtension);
    
    const hasSuspiciousPattern = suspiciousPatterns.some(pattern => 
      _fileBuffer.includes(pattern)
    );

    // Check file size (very large files might be suspicious)
    const isOversized = _fileBuffer.length > 100 * 1024 * 1024; // 100MB

    const isClean = !isDangerousExtension && !hasSuspiciousPattern && !isOversized;

    let scanResult = 'Clean';
    if (isDangerousExtension) {
      scanResult = 'Dangerous file extension detected';
    } else if (hasSuspiciousPattern) {
      scanResult = 'Suspicious file pattern detected';
    } else if (isOversized) {
      scanResult = 'File size exceeds limits';
    }

    return {
      isClean,
      scanResult,
      scanDate: new Date(),
      scanEngine: 'Basic Security Check'
    };
  }

  static createFromEnv(): VirusScanService {
    const config: VirusScanConfig = {
      enabled: process.env['VIRUS_SCAN_ENABLED'] === 'true',
      provider: (process.env['VIRUS_SCAN_PROVIDER'] as any) || 'mock',
      clamav: {
        host: process.env['CLAMAV_HOST'] || 'localhost',
        port: parseInt(process.env['CLAMAV_PORT'] || '3310')
      },
      virustotal: {
        apiKey: process.env['VIRUSTOTAL_API_KEY'] || ''
      }
    };

    return new VirusScanService(config);
  }
}