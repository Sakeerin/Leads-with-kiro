import { Request, Response } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}
import { workflowService } from '../services/workflowService';
import { workflowTrigger } from '../services/workflowTrigger';
import { logger } from '../utils/logger';

export class WorkflowController {
  /**
   * Create a new workflow
   */
  async createWorkflow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const workflowData = {
        ...req.body,
        createdBy: req.user?.id
      };

      const workflow = await workflowService.createWorkflow(workflowData);
      
      res.status(201).json({
        success: true,
        data: workflow
      });
    } catch (error) {
      logger.error('Error creating workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create workflow'
      });
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const workflow = await workflowService.getWorkflowById(id);

      if (!workflow) {
        res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
        return;
      }

      res.json({
        success: true,
        data: workflow
      });
    } catch (error) {
      logger.error('Error getting workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow'
      });
    }
  }

  /**
   * Get all workflows
   */
  async getWorkflows(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters: {
        isActive?: boolean;
        createdBy?: string;
        event?: string;
        limit?: number;
        offset?: number;
      } = {};

      if (req.query.isActive) {
        filters.isActive = req.query.isActive === 'true';
      }
      if (req.query.createdBy) {
        filters.createdBy = req.query.createdBy as string;
      }
      if (req.query.event) {
        filters.event = req.query.event as string;
      }
      if (req.query.limit) {
        filters.limit = parseInt(req.query.limit as string);
      }
      if (req.query.offset) {
        filters.offset = parseInt(req.query.offset as string);
      }

      const result = await workflowService.getWorkflows(filters);

      res.json({
        success: true,
        data: result.workflows,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset
        }
      });
    } catch (error) {
      logger.error('Error getting workflows:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workflows'
      });
    }
  }

  /**
   * Update workflow
   */
  async updateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const workflow = await workflowService.updateWorkflow(id, req.body);

      res.json({
        success: true,
        data: workflow
      });
    } catch (error) {
      logger.error('Error updating workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update workflow'
      });
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await workflowService.deleteWorkflow(id);

      res.json({
        success: true,
        message: 'Workflow deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete workflow'
      });
    }
  }

  /**
   * Execute workflow manually
   */
  async executeWorkflow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { leadId, context = {} } = req.body;

      if (!leadId) {
        res.status(400).json({
          success: false,
          error: 'Lead ID is required'
        });
        return;
      }

      const execution = await workflowService.executeWorkflow(
        id,
        leadId,
        req.user?.id || 'system',
        context
      );

      res.json({
        success: true,
        data: execution
      });
    } catch (error) {
      logger.error('Error executing workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute workflow'
      });
    }
  }

  /**
   * Get workflow executions
   */
  async getWorkflowExecutions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters: {
        workflowId?: string;
        leadId?: string;
        status?: string;
        limit?: number;
        offset?: number;
      } = {};

      if (req.query.workflowId) {
        filters.workflowId = req.query.workflowId as string;
      }
      if (req.query.leadId) {
        filters.leadId = req.query.leadId as string;
      }
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      if (req.query.limit) {
        filters.limit = parseInt(req.query.limit as string);
      }
      if (req.query.offset) {
        filters.offset = parseInt(req.query.offset as string);
      }

      const result = await workflowService.getWorkflowExecutions(filters);

      res.json({
        success: true,
        data: result.executions,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset
        }
      });
    } catch (error) {
      logger.error('Error getting workflow executions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow executions'
      });
    }
  }

  /**
   * Get workflow execution by ID
   */
  async getWorkflowExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const execution = await workflowService.getWorkflowExecutionById(id);

      if (!execution) {
        res.status(404).json({
          success: false,
          error: 'Workflow execution not found'
        });
        return;
      }

      res.json({
        success: true,
        data: execution
      });
    } catch (error) {
      logger.error('Error getting workflow execution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow execution'
      });
    }
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflowExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await workflowService.cancelWorkflowExecution(id);

      res.json({
        success: true,
        message: 'Workflow execution cancelled successfully'
      });
    } catch (error) {
      logger.error('Error cancelling workflow execution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel workflow execution'
      });
    }
  }

  /**
   * Get approval requests
   */
  async getApprovalRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const filters: {
        status?: string;
        approverRole?: string;
        approver?: string;
        leadId?: string;
        limit?: number;
        offset?: number;
      } = {};

      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      if (req.query.approverRole) {
        filters.approverRole = req.query.approverRole as string;
      }
      if (req.query.approver) {
        filters.approver = req.query.approver as string;
      }
      if (req.query.leadId) {
        filters.leadId = req.query.leadId as string;
      }
      if (req.query.limit) {
        filters.limit = parseInt(req.query.limit as string);
      }
      if (req.query.offset) {
        filters.offset = parseInt(req.query.offset as string);
      }

      const result = await workflowService.getApprovalRequests(filters);

      res.json({
        success: true,
        data: result.requests,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset
        }
      });
    } catch (error) {
      logger.error('Error getting approval requests:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get approval requests'
      });
    }
  }

  /**
   * Respond to approval request
   */
  async respondToApprovalRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Status must be either approved or rejected'
        });
        return;
      }

      const request = await workflowService.respondToApprovalRequest(
        id,
        req.user?.id || 'system',
        status,
        reason
      );

      res.json({
        success: true,
        data: request
      });
    } catch (error) {
      logger.error('Error responding to approval request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to respond to approval request'
      });
    }
  }

  /**
   * Trigger manual workflow
   */
  async triggerManualWorkflow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { leadId, context = {} } = req.body;

      if (!leadId) {
        res.status(400).json({
          success: false,
          error: 'Lead ID is required'
        });
        return;
      }

      await workflowTrigger.triggerManual(
        leadId,
        req.user?.id || 'system',
        context
      );

      res.json({
        success: true,
        message: 'Manual workflows triggered successfully'
      });
    } catch (error) {
      logger.error('Error triggering manual workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger manual workflow'
      });
    }
  }
}

export const workflowController = new WorkflowController();