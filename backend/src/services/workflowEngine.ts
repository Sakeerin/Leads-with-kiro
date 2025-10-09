import db from '../config/database';
import { Workflow, WorkflowExecution, WorkflowCondition, WorkflowAction, ApprovalRequest } from '../models/Workflow';
import { Lead } from '../types';
import { EmailService } from './emailService';
import { TaskService } from './taskService';
import { NotificationService } from './notificationService';
import { LeadService } from './leadService';
import { RoutingService } from './routingService';
import { logger } from '../utils/logger';

export class WorkflowEngine {
  /**
   * Execute workflows triggered by an event
   */
  async executeTriggeredWorkflows(
    event: string,
    leadId: string,
    triggeredBy: string,
    context: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Get active workflows for this event type
      const workflows = await this.getWorkflowsForEvent(event);
      
      for (const workflow of workflows) {
        // Check if workflow conditions are met
        if (await this.evaluateConditions(workflow.trigger.conditions || [], leadId, context)) {
          await this.executeWorkflow(workflow.id, leadId, triggeredBy, context);
        }
      }
    } catch (error) {
      logger.error('Error executing triggered workflows:', error);
      throw error;
    }
  }

  /**
   * Execute a specific workflow
   */
  async executeWorkflow(
    workflowId: string,
    leadId: string,
    triggeredBy: string,
    context: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    const trx = await db.transaction();
    
    try {
      // Get workflow details
      const workflow = await this.getWorkflowById(workflowId);
      if (!workflow || !workflow.isActive) {
        throw new Error('Workflow not found or inactive');
      }

      // Create workflow execution record
      const execution = await this.createWorkflowExecution(
        workflowId,
        leadId,
        triggeredBy,
        context,
        trx
      );

      // Update workflow execution count
      await trx('workflows')
        .where('id', workflowId)
        .increment('execution_count', 1)
        .update('last_executed', new Date());

      await trx.commit();

      // Execute actions asynchronously
      this.executeWorkflowActions(execution.id, workflow.actions);

      return execution;
    } catch (error) {
      await trx.rollback();
      logger.error('Error executing workflow:', error);
      throw error;
    }
  }

  /**
   * Execute workflow actions
   */
  private async executeWorkflowActions(
    executionId: string,
    actions: WorkflowAction[]
  ): Promise<void> {
    try {
      const execution = await this.getWorkflowExecution(executionId);
      if (!execution) {
        throw new Error('Workflow execution not found');
      }

      // Update execution status to running
      await this.updateExecutionStatus(executionId, 'running');

      const executedActions = [...execution.executedActions];

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (!action) continue;
        
        // Apply delay if specified
        if (action.delay && action.delay > 0) {
          await this.delay(action.delay * 60 * 1000); // Convert minutes to milliseconds
        }

        try {
          const result = await this.executeAction(action, execution);
          
          executedActions[i] = {
            actionIndex: i,
            status: 'completed',
            result,
            executedAt: new Date()
          };
        } catch (error: any) {
          executedActions[i] = {
            actionIndex: i,
            status: 'failed',
            error: error?.message || 'Unknown error',
            executedAt: new Date()
          };
          
          logger.error(`Action ${i} failed in workflow execution ${executionId}:`, error);
        }

        // Update executed actions
        await this.updateExecutedActions(executionId, executedActions);
      }

      // Mark execution as completed
      await this.updateExecutionStatus(executionId, 'completed', new Date());
    } catch (error: any) {
      await this.updateExecutionStatus(executionId, 'failed', new Date(), error?.message || 'Unknown error');
      logger.error('Error executing workflow actions:', error);
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: WorkflowAction,
    execution: WorkflowExecution
  ): Promise<any> {
    const lead = await LeadService.getLeadById(execution.leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    switch (action.type) {
      case 'send_email':
        return await this.executeSendEmailAction(action, lead, execution);
      
      case 'create_task':
        return await this.executeCreateTaskAction(action, lead, execution);
      
      case 'update_field':
        return await this.executeUpdateFieldAction(action, lead, execution);
      
      case 'assign_lead':
        return await this.executeAssignLeadAction(action, lead, execution);
      
      case 'send_notification':
        return await this.executeSendNotificationAction(action, lead, execution);
      
      case 'request_approval':
        return await this.executeRequestApprovalAction(action, lead, execution);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute send email action
   */
  private async executeSendEmailAction(
    action: WorkflowAction,
    lead: Lead,
    execution: WorkflowExecution
  ): Promise<any> {
    const { templateId, variables = {} } = action.parameters;
    
    return await EmailService.sendEmail(
      templateId,
      lead.id,
      { ...variables, ...execution.context }
    );
  }

  /**
   * Execute create task action
   */
  private async executeCreateTaskAction(
    action: WorkflowAction,
    lead: Lead,
    execution: WorkflowExecution
  ): Promise<any> {
    const { subject, description, type, priority, assignedTo, dueDate } = action.parameters;
    
    return await TaskService.createTask({
      leadId: lead.id,
      subject,
      description,
      type,
      priority,
      assignedTo: assignedTo || lead.assignment?.assignedTo,
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to 24 hours
      createdBy: execution.triggeredBy
    });
  }

  /**
   * Execute update field action
   */
  private async executeUpdateFieldAction(
    action: WorkflowAction,
    lead: Lead,
    execution: WorkflowExecution
  ): Promise<any> {
    const { field, value } = action.parameters;
    
    const updates: any = {};
    updates[field] = value;
    
    return await LeadService.updateLead(lead.id, updates, execution.triggeredBy);
  }

  /**
   * Execute assign lead action
   */
  private async executeAssignLeadAction(
    action: WorkflowAction,
    lead: Lead,
    execution: WorkflowExecution
  ): Promise<any> {
    const { assigneeId, reason } = action.parameters;
    
    return await RoutingService.assignLead(lead.id, assigneeId, reason || 'Workflow automation');
  }

  /**
   * Execute send notification action
   */
  private async executeSendNotificationAction(
    action: WorkflowAction,
    lead: Lead,
    execution: WorkflowExecution
  ): Promise<any> {
    const { recipientId, message, type = 'info' } = action.parameters;
    
    return await NotificationService.sendNotification({
      recipientId,
      message,
      type,
      relatedEntityType: 'lead',
      relatedEntityId: lead.id
    });
  }

  /**
   * Execute request approval action
   */
  private async executeRequestApprovalAction(
    action: WorkflowAction,
    lead: Lead,
    execution: WorkflowExecution
  ): Promise<any> {
    const { approverRole, requestData, expiresInHours = 24 } = action.parameters;
    
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    
    const approvalRequest = await db('approval_requests').insert({
      workflow_execution_id: execution.id,
      lead_id: lead.id,
      requested_by: execution.triggeredBy,
      approver_role: approverRole,
      request_data: requestData,
      expires_at: expiresAt
    }).returning('*');

    // Notify approvers
    await this.notifyApprovers(approverRole, approvalRequest[0]);
    
    return approvalRequest[0];
  }

  /**
   * Evaluate workflow conditions
   */
  private async evaluateConditions(
    conditions: WorkflowCondition[],
    leadId: string,
    context: Record<string, any>
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    const lead = await LeadService.getLeadById(leadId);
    if (!lead) {
      return false;
    }

    let result = true;
    let currentLogicalOperator = 'AND';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, lead, context);
      
      if (currentLogicalOperator === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
      
      currentLogicalOperator = condition.logicalOperator || 'AND';
    }

    return result;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: WorkflowCondition,
    lead: Lead,
    context: Record<string, any>
  ): boolean {
    const fieldValue = this.getFieldValue(condition.field, lead, context);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Get field value from lead or context
   */
  private getFieldValue(field: string, lead: Lead, context: Record<string, any>): any {
    // Check context first
    if (context.hasOwnProperty(field)) {
      return context[field];
    }

    // Navigate nested object properties
    const parts = field.split('.');
    let value: any = lead;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && value.hasOwnProperty(part)) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Get workflows for a specific event
   */
  private async getWorkflowsForEvent(event: string): Promise<Workflow[]> {
    const workflows = await db('workflows')
      .where('is_active', true)
      .whereRaw("trigger->>'event' = ?", [event])
      .orderBy('priority', 'desc');

    return workflows.map(this.mapWorkflowFromDb);
  }

  /**
   * Get workflow by ID
   */
  private async getWorkflowById(id: string): Promise<Workflow | null> {
    const workflow = await db('workflows').where('id', id).first();
    return workflow ? this.mapWorkflowFromDb(workflow) : null;
  }

  /**
   * Create workflow execution record
   */
  private async createWorkflowExecution(
    workflowId: string,
    leadId: string,
    triggeredBy: string,
    context: Record<string, any>,
    trx: any
  ): Promise<WorkflowExecution> {
    const execution = await trx('workflow_executions').insert({
      workflow_id: workflowId,
      lead_id: leadId,
      triggered_by: triggeredBy,
      context,
      status: 'pending'
    }).returning('*');

    return this.mapWorkflowExecutionFromDb(execution[0]);
  }

  /**
   * Get workflow execution
   */
  private async getWorkflowExecution(id: string): Promise<WorkflowExecution | null> {
    const execution = await db('workflow_executions').where('id', id).first();
    return execution ? this.mapWorkflowExecutionFromDb(execution) : null;
  }

  /**
   * Update execution status
   */
  private async updateExecutionStatus(
    id: string,
    status: string,
    completedAt?: Date,
    error?: string
  ): Promise<void> {
    const updates: any = { status };
    if (completedAt) updates.completed_at = completedAt;
    if (error) updates.error = error;

    await db('workflow_executions').where('id', id).update(updates);
  }

  /**
   * Update executed actions
   */
  private async updateExecutedActions(
    id: string,
    executedActions: any[]
  ): Promise<void> {
    await db('workflow_executions')
      .where('id', id)
      .update('executed_actions', JSON.stringify(executedActions));
  }

  /**
   * Notify approvers
   */
  private async notifyApprovers(approverRole: string, approvalRequest: any): Promise<void> {
    // Get users with the approver role
    const approvers = await db('users').where('role', approverRole);
    
    for (const approver of approvers) {
      await notificationService.sendNotification({
        recipientId: approver.id,
        message: `Approval required for lead assignment`,
        type: 'approval_request',
        relatedEntityType: 'approval_request',
        relatedEntityId: approvalRequest.id
      });
    }
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
}

export const workflowEngine = new WorkflowEngine();