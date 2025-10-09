import db from '../config/database';
import { Workflow, WorkflowExecution, ApprovalRequest } from '../models/Workflow';
import { workflowEngine } from './workflowEngine';
import { logger } from '../utils/logger';

export class WorkflowService {
  /**
   * Create a new workflow
   */
  async createWorkflow(workflowData: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'lastExecuted'>): Promise<Workflow> {
    try {
      const workflow = await db('workflows').insert({
        name: workflowData.name,
        description: workflowData.description,
        trigger: workflowData.trigger,
        actions: workflowData.actions,
        is_active: workflowData.isActive,
        priority: workflowData.priority,
        created_by: workflowData.createdBy,
        execution_count: 0
      }).returning('*');

      logger.info(`Workflow created: ${workflow[0].id}`);
      return this.mapWorkflowFromDb(workflow[0]);
    } catch (error) {
      logger.error('Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(id: string): Promise<Workflow | null> {
    try {
      const workflow = await db('workflows').where('id', id).first();
      return workflow ? this.mapWorkflowFromDb(workflow) : null;
    } catch (error) {
      logger.error('Error getting workflow:', error);
      throw error;
    }
  }

  /**
   * Get all workflows with optional filtering
   */
  async getWorkflows(filters: {
    isActive?: boolean;
    createdBy?: string;
    event?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ workflows: Workflow[]; total: number }> {
    try {
      let query = db('workflows');

      if (filters.isActive !== undefined) {
        query = query.where('is_active', filters.isActive);
      }

      if (filters.createdBy) {
        query = query.where('created_by', filters.createdBy);
      }

      if (filters.event) {
        query = query.whereRaw("trigger->>'event' = ?", [filters.event]);
      }

      // Get total count
      const totalQuery = query.clone();
      const totalResult = await totalQuery.count('* as count').first();
      const total = parseInt(totalResult?.count as string) || 0;

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      const workflows = await query.orderBy('priority', 'desc').orderBy('created_at', 'desc');

      return {
        workflows: workflows.map(this.mapWorkflowFromDb),
        total
      };
    } catch (error) {
      logger.error('Error getting workflows:', error);
      throw error;
    }
  }

  /**
   * Update workflow
   */
  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    try {
      const updateData: any = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.trigger !== undefined) updateData.trigger = updates.trigger;
      if (updates.actions !== undefined) updateData.actions = updates.actions;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.priority !== undefined) updateData.priority = updates.priority;

      const workflow = await db('workflows')
        .where('id', id)
        .update(updateData)
        .returning('*');

      if (!workflow.length) {
        throw new Error('Workflow not found');
      }

      logger.info(`Workflow updated: ${id}`);
      return this.mapWorkflowFromDb(workflow[0]);
    } catch (error) {
      logger.error('Error updating workflow:', error);
      throw error;
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    try {
      const deleted = await db('workflows').where('id', id).del();
      
      if (!deleted) {
        throw new Error('Workflow not found');
      }

      logger.info(`Workflow deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting workflow:', error);
      throw error;
    }
  }

  /**
   * Execute workflow manually
   */
  async executeWorkflow(
    workflowId: string,
    leadId: string,
    triggeredBy: string,
    context: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    try {
      return await workflowEngine.executeWorkflow(workflowId, leadId, triggeredBy, context);
    } catch (error) {
      logger.error('Error executing workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow executions
   */
  async getWorkflowExecutions(filters: {
    workflowId?: string;
    leadId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ executions: WorkflowExecution[]; total: number }> {
    try {
      let query = db('workflow_executions');

      if (filters.workflowId) {
        query = query.where('workflow_id', filters.workflowId);
      }

      if (filters.leadId) {
        query = query.where('lead_id', filters.leadId);
      }

      if (filters.status) {
        query = query.where('status', filters.status);
      }

      // Get total count
      const totalQuery = query.clone();
      const totalResult = await totalQuery.count('* as count').first();
      const total = parseInt(totalResult?.count as string) || 0;

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      const executions = await query.orderBy('created_at', 'desc');

      return {
        executions: executions.map(this.mapWorkflowExecutionFromDb),
        total
      };
    } catch (error) {
      logger.error('Error getting workflow executions:', error);
      throw error;
    }
  }

  /**
   * Get workflow execution by ID
   */
  async getWorkflowExecutionById(id: string): Promise<WorkflowExecution | null> {
    try {
      const execution = await db('workflow_executions').where('id', id).first();
      return execution ? this.mapWorkflowExecutionFromDb(execution) : null;
    } catch (error) {
      logger.error('Error getting workflow execution:', error);
      throw error;
    }
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflowExecution(id: string): Promise<void> {
    try {
      const updated = await db('workflow_executions')
        .where('id', id)
        .where('status', 'in', ['pending', 'running'])
        .update({
          status: 'cancelled',
          completed_at: new Date()
        });

      if (!updated) {
        throw new Error('Workflow execution not found or cannot be cancelled');
      }

      logger.info(`Workflow execution cancelled: ${id}`);
    } catch (error) {
      logger.error('Error cancelling workflow execution:', error);
      throw error;
    }
  }

  /**
   * Get approval requests
   */
  async getApprovalRequests(filters: {
    status?: string;
    approverRole?: string;
    approver?: string;
    leadId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ requests: ApprovalRequest[]; total: number }> {
    try {
      let query = db('approval_requests');

      if (filters.status) {
        query = query.where('status', filters.status);
      }

      if (filters.approverRole) {
        query = query.where('approver_role', filters.approverRole);
      }

      if (filters.approver) {
        query = query.where('approver', filters.approver);
      }

      if (filters.leadId) {
        query = query.where('lead_id', filters.leadId);
      }

      // Get total count
      const totalQuery = query.clone();
      const totalResult = await totalQuery.count('* as count').first();
      const total = parseInt(totalResult?.count as string) || 0;

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      const requests = await query.orderBy('created_at', 'desc');

      return {
        requests: requests.map(this.mapApprovalRequestFromDb),
        total
      };
    } catch (error) {
      logger.error('Error getting approval requests:', error);
      throw error;
    }
  }

  /**
   * Respond to approval request
   */
  async respondToApprovalRequest(
    id: string,
    approverId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ): Promise<ApprovalRequest> {
    const trx = await db.transaction();

    try {
      // Update approval request
      const request = await trx('approval_requests')
        .where('id', id)
        .where('status', 'pending')
        .update({
          approver: approverId,
          status,
          reason,
          responded_at: new Date()
        })
        .returning('*');

      if (!request.length) {
        throw new Error('Approval request not found or already processed');
      }

      const approvalRequest = this.mapApprovalRequestFromDb(request[0]);

      // If approved, continue workflow execution
      if (status === 'approved') {
        // Resume workflow execution
        await trx('workflow_executions')
          .where('id', approvalRequest.workflowExecutionId)
          .update('status', 'pending');
      } else {
        // Cancel workflow execution
        await trx('workflow_executions')
          .where('id', approvalRequest.workflowExecutionId)
          .update({
            status: 'cancelled',
            completed_at: new Date(),
            error: `Approval rejected: ${reason || 'No reason provided'}`
          });
      }

      await trx.commit();

      logger.info(`Approval request ${status}: ${id}`);
      return approvalRequest;
    } catch (error) {
      await trx.rollback();
      logger.error('Error responding to approval request:', error);
      throw error;
    }
  }

  /**
   * Expire old approval requests
   */
  async expireOldApprovalRequests(): Promise<number> {
    try {
      const expired = await db('approval_requests')
        .where('status', 'pending')
        .where('expires_at', '<', new Date())
        .update({
          status: 'expired',
          responded_at: new Date()
        });

      if (expired > 0) {
        logger.info(`Expired ${expired} approval requests`);
      }

      return expired;
    } catch (error) {
      logger.error('Error expiring approval requests:', error);
      throw error;
    }
  }

  /**
   * Map workflow from database format
   */
  private mapWorkflowFromDb(row: any): Workflow {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      trigger: row.trigger,
      actions: row.actions,
      isActive: row.is_active,
      priority: row.priority,
      createdBy: row.created_by,
      lastExecuted: row.last_executed,
      executionCount: row.execution_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Map workflow execution from database format
   */
  private mapWorkflowExecutionFromDb(row: any): WorkflowExecution {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      leadId: row.lead_id,
      triggeredBy: row.triggered_by,
      status: row.status,
      context: row.context,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      error: row.error,
      executedActions: row.executed_actions || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Map approval request from database format
   */
  private mapApprovalRequestFromDb(row: any): ApprovalRequest {
    return {
      id: row.id,
      workflowExecutionId: row.workflow_execution_id,
      leadId: row.lead_id,
      requestedBy: row.requested_by,
      approverRole: row.approver_role,
      approver: row.approver,
      status: row.status,
      requestData: row.request_data,
      reason: row.reason,
      respondedAt: row.responded_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const workflowService = new WorkflowService();