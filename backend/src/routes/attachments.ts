import { Router } from 'express';
import { AttachmentController } from '../controllers/attachmentController';
import { AttachmentService } from '../services/attachmentService';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const attachmentService = AttachmentService.create();
const attachmentController = new AttachmentController(attachmentService);

// All routes require authentication
router.use(authenticateToken);

// Upload single attachment to a lead
router.post(
  '/leads/:leadId/attachments',
  attachmentController.uploadSingle,
  attachmentController.uploadAttachment.bind(attachmentController)
);

// Upload multiple attachments to a lead
router.post(
  '/leads/:leadId/attachments/bulk',
  attachmentController.uploadMultiple,
  attachmentController.uploadMultipleAttachments.bind(attachmentController)
);

// Get all attachments for a lead
router.get(
  '/leads/:leadId/attachments',
  attachmentController.getAttachmentsByLead.bind(attachmentController)
);

// Get attachment info
router.get(
  '/attachments/:attachmentId',
  attachmentController.getAttachmentInfo.bind(attachmentController)
);

// Download attachment
router.get(
  '/attachments/:attachmentId/download',
  attachmentController.downloadAttachment.bind(attachmentController)
);

// Get signed download URL
router.get(
  '/attachments/:attachmentId/signed-url',
  attachmentController.getSignedDownloadUrl.bind(attachmentController)
);

// Delete attachment
router.delete(
  '/attachments/:attachmentId',
  attachmentController.deleteAttachment.bind(attachmentController)
);

export default router;