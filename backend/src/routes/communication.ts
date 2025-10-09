import { Router } from 'express';
import { CommunicationController } from '../controllers/communicationController';
import { CommunicationService } from '../services/communicationService';
import { auth } from '../middleware/auth';

// Initialize communication service with configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
};

const communicationService = new CommunicationService({ email: emailConfig });
const communicationController = new CommunicationController(communicationService);

const router = Router();

// Email Templates
router.post('/templates', auth, communicationController.createEmailTemplate);
router.get('/templates', auth, communicationController.getEmailTemplates);
router.get('/templates/:templateId', auth, communicationController.getEmailTemplate);
router.put('/templates/:templateId', auth, communicationController.updateEmailTemplate);
router.delete('/templates/:templateId', auth, communicationController.deleteEmailTemplate);

// Email Sending
router.post('/emails/send', auth, communicationController.sendEmail);
router.post('/emails/send-templated', auth, communicationController.sendTemplatedEmail);
router.post('/emails/send-bulk', auth, communicationController.sendBulkEmails);

// Email Processing
router.post('/emails/inbound', communicationController.processInboundEmail); // No auth for webhook
router.get('/emails/track/open/:messageId', communicationController.trackEmailOpen); // No auth for tracking pixel
router.get('/emails/track/click/:messageId', communicationController.trackEmailClick); // No auth for click tracking

// Communication History
router.get('/history/:leadId', auth, communicationController.getCommunicationHistory);
router.post('/history', auth, communicationController.logCommunication);
router.get('/history/:leadId/type', auth, communicationController.getCommunicationsByType);

// Calendar Integration
router.post('/schedule', auth, communicationController.scheduleFollowUp);

// Follow-up Sequences
router.post('/sequences', auth, communicationController.createFollowUpSequence);

// Analytics
router.get('/metrics/email', auth, communicationController.getEmailMetrics);
router.get('/metrics/communication', auth, communicationController.getCommunicationMetrics);
router.get('/stats/communication', auth, communicationController.getCommunicationStats);

export default router;