import { Router } from 'express';
import { SecurityController } from '../controllers/securityController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { 
  handleValidationErrors,
  commonValidations,
  userValidationRules
} from '../middleware/validation';
import { 
  generalRateLimit,
  authRateLimit,
  customRateLimiter
} from '../middleware/rateLimiting';
import { body, param, query } from 'express-validator';

const router = Router();

// Apply general rate limiting to all security routes
router.use(generalRateLimit);

/**
 * Audit Logs Routes
 */
router.get('/audit-logs',
  authenticateToken,
  requireRole(['admin', 'manager']),
  [
    query('userId').optional().isUUID().withMessage('Valid user ID required'),
    query('action').optional().trim().isLength({ max: 100 }),
    query('resource').optional().trim().isLength({ max: 100 }),
    query('category').optional().isIn(['authentication', 'authorization', 'data_access', 'data_modification', 'system', 'security']),
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('startDate').optional().isISO8601().withMessage('Valid start date required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  SecurityController.getAuditLogs
);

router.get('/security-alerts',
  authenticateToken,
  requireRole(['admin', 'manager']),
  [
    query('hours').optional().isInt({ min: 1, max: 168 }).withMessage('Hours must be between 1 and 168')
  ],
  handleValidationErrors,
  SecurityController.getSecurityAlerts
);

/**
 * GDPR Compliance Routes
 */
router.post('/consent',
  authenticateToken,
  [
    body('userId').optional().isUUID().withMessage('Valid user ID required'),
    body('leadId').optional().isUUID().withMessage('Valid lead ID required'),
    commonValidations.email,
    body('consentType').isIn(['marketing', 'analytics', 'functional', 'data_processing']).withMessage('Valid consent type required'),
    body('consentGiven').isBoolean().withMessage('Consent given must be boolean'),
    body('consentMethod').isIn(['explicit', 'implicit', 'legitimate_interest']).withMessage('Valid consent method required')
  ],
  handleValidationErrors,
  SecurityController.recordConsent
);

router.post('/consent/withdraw',
  authenticateToken,
  [
    commonValidations.email,
    body('consentType').isIn(['marketing', 'analytics', 'functional', 'data_processing']).withMessage('Valid consent type required'),
    body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Reason is required and cannot exceed 500 characters')
  ],
  handleValidationErrors,
  SecurityController.withdrawConsent
);

router.get('/consent/:email',
  authenticateToken,
  requireRole(['admin', 'manager']),
  [
    param('email').isEmail().normalizeEmail().withMessage('Valid email required')
  ],
  handleValidationErrors,
  SecurityController.getUserConsents
);

router.post('/data-export',
  customRateLimiter.createMiddleware('data_export', 3, 60 * 60 * 1000), // 3 per hour
  authenticateToken,
  [
    commonValidations.email
  ],
  handleValidationErrors,
  SecurityController.requestDataExport
);

router.post('/data-deletion',
  customRateLimiter.createMiddleware('data_deletion', 1, 24 * 60 * 60 * 1000), // 1 per day
  authenticateToken,
  [
    commonValidations.email,
    body('deletionType').isIn(['full', 'anonymization', 'retention_only']).withMessage('Valid deletion type required'),
    body('reason').trim().isLength({ min: 1, max: 1000 }).withMessage('Reason is required and cannot exceed 1000 characters')
  ],
  handleValidationErrors,
  SecurityController.requestDataDeletion
);

router.get('/compliance-report',
  authenticateToken,
  requireRole(['admin']),
  [
    query('startDate').isISO8601().withMessage('Valid start date required'),
    query('endDate').isISO8601().withMessage('Valid end date required')
  ],
  handleValidationErrors,
  SecurityController.getComplianceReport
);

/**
 * Multi-Factor Authentication Routes
 */
router.get('/mfa/setup',
  authenticateToken,
  SecurityController.setupMFA
);

router.post('/mfa/enable',
  authRateLimit, // Stricter rate limiting for MFA operations
  authenticateToken,
  [
    body('deviceName').trim().isLength({ min: 1, max: 100 }).withMessage('Device name is required'),
    body('deviceType').isIn(['totp', 'sms', 'email']).withMessage('Valid device type required'),
    body('secret').isLength({ min: 16 }).withMessage('Valid secret required'),
    body('verificationCode').matches(/^\d{6}$/).withMessage('Valid 6-digit verification code required'),
    body('phoneNumber').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Valid phone number required'),
    body('email').optional().isEmail().withMessage('Valid email required')
  ],
  handleValidationErrors,
  SecurityController.enableMFA
);

router.post('/mfa/disable',
  authRateLimit,
  authenticateToken,
  SecurityController.disableMFA
);

router.post('/mfa/verify',
  authRateLimit,
  authenticateToken,
  [
    body('code').matches(/^[A-Z0-9]{6,8}$/).withMessage('Valid MFA code required')
  ],
  handleValidationErrors,
  SecurityController.verifyMFA
);

router.get('/mfa/devices',
  authenticateToken,
  SecurityController.getMFADevices
);

router.post('/mfa/backup-codes/regenerate',
  customRateLimiter.createMiddleware('backup_codes', 3, 24 * 60 * 60 * 1000), // 3 per day
  authenticateToken,
  SecurityController.regenerateBackupCodes
);

router.post('/mfa/send-sms',
  customRateLimiter.createMiddleware('mfa_sms', 5, 60 * 60 * 1000), // 5 per hour
  authenticateToken,
  [
    body('phoneNumber').matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Valid phone number required')
  ],
  handleValidationErrors,
  SecurityController.sendSMSCode
);

router.post('/mfa/send-email',
  customRateLimiter.createMiddleware('mfa_email', 5, 60 * 60 * 1000), // 5 per hour
  authenticateToken,
  [
    commonValidations.email
  ],
  handleValidationErrors,
  SecurityController.sendEmailCode
);

export default router;