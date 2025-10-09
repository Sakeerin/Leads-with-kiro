import { BaseModel } from './BaseModel';

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface WorkflowAction {
  type: 'send_email' | 'create_task' | 'update_field' | 'assign_lead' | 'send_notification' | 'request_approval';
  parameters: Record<string, any>;
  delay?: number; // delay in minutes
}

export interface WorkflowTrigger {
  event: 'lead_created' | 'lead_assigned' | 'score_changed' | 'status_updated' | 'task_completed' | 'manual';
  conditions?: WorkflowCondition[];
}

export interface Workflow extends BaseModel {
  id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  isActive: boolean;
  priority: number;
  createdBy: string;
  lastExecuted?: Date;
  executionCount: number;
}

export interface WorkflowExecution extends BaseModel {
  id: string;
  workflowId: string;
  leadId: string;
  triggeredBy: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  context: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  executedActions: {
    actionIndex: number;
    status: 'pending' | 'completed' | 'failed';
    result?: any;
    error?: string;
    executedAt?: Date;
  }[];
}

export interface ApprovalRequest extends BaseModel {
  id: string;
  workflowExecutionId: string;
  leadId: string;
  requestedBy: string;
  approverRole: string;
  approver?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestData: Record<string, any>;
  reason?: string;
  respondedAt?: Date;
  expiresAt: Date;
}