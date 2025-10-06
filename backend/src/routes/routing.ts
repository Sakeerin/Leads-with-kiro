import { Router } from 'express';
import { RoutingController } from '../controllers/routingController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Lead assignment routes
router.post('/leads/:leadId/assign', RoutingController.assignLead);
router.post('/leads/:leadId/reassign', RoutingController.reassignLead);

// Workload management routes
router.get('/workloads', RoutingController.getUserWorkloads);
router.get('/workloads/:userId', RoutingController.getUserWorkload);

// SLA management routes
router.get('/leads/:leadId/sla', RoutingController.checkSLACompliance);
router.get('/sla/overdue', RoutingController.getOverdueLeads);
router.post('/sla/escalate', RoutingController.escalateOverdueLeads);

// Assignment statistics
router.get('/statistics', RoutingController.getAssignmentStatistics);

// Assignment rules management
router.get('/rules', RoutingController.getAssignmentRules);
router.post('/rules', RoutingController.createAssignmentRule);
router.get('/rules/:ruleId', RoutingController.getAssignmentRule);
router.put('/rules/:ruleId', RoutingController.updateAssignmentRule);
router.delete('/rules/:ruleId', RoutingController.deleteAssignmentRule);

// Assignment rule actions
router.post('/rules/:ruleId/activate', RoutingController.activateAssignmentRule);
router.post('/rules/:ruleId/deactivate', RoutingController.deactivateAssignmentRule);
router.post('/rules/reorder', RoutingController.reorderAssignmentRules);

// Assignment rule statistics
router.get('/rules/statistics', RoutingController.getAssignmentRuleStatistics);

export default router;