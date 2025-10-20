import db from '../config/database';
import { AuditService } from './auditService';
import { Request } from 'express';
import { AppError } from '../utils/errors';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ConsentRecord {
  id?: string;
  userId?: string;
  leadId?: string;
  email: string;
  consentType: 'marketing' | 'analytics' | 'functional' | 'data_processing';
  consentGiven: boolean;
  consentDate: Date;
  consentMethod: 'explicit' | 'implicit' | 'legitimate_interest';
  ipAddress?: string;
  userAgent?: string;
  withdrawalDate?: Date;
  withdrawalReason?: string;
}

export interface DataExportRequest {
  id?: string;
  userId?: string;
  email: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedDate?: Date;
  downloadUrl?: string;
  expiryDate?: Date;
  requestedBy: string;
  ipAddress?: string;
}

export interface DataDeletionRequest {
  id?: string;
  userId?: string;
  email: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedDate?: Date;
  deletionType: 'full' | 'anonymization' | 'retention_only';
  reason?: string;
  requestedBy: string;
  ipAddress?: string;
  retentionUntil?: Date;
}

/**
 * GDPR compliance service
 */
export class GDPRService {
  /**
   * Record user consent
   */
  static async recordConsent(
    consentData: Omit<ConsentRecord, 'id' | 'consentDate'>,
    req: Request
  ): Promise<ConsentRecord> {
    const consent: ConsentRecord = {
      ...consentData,
      consentDate: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const [id] = await db('consent_records').insert(consent).returning('id');
    consent.id = id;

    await AuditService.logDataModification(
      'create',
      req,
      'consent',
      id,
      true,
      undefined,
      { consentType: consent.consentType, consentGiven: consent.consentGiven }
    );

    return consent;
  }

  /**
   * Withdraw consent
   */
  static async withdrawConsent(
    email: string,
    consentType: string,
    reason: string,
    req: Request
  ): Promise<void> {
    const updated = await db('consent_records')
      .where({ email, consentType, consentGiven: true })
      .whereNull('withdrawalDate')
      .update({
        consentGiven: false,
        withdrawalDate: new Date(),
        withdrawalReason: reason
      });

    if (updated === 0) {
      throw new AppError('No active consent found to withdraw', 404, 'CONSENT_NOT_FOUND');
    }

    await AuditService.logDataModification(
      'update',
      req,
      'consent',
      undefined,
      true,
      undefined,
      { email, consentType, action: 'withdrawal', reason }
    );
  }

  /**
   * Check if user has given consent for specific type
   */
  static async hasConsent(email: string, consentType: string): Promise<boolean> {
    const consent = await db('consent_records')
      .where({ email, consentType, consentGiven: true })
      .whereNull('withdrawalDate')
      .first();

    return !!consent;
  }

  /**
   * Get all consent records for a user
   */
  static async getUserConsents(email: string): Promise<ConsentRecord[]> {
    return await db('consent_records')
      .where({ email })
      .orderBy('consentDate', 'desc');
  }

  /**
   * Request data export (Right to Data Portability)
   */
  static async requestDataExport(
    email: string,
    req: Request
  ): Promise<DataExportRequest> {
    // Check if there's already a pending request
    const existingRequest = await db('data_export_requests')
      .where({ email, status: 'pending' })
      .orWhere({ email, status: 'processing' })
      .first();

    if (existingRequest) {
      throw new AppError('Data export request already in progress', 409, 'EXPORT_REQUEST_EXISTS');
    }

    const exportRequest: DataExportRequest = {
      email,
      requestDate: new Date(),
      status: 'pending',
      requestedBy: req.user?.id || 'anonymous',
      ipAddress: req.ip
    };

    const [id] = await db('data_export_requests').insert(exportRequest).returning('id');
    exportRequest.id = id;

    await AuditService.logDataAccess(
      'export',
      req,
      'personal_data',
      undefined,
      { email, requestType: 'gdpr_export' }
    );

    // Process export asynchronously
    this.processDataExport(id).catch(console.error);

    return exportRequest;
  }

  /**
   * Process data export
   */
  private static async processDataExport(requestId: string): Promise<void> {
    try {
      await db('data_export_requests')
        .where({ id: requestId })
        .update({ status: 'processing' });

      const request = await db('data_export_requests')
        .where({ id: requestId })
        .first();

      if (!request) {
        throw new Error('Export request not found');
      }

      // Collect all user data
      const userData = await this.collectUserData(request.email);

      // Generate export file
      const exportData = {
        exportDate: new Date().toISOString(),
        email: request.email,
        data: userData
      };

      const fileName = `data-export-${requestId}-${Date.now()}.json`;
      const filePath = path.join(process.env.EXPORT_DIR || './exports', fileName);
      
      await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));

      // Update request with download URL and expiry
      const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await db('data_export_requests')
        .where({ id: requestId })
        .update({
          status: 'completed',
          completedDate: new Date(),
          downloadUrl: `/api/gdpr/export/${requestId}/download`,
          expiryDate
        });

      await AuditService.logSystemEvent('data_export_completed', {
        requestId,
        email: request.email,
        fileSize: (await fs.stat(filePath)).size
      });

    } catch (error) {
      await db('data_export_requests')
        .where({ id: requestId })
        .update({ status: 'failed' });

      await AuditService.logSystemEvent('data_export_failed', {
        requestId,
        error: error.message
      }, 'high', false, error.message);
    }
  }

  /**
   * Collect all user data for export
   */
  private static async collectUserData(email: string): Promise<any> {
    const data: any = {};

    // User profile data
    const user = await db('users').where({ email }).first();
    if (user) {
      data.profile = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    }

    // Lead data
    data.leads = await db('leads').where({ email }).select('*');

    // Task data
    data.tasks = await db('tasks')
      .join('leads', 'tasks.leadId', 'leads.id')
      .where('leads.email', email)
      .select('tasks.*');

    // Activity data
    data.activities = await db('activities')
      .join('leads', 'activities.leadId', 'leads.id')
      .where('leads.email', email)
      .select('activities.*');

    // Communication history
    data.communications = await db('communication_history')
      .join('leads', 'communication_history.leadId', 'leads.id')
      .where('leads.email', email)
      .select('communication_history.*');

    // Consent records
    data.consents = await db('consent_records').where({ email }).select('*');

    // Audit logs (limited to user's own actions)
    if (user) {
      data.auditLogs = await db('audit_logs')
        .where({ userId: user.id })
        .select('*');
    }

    return data;
  }

  /**
   * Request data deletion (Right to be Forgotten)
   */
  static async requestDataDeletion(
    email: string,
    deletionType: 'full' | 'anonymization' | 'retention_only',
    reason: string,
    req: Request
  ): Promise<DataDeletionRequest> {
    // Check if there's already a pending request
    const existingRequest = await db('data_deletion_requests')
      .where({ email, status: 'pending' })
      .orWhere({ email, status: 'processing' })
      .first();

    if (existingRequest) {
      throw new AppError('Data deletion request already in progress', 409, 'DELETION_REQUEST_EXISTS');
    }

    const deletionRequest: DataDeletionRequest = {
      email,
      requestDate: new Date(),
      status: 'pending',
      deletionType,
      reason,
      requestedBy: req.user?.id || 'anonymous',
      ipAddress: req.ip
    };

    const [id] = await db('data_deletion_requests').insert(deletionRequest).returning('id');
    deletionRequest.id = id;

    await AuditService.logDataModification(
      'delete',
      req,
      'personal_data',
      undefined,
      true,
      undefined,
      { email, deletionType, reason }
    );

    // Process deletion asynchronously
    this.processDataDeletion(id).catch(console.error);

    return deletionRequest;
  }

  /**
   * Process data deletion
   */
  private static async processDataDeletion(requestId: string): Promise<void> {
    try {
      await db('data_deletion_requests')
        .where({ id: requestId })
        .update({ status: 'processing' });

      const request = await db('data_deletion_requests')
        .where({ id: requestId })
        .first();

      if (!request) {
        throw new Error('Deletion request not found');
      }

      switch (request.deletionType) {
        case 'full':
          await this.performFullDeletion(request.email);
          break;
        case 'anonymization':
          await this.performAnonymization(request.email);
          break;
        case 'retention_only':
          await this.markForRetention(request.email);
          break;
      }

      await db('data_deletion_requests')
        .where({ id: requestId })
        .update({
          status: 'completed',
          completedDate: new Date()
        });

      await AuditService.logSystemEvent('data_deletion_completed', {
        requestId,
        email: request.email,
        deletionType: request.deletionType
      });

    } catch (error) {
      await db('data_deletion_requests')
        .where({ id: requestId })
        .update({ status: 'failed' });

      await AuditService.logSystemEvent('data_deletion_failed', {
        requestId,
        error: error.message
      }, 'high', false, error.message);
    }
  }

  /**
   * Perform full data deletion
   */
  private static async performFullDeletion(email: string): Promise<void> {
    const trx = await db.transaction();
    
    try {
      // Delete in order to respect foreign key constraints
      await trx('activities')
        .whereIn('leadId', trx('leads').select('id').where({ email }))
        .del();
      
      await trx('tasks')
        .whereIn('leadId', trx('leads').select('id').where({ email }))
        .del();
      
      await trx('communication_history')
        .whereIn('leadId', trx('leads').select('id').where({ email }))
        .del();
      
      await trx('leads').where({ email }).del();
      await trx('users').where({ email }).del();
      await trx('consent_records').where({ email }).del();
      
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Perform data anonymization
   */
  private static async performAnonymization(email: string): Promise<void> {
    const anonymizedEmail = `anonymized_${Date.now()}@deleted.local`;
    const anonymizedName = 'Anonymized User';
    
    const trx = await db.transaction();
    
    try {
      // Anonymize user data
      await trx('users')
        .where({ email })
        .update({
          name: anonymizedName,
          email: anonymizedEmail,
          phone: null,
          mobile: null
        });
      
      // Anonymize lead data
      await trx('leads')
        .where({ email })
        .update({
          contactName: anonymizedName,
          email: anonymizedEmail,
          phone: null,
          mobile: null,
          notes: 'Data anonymized per GDPR request'
        });
      
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Mark data for retention (legal hold)
   */
  private static async markForRetention(email: string): Promise<void> {
    const retentionUntil = new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000); // 7 years
    
    await db('leads')
      .where({ email })
      .update({
        gdprRetention: true,
        retentionUntil,
        notes: db.raw("COALESCE(notes, '') || '\n[GDPR] Data marked for legal retention'")
      });
  }

  /**
   * Get GDPR compliance report
   */
  static async getComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    const [
      consentStats,
      exportRequests,
      deletionRequests,
      retentionData
    ] = await Promise.all([
      // Consent statistics
      db('consent_records')
        .select('consentType')
        .count('* as total')
        .sum(db.raw('CASE WHEN consentGiven = true THEN 1 ELSE 0 END as given'))
        .sum(db.raw('CASE WHEN withdrawalDate IS NOT NULL THEN 1 ELSE 0 END as withdrawn'))
        .where('consentDate', '>=', startDate)
        .where('consentDate', '<=', endDate)
        .groupBy('consentType'),
      
      // Export requests
      db('data_export_requests')
        .select('status')
        .count('* as count')
        .where('requestDate', '>=', startDate)
        .where('requestDate', '<=', endDate)
        .groupBy('status'),
      
      // Deletion requests
      db('data_deletion_requests')
        .select('status', 'deletionType')
        .count('* as count')
        .where('requestDate', '>=', startDate)
        .where('requestDate', '<=', endDate)
        .groupBy('status', 'deletionType'),
      
      // Data retention
      db('leads')
        .count('* as totalLeads')
        .sum(db.raw('CASE WHEN gdprRetention = true THEN 1 ELSE 0 END as retentionMarked'))
        .first()
    ]);

    return {
      period: { startDate, endDate },
      consent: consentStats,
      exports: exportRequests,
      deletions: deletionRequests,
      retention: retentionData
    };
  }
}