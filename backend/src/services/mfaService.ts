import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import db from '../config/database';
import { AuditService } from './auditService';
import { Request } from 'express';
import { AppError } from '../utils/errors';
import * as crypto from 'crypto';

export interface MFASetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFADevice {
  id?: string;
  userId: string;
  deviceName: string;
  deviceType: 'totp' | 'sms' | 'email';
  secret?: string;
  phoneNumber?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

export interface BackupCode {
  id?: string;
  userId: string;
  code: string;
  isUsed: boolean;
  createdAt: Date;
  usedAt?: Date;
}

/**
 * Multi-Factor Authentication service
 */
export class MFAService {
  /**
   * Generate MFA setup for TOTP (Time-based One-Time Password)
   */
  static async generateTOTPSetup(userId: string, userEmail: string): Promise<MFASetup> {
    const secret = speakeasy.generateSecret({
      name: `Lead Management System (${userEmail})`,
      issuer: 'Lead Management System',
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    return {
      secret: secret.base32!,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Enable MFA for user
   */
  static async enableMFA(
    userId: string,
    deviceName: string,
    deviceType: 'totp' | 'sms' | 'email',
    secret: string,
    verificationCode: string,
    phoneNumber?: string,
    email?: string,
    req?: Request
  ): Promise<MFADevice> {
    // Verify the setup code first
    const isValid = this.verifyTOTP(secret, verificationCode);
    if (!isValid) {
      throw new AppError('Invalid verification code', 400, 'INVALID_MFA_CODE');
    }

    // Check if user already has MFA enabled
    const existingDevice = await db('mfa_devices')
      .where({ userId, isActive: true })
      .first();

    if (existingDevice) {
      throw new AppError('MFA is already enabled for this user', 409, 'MFA_ALREADY_ENABLED');
    }

    const device: MFADevice = {
      userId,
      deviceName,
      deviceType,
      secret: deviceType === 'totp' ? secret : undefined,
      phoneNumber: deviceType === 'sms' ? phoneNumber : undefined,
      email: deviceType === 'email' ? email : undefined,
      isActive: true,
      createdAt: new Date()
    };

    const [id] = await db('mfa_devices').insert(device).returning('id');
    device.id = id;

    // Generate and store backup codes
    const backupCodes = this.generateBackupCodes();
    await this.storeBackupCodes(userId, backupCodes);

    // Update user MFA status
    await db('users')
      .where({ id: userId })
      .update({ mfaEnabled: true });

    if (req) {
      await AuditService.logAuthentication('mfa_enabled', req, userId, true, undefined, {
        deviceType,
        deviceName
      });
    }

    return device;
  }

  /**
   * Disable MFA for user
   */
  static async disableMFA(userId: string, req?: Request): Promise<void> {
    // Deactivate all MFA devices
    await db('mfa_devices')
      .where({ userId })
      .update({ isActive: false });

    // Mark all backup codes as used
    await db('backup_codes')
      .where({ userId, isUsed: false })
      .update({ isUsed: true, usedAt: new Date() });

    // Update user MFA status
    await db('users')
      .where({ id: userId })
      .update({ mfaEnabled: false });

    if (req) {
      await AuditService.logAuthentication('mfa_disabled', req, userId, true);
    }
  }

  /**
   * Verify MFA code
   */
  static async verifyMFA(userId: string, code: string, req?: Request): Promise<boolean> {
    // Get active MFA device
    const device = await db('mfa_devices')
      .where({ userId, isActive: true })
      .first();

    if (!device) {
      throw new AppError('MFA not enabled for this user', 400, 'MFA_NOT_ENABLED');
    }

    let isValid = false;

    switch (device.deviceType) {
      case 'totp':
        isValid = this.verifyTOTP(device.secret!, code);
        break;
      case 'sms':
        // In a real implementation, you would verify against a stored SMS code
        isValid = await this.verifySMSCode(userId, code);
        break;
      case 'email':
        // In a real implementation, you would verify against a stored email code
        isValid = await this.verifyEmailCode(userId, code);
        break;
    }

    // If TOTP fails, try backup codes
    if (!isValid && device.deviceType === 'totp') {
      isValid = await this.verifyBackupCode(userId, code);
    }

    if (isValid) {
      // Update last used timestamp
      await db('mfa_devices')
        .where({ id: device.id })
        .update({ lastUsed: new Date() });

      if (req) {
        await AuditService.logAuthentication('login', req, userId, true, undefined, {
          mfaUsed: true,
          mfaType: device.deviceType
        });
      }
    } else {
      if (req) {
        await AuditService.logAuthentication('login_failed', req, userId, false, 'Invalid MFA code', {
          mfaType: device.deviceType
        });
      }
    }

    return isValid;
  }

  /**
   * Verify TOTP code
   */
  private static verifyTOTP(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps (60 seconds) of drift
    });
  }

  /**
   * Send SMS code (placeholder implementation)
   */
  static async sendSMSCode(userId: string, phoneNumber: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store the code in database
    await db('mfa_codes').insert({
      userId,
      code: this.hashCode(code),
      type: 'sms',
      expiresAt,
      createdAt: new Date()
    });

    // In a real implementation, send SMS using a service like Twilio
    console.log(`SMS Code for ${phoneNumber}: ${code}`);
  }

  /**
   * Send email code (placeholder implementation)
   */
  static async sendEmailCode(userId: string, email: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store the code in database
    await db('mfa_codes').insert({
      userId,
      code: this.hashCode(code),
      type: 'email',
      expiresAt,
      createdAt: new Date()
    });

    // In a real implementation, send email using your email service
    console.log(`Email Code for ${email}: ${code}`);
  }

  /**
   * Verify SMS code
   */
  private static async verifySMSCode(userId: string, code: string): Promise<boolean> {
    const hashedCode = this.hashCode(code);
    
    const storedCode = await db('mfa_codes')
      .where({
        userId,
        code: hashedCode,
        type: 'sms',
        isUsed: false
      })
      .where('expiresAt', '>', new Date())
      .first();

    if (storedCode) {
      // Mark code as used
      await db('mfa_codes')
        .where({ id: storedCode.id })
        .update({ isUsed: true, usedAt: new Date() });
      
      return true;
    }

    return false;
  }

  /**
   * Verify email code
   */
  private static async verifyEmailCode(userId: string, code: string): Promise<boolean> {
    const hashedCode = this.hashCode(code);
    
    const storedCode = await db('mfa_codes')
      .where({
        userId,
        code: hashedCode,
        type: 'email',
        isUsed: false
      })
      .where('expiresAt', '>', new Date())
      .first();

    if (storedCode) {
      // Mark code as used
      await db('mfa_codes')
        .where({ id: storedCode.id })
        .update({ isUsed: true, usedAt: new Date() });
      
      return true;
    }

    return false;
  }

  /**
   * Generate backup codes
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Store backup codes
   */
  private static async storeBackupCodes(userId: string, codes: string[]): Promise<void> {
    const backupCodes = codes.map(code => ({
      userId,
      code: this.hashCode(code),
      isUsed: false,
      createdAt: new Date()
    }));

    await db('backup_codes').insert(backupCodes);
  }

  /**
   * Verify backup code
   */
  private static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const hashedCode = this.hashCode(code);
    
    const backupCode = await db('backup_codes')
      .where({
        userId,
        code: hashedCode,
        isUsed: false
      })
      .first();

    if (backupCode) {
      // Mark backup code as used
      await db('backup_codes')
        .where({ id: backupCode.id })
        .update({ isUsed: true, usedAt: new Date() });
      
      return true;
    }

    return false;
  }

  /**
   * Hash code for secure storage
   */
  private static hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Get user's MFA devices
   */
  static async getUserMFADevices(userId: string): Promise<MFADevice[]> {
    return await db('mfa_devices')
      .where({ userId, isActive: true })
      .select('id', 'deviceName', 'deviceType', 'createdAt', 'lastUsed');
  }

  /**
   * Get user's backup codes (remaining count only)
   */
  static async getBackupCodesCount(userId: string): Promise<number> {
    const result = await db('backup_codes')
      .where({ userId, isUsed: false })
      .count('* as count')
      .first();

    return parseInt(result?.count as string) || 0;
  }

  /**
   * Regenerate backup codes
   */
  static async regenerateBackupCodes(userId: string, req?: Request): Promise<string[]> {
    // Mark existing backup codes as used
    await db('backup_codes')
      .where({ userId, isUsed: false })
      .update({ isUsed: true, usedAt: new Date() });

    // Generate new backup codes
    const newCodes = this.generateBackupCodes();
    await this.storeBackupCodes(userId, newCodes);

    if (req) {
      await AuditService.logSecurityEvent('backup_codes_regenerated', req, 'medium', {
        userId
      });
    }

    return newCodes;
  }
}