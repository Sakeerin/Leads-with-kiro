import db from '../config/database';
import { Request } from 'express';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export interface AuditLogEntry {
  id?: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system' | 'security';
  success: boolean;
  errorMessage?: string;
}

/**
 * Audit logging service for security-relevant actions
 */
export class AuditService {
  /**
   * Log security-relevant action
   */
  static async logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      await db('audit_logs').insert({
        ...entry,
        timestamp: new Date(),
        details: entry.details ? JSON.stringify(entry.details) : null
      });
    } catch (error) {
      // Log to console if database logging fails
      console.error('Failed to write audit log:', error);
      console.error('Audit entry:', entry);
    }
  }

  /**
   * Log authentication events
   */
  static async logAuthentication(
    action: 'login' | 'logout' | 'login_failed' | 'password_reset' | 'password_changed' | 'mfa_enabled' | 'mfa_disabled',
    req: Request,
    userId?: string,
    success: boolean = true,
    errorMessage?: string,
    additionalDetails?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      userId,
      action,
      resource: 'authentication',
      details: {
        ...additionalDetails,
        email: req.body?.email,
        loginMethod: req.body?.loginMethod || 'password'
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: success ? 'medium' : 'high',
      category: 'authentication',
      success,
      errorMessage
    });
  }

  /**
   * Log authorization events
   */
  static async logAuthorization(
    action: 'access_granted' | 'access_denied' | 'permission_changed' | 'role_changed',
    req: Request,
    resource: string,
    resourceId?: string,
    success: boolean = true,
    errorMessage?: string,
    additionalDetails?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      userId: req.user?.id,
      action,
      resource,
      resourceId,
      details: {
        ...additionalDetails,
        requiredPermission: req.route?.path,
        userRole: req.user?.role
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: success ? 'low' : 'high',
      category: 'authorization',
      success,
      errorMessage
    });
  }

  /**
   * Log data access events
   */
  static async logDataAccess(
    action: 'read' | 'search' | 'export' | 'view_sensitive',
    req: Request,
    resource: string,
    resourceId?: string,
    additionalDetails?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      userId: req.user?.id,
      action,
      resource,
      resourceId,
      details: {
        ...additionalDetails,
        query: req.query,
        filters: req.body?.filters
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'low',
      category: 'data_access',
      success: true
    });
  }

  /**
   * Log data modification events
   */
  static async logDataModification(
    action: 'create' | 'update' | 'delete' | 'merge' | 'import' | 'bulk_update',
    req: Request,
    resource: string,
    resourceId?: string,
    success: boolean = true,
    errorMessage?: string,
    additionalDetails?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      userId: req.user?.id,
      action,
      resource,
      resourceId,
      details: {
        ...additionalDetails,
        changes: req.body,
        originalData: additionalDetails?.['originalData']
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: action === 'delete' ? 'high' : 'medium',
      category: 'data_modification',
      success,
      errorMessage
    });
  }

  /**
   * Log system events
   */
  static async logSystemEvent(
    action: string,
    details?: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logAction({
      action,
      resource: 'system',
      details,
      severity,
      category: 'system',
      success,
      errorMessage
    });
  }

  /**
   * Log security events
   */
  static async logSecurityEvent(
    action: 'rate_limit_exceeded' | 'suspicious_activity' | 'malicious_request' | 'data_breach_attempt' | 'privilege_escalation',
    req: Request,
    severity: 'high' | 'critical' = 'high',
    additionalDetails?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      userId: req.user?.id,
      action,
      resource: 'security',
      details: {
        ...additionalDetails,
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        headers: req.headers
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity,
      category: 'security',
      success: false
    });
  }

  /**
   * Get audit logs with filtering
   */
  static async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    category?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ logs: AuditLogEntry[]; total: number }> {
    let query = db('audit_logs').select('*');

    // Apply filters
    if (filters.userId) {
      query = query.where('userId', filters.userId);
    }
    if (filters.action) {
      query = query.where('action', filters.action);
    }
    if (filters.resource) {
      query = query.where('resource', filters.resource);
    }
    if (filters.category) {
      query = query.where('category', filters.category);
    }
    if (filters.severity) {
      query = query.where('severity', filters.severity);
    }
    if (filters.startDate) {
      query = query.where('timestamp', '>=', filters.startDate);
    }
    if (filters.endDate) {
      query = query.where('timestamp', '<=', filters.endDate);
    }

    // Get total count
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count('* as count');
    const total = parseInt(count as string);

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const logs = await query
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .offset(offset);

    // Parse JSON details
    const parsedLogs = logs.map((log: any) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));

    return { logs: parsedLogs, total };
  }

  /**
   * Get security alerts (high/critical severity events)
   */
  static async getSecurityAlerts(hours: number = 24): Promise<AuditLogEntry[]> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const alerts = await db('audit_logs')
      .select('*')
      .whereIn('severity', ['high', 'critical'])
      .where('timestamp', '>=', startTime)
      .orderBy('timestamp', 'desc');

    return alerts.map((alert: any) => ({
      ...alert,
      details: alert.details ? JSON.parse(alert.details) : null
    }));
  }

  /**
   * Clean up old audit logs (retention policy)
   */
  static async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    const deletedCount = await db('audit_logs')
      .where('timestamp', '<', cutoffDate)
      .del();

    await this.logSystemEvent('audit_cleanup', {
      retentionDays,
      deletedCount,
      cutoffDate: cutoffDate.toISOString()
    });

    return deletedCount;
  }
}