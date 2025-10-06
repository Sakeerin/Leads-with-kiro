import { Router } from 'express';
import { LeadController } from '../controllers/leadController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Lead CRUD operations
router.post('/', LeadController.createLead);
router.get('/search', LeadController.searchLeads);
router.get('/my-leads', LeadController.getMyLeads);
router.get('/statistics', LeadController.getLeadStatistics);
router.post('/detect-duplicates', LeadController.detectDuplicates);
router.put('/bulk-update', LeadController.bulkUpdateLeads);

// Status-based routes
router.get('/status/:status', LeadController.getLeadsByStatus);

// Individual lead operations
router.get('/account/:accountId', LeadController.getLeadByAccountId);
router.get('/:id', LeadController.getLeadById);
router.put('/:id', LeadController.updateLead);
router.delete('/:id', LeadController.deleteLead);
router.post('/:id/restore', LeadController.restoreLead);

export default router;