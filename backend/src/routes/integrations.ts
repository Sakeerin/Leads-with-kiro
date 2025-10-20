import express from 'express';
import { IntegrationsController } from '../controllers/integrationsController';
import { auth } from '../middleware/auth';
import { MetaLeadAdsWebhookHandler, GoogleFormsWebhookHandler, GenericWebhookHandler, webhookService } from '../services/webhookService';

const router = express.Router();
const integrationsController = new IntegrationsController();

// Initialize webhook handlers
const metaHandler = new MetaLeadAdsWebhookHandler(webhookService);
const googleFormsHandler = new GoogleFormsWebhookHandler(webhookService);
const genericHandler = new GenericWebhookHandler(webhookService);

// Email service integration routes
router.get('/email/providers', auth, integrationsController.getEmailProviders);
router.post('/email/configure', auth, integrationsController.configureEmailProvider);
router.post('/email/send', auth, integrationsController.sendEmail);
router.get('/email/folders/:provider', auth, integrationsController.getEmailFolders);
router.get('/email/messages/:provider', auth, integrationsController.getEmails);

// Calendar integration routes
router.get('/calendar/providers', auth, integrationsController.getCalendarProviders);
router.post('/calendar/configure', auth, integrationsController.configureCalendarProvider);
router.post('/calendar/events', auth, integrationsController.createCalendarEvent);
router.put('/calendar/events/:eventId', auth, integrationsController.updateCalendarEvent);
router.delete('/calendar/events/:eventId', auth, integrationsController.deleteCalendarEvent);
router.get('/calendar/events', auth, integrationsController.getCalendarEvents);
router.post('/calendar/availability', auth, integrationsController.getAvailability);

// CRM integration routes
router.get('/crm/providers', auth, integrationsController.getCRMProviders);
router.post('/crm/configure', auth, integrationsController.configureCRMIntegration);
router.get('/crm/configurations', auth, integrationsController.getCRMConfigurations);
router.post('/crm/sync/lead/:leadId', auth, integrationsController.syncLeadToCRM);
router.post('/crm/sync/account/:accountId', auth, integrationsController.syncAccountToCRM);
router.post('/crm/sync/contact/:contactId', auth, integrationsController.syncContactToCRM);
router.post('/crm/sync/opportunity/:opportunityId', auth, integrationsController.syncOpportunityToCRM);
router.post('/crm/pull/:configId/:entityType', auth, integrationsController.pullDataFromCRM);

// Webhook management routes
router.get('/webhooks', auth, integrationsController.getWebhooks);
router.post('/webhooks', auth, integrationsController.createWebhook);
router.put('/webhooks/:webhookId', auth, integrationsController.updateWebhook);
router.delete('/webhooks/:webhookId', auth, integrationsController.deleteWebhook);

// Public webhook endpoints (no auth required)
router.post('/webhooks/meta', metaHandler.handleMetaWebhook.bind(metaHandler));
router.post('/webhooks/google-forms', googleFormsHandler.handleGoogleFormsWebhook.bind(googleFormsHandler));
router.post('/webhooks/:webhookId', (req, res) => {
  genericHandler.handleGenericWebhook(req.params.webhookId, req, res);
});

// Webhook verification endpoints
router.get('/webhooks/meta', (req, res) => {
  // Meta webhook verification
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token']) {
    const verifyToken = process.env.META_VERIFY_TOKEN;
    if (req.query['hub.verify_token'] === verifyToken) {
      res.status(200).send(req.query['hub.challenge']);
    } else {
      res.status(403).send('Forbidden');
    }
  } else {
    res.status(400).send('Bad Request');
  }
});

export default router;