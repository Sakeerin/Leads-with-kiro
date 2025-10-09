import { Router } from 'express';
import { LeadConversionController } from '../controllers/leadConversionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Lead conversion routes
router.get('/leads/:id/conversion/preview', LeadConversionController.getConversionPreview);
router.post('/leads/:id/convert', LeadConversionController.convertLead);
router.post('/leads/:id/close', LeadConversionController.closeLead);
router.get('/leads/:id/conversions', LeadConversionController.getConversionHistory);

// Conversion statistics
router.get('/conversions/statistics', LeadConversionController.getConversionStatistics);

export default router;