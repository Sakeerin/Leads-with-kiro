import { Request, Response } from 'express';
import { AuditService } from '../services/auditService';
import { GDPRService } from '../services/gdprService';
import { MFAService } from '../services/mfaService';
import { AppError } from '../utils/errors';

/**
 * Security and compliance controller
 */
export class SecurityController {
  /**
   * Get audit logs
   */
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    const {
      userId,
      action,
      resource,
      category,
      severity,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const filters = {
      userId: userId as string,
      action: action as string,
      resource: resource as string,
      category: category as string,
      severity: severity as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const result = await AuditService.getAuditLogs(filters);

    await AuditService.logDataAccess('read', req, 'audit_logs', undefined, {
      filters,
      resultCount: result.logs.length
    });

    res.json({
      success: true,
      data: result.logs,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: result.total,
        pages: Math.ceil(result.total / filters.limit)
      }
    });
  }

  /**
   * Get security alerts
   */
  static async getSecurityAlerts(req: Request, res: Response): Promise<void> {
    const { hours = 24 } = req.query;
    
    const alerts = await AuditService.getSecurityAlerts(parseInt(hours as string));

    await AuditService.logDataAccess('read', req, 'security_alerts', undefined, {
      hours,
      alertCount: alerts.length
    });

    res.json({
      success: true,
      data: alerts
    });
  }

  /**
   * Record user consent
   */
  static async recordConsent(req: Request, res: Response): Promise<void> {
    const {
      userId,
      leadId,
      email,
      consentType,
      consentGiven,
      consentMethod
    } = req.body;

    const consent = await GDPRService.recordConsent({
      userId,
      leadId,
      email,
      consentType,
      consentGiven,
      consentMethod
    }, req);

    res.status(201).json({
      success: true,
      data: consent
    });
  }

  /**
   * Withdraw consent
   */
  static async withdrawConsent(req: Request, res: Response): Promise<void> {
    const { email, consentType, reason } = req.body;

    await GDPRService.withdrawConsent(email, consentType, reason, req);

    res.json({
      success: true,
      message: 'Consent withdrawn successfully'
    });
  }

  /**
   * Get user consents
   */
  static async getUserConsents(req: Request, res: Response): Promise<void> {
    const { email } = req.params;

    const consents = await GDPRService.getUserConsents(email);

    await AuditService.logDataAccess('read', req, 'consent_records', undefined, {
      email,
      consentCount: consents.length
    });

    res.json({
      success: true,
      data: consents
    });
  }

  /**
   * Request data export
   */
  static async requestDataExport(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    const exportRequest = await GDPRService.requestDataExport(email, req);

    res.status(201).json({
      success: true,
      data: exportRequest,
      message: 'Data export request submitted. You will be notified when ready.'
    });
  }

  /**
   * Request data deletion
   */
  static async requestDataDeletion(req: Request, res: Response): Promise<void> {
    const { email, deletionType, reason } = req.body;

    const deletionRequest = await GDPRService.requestDataDeletion(
      email,
      deletionType,
      reason,
      req
    );

    res.status(201).json({
      success: true,
      data: deletionRequest,
      message: 'Data deletion request submitted and will be processed.'
    });
  }

  /**
   * Get GDPR compliance report
   */
  static async getComplianceReport(req: Request, res: Response): Promise<void> {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new AppError('Start date and end date are required', 400, 'MISSING_DATE_RANGE');
    }

    const report = await GDPRService.getComplianceReport(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    await AuditService.logDataAccess('read', req, 'compliance_report', undefined, {
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: report
    });
  }

  /**
   * Setup MFA
   */
  static async setupMFA(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    const setup = await MFAService.generateTOTPSetup(userId, userEmail);

    // Don't log the secret in audit logs for security
    await AuditService.logSecurityEvent('mfa_setup_initiated', req, 'medium', {
      userId
    });

    res.json({
      success: true,
      data: {
        qrCodeUrl: setup.qrCodeUrl,
        backupCodes: setup.backupCodes,
        secret: setup.secret // Only return this once during setup
      }
    });
  }

  /**
   * Enable MFA
   */
  static async enableMFA(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const {
      deviceName,
      deviceType,
      secret,
      verificationCode,
      phoneNumber,
      email
    } = req.body;

    const device = await MFAService.enableMFA(
      userId,
      deviceName,
      deviceType,
      secret,
      verificationCode,
      phoneNumber,
      email,
      req
    );

    res.json({
      success: true,
      data: {
        id: device.id,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        createdAt: device.createdAt
      },
      message: 'MFA enabled successfully'
    });
  }

  /**
   * Disable MFA
   */
  static async disableMFA(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    await MFAService.disableMFA(userId, req);

    res.json({
      success: true,
      message: 'MFA disabled successfully'
    });
  }

  /**
   * Verify MFA code
   */
  static async verifyMFA(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { code } = req.body;

    const isValid = await MFAService.verifyMFA(userId, code, req);

    if (!isValid) {
      throw new AppError('Invalid MFA code', 400, 'INVALID_MFA_CODE');
    }

    res.json({
      success: true,
      message: 'MFA verification successful'
    });
  }

  /**
   * Get user MFA devices
   */
  static async getMFADevices(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    const devices = await MFAService.getUserMFADevices(userId);
    const backupCodesCount = await MFAService.getBackupCodesCount(userId);

    res.json({
      success: true,
      data: {
        devices,
        backupCodesCount
      }
    });
  }

  /**
   * Regenerate backup codes
   */
  static async regenerateBackupCodes(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    const newCodes = await MFAService.regenerateBackupCodes(userId, req);

    res.json({
      success: true,
      data: {
        backupCodes: newCodes
      },
      message: 'New backup codes generated. Please store them securely.'
    });
  }

  /**
   * Send MFA code via SMS
   */
  static async sendSMSCode(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { phoneNumber } = req.body;

    await MFAService.sendSMSCode(userId, phoneNumber);

    await AuditService.logAuthentication('mfa_sms_sent', req, userId, true, undefined, {
      phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*') // Mask phone number
    });

    res.json({
      success: true,
      message: 'SMS code sent successfully'
    });
  }

  /**
   * Send MFA code via email
   */
  static async sendEmailCode(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { email } = req.body;

    await MFAService.sendEmailCode(userId, email);

    await AuditService.logAuthentication('mfa_email_sent', req, userId, true, undefined, {
      email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Mask email
    });

    res.json({
      success: true,
      message: 'Email code sent successfully'
    });
  }
}