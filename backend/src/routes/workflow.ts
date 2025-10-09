import { Router } from 'express';
import { workflowController } from '../controllers/workflowController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Workflow CRUD routes
router.post('/', workflowController.createWorkflow.bind(workflowController));
router.get('/', workflowController.getWorkflows.bind(workflowController));
router.get('/:id', workflowController.getWorkflow.bind(workflowController));
router.put('/:id', workflowController.updateWorkflow.bind(workflowController));
router.delete('/:id', workflowController.deleteWorkflow.bind(workflowController));

// Workflow execution routes
router.post('/:id/execute', workflowController.executeWorkflow.bind(workflowController));
router.get('/executions', workflowController.getWorkflowExecutions.bind(workflowController));
router.get('/executions/:id', workflowController.getWorkflowExecution.bind(workflowController));
router.post('/executions/:id/cancel', workflowController.cancelWorkflowExecution.bind(workflowController));

// Approval request routes
router.get('/approvals', workflowController.getApprovalRequests.bind(workflowController));
router.post('/approvals/:id/respond', workflowController.respondToApprovalRequest.bind(workflowController));

// Manual trigger route
router.post('/trigger/manual', workflowController.triggerManualWorkflow.bind(workflowController));

export default router;