import { BaseModel } from './BaseModel';
import { 
  StatusWorkflow as StatusWorkflowType, 
  StatusWorkflowTable, 
  WorkflowEntityType,
  StatusTransition,
  TransitionRule
} from '../types';

export class StatusWorkflow extends BaseModel {
  protected static override tableName = 'status_workflows';

  static async findByEntityType(entityType: WorkflowEntityType): Promise<StatusWorkflowTable[]> {
    return this.query
      .where('entity_type', entityType)
      .where('is_active', true)
      .orderBy('name', 'asc');
  }

  static async findDefault(entityType: WorkflowEntityType): Promise<StatusWorkflowTable | undefined> {
    return this.query
      .where('entity_type', entityType)
      .where('is_default', true)
      .where('is_active', true)
      .first();
  }

  static async createStatusWorkflow(workflowData: Omit<StatusWorkflowType, 'id' | 'createdAt' | 'updatedAt'>): Promise<StatusWorkflowTable> {
    const dbData: Partial<StatusWorkflowTable> = {
      entity_type: workflowData.entityType,
      name: workflowData.name,
      name_th: workflowData.nameTh,
      description: workflowData.description,
      description_th: workflowData.descriptionTh,
      status_transitions: JSON.stringify(workflowData.statusTransitions),
      transition_rules: workflowData.transitionRules ? JSON.stringify(workflowData.transitionRules) : null,
      is_active: workflowData.isActive,
      is_default: workflowData.isDefault,
      created_by: workflowData.createdBy
    };

    return this.create(dbData);
  }

  static async updateStatusWorkflow(id: string, workflowData: Partial<StatusWorkflowType>): Promise<StatusWorkflowTable> {
    const dbData: Partial<StatusWorkflowTable> = {};
    
    if (workflowData.name) dbData.name = workflowData.name;
    if (workflowData.nameTh) dbData.name_th = workflowData.nameTh;
    if (workflowData.description) dbData.description = workflowData.description;
    if (workflowData.descriptionTh) dbData.description_th = workflowData.descriptionTh;
    if (workflowData.statusTransitions) dbData.status_transitions = JSON.stringify(workflowData.statusTransitions);
    if (workflowData.transitionRules) dbData.transition_rules = JSON.stringify(workflowData.transitionRules);
    if (workflowData.isActive !== undefined) dbData.is_active = workflowData.isActive;
    if (workflowData.isDefault !== undefined) dbData.is_default = workflowData.isDefault;

    return this.update(id, dbData);
  }

  static async setDefault(entityType: WorkflowEntityType, workflowId: string): Promise<void> {
    const trx = await this.knex.transaction();
    
    try {
      // Clear existing default
      await trx('status_workflows')
        .where('entity_type', entityType)
        .update({ is_default: false });
      
      // Set new default
      await trx('status_workflows')
        .where('id', workflowId)
        .update({ is_default: true });
      
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  static async validateTransition(entityType: WorkflowEntityType, fromStatus: string, toStatus: string, context?: Record<string, any>): Promise<{isAllowed: boolean, requiresApproval: boolean, errors: string[]}> {
    const workflow = await this.findDefault(entityType);
    if (!workflow) {
      return { isAllowed: false, requiresApproval: false, errors: ['No workflow configured for entity type'] };
    }

    const workflowConfig = this.transformToStatusWorkflowType(workflow);
    const transition = workflowConfig.statusTransitions.find(
      t => t.fromStatus === fromStatus && t.toStatus === toStatus
    );

    if (!transition) {
      return { isAllowed: false, requiresApproval: false, errors: [`Transition from ${fromStatus} to ${toStatus} is not allowed`] };
    }

    if (!transition.isAllowed) {
      return { isAllowed: false, requiresApproval: false, errors: [`Transition from ${fromStatus} to ${toStatus} is disabled`] };
    }

    // Check conditions if any
    const errors: string[] = [];
    if (transition.conditions && context) {
      for (const condition of transition.conditions) {
        const fieldValue = context[condition.field];
        let conditionMet = false;

        switch (condition.operator) {
          case 'equals':
            conditionMet = fieldValue === condition.value;
            break;
          case 'not_equals':
            conditionMet = fieldValue !== condition.value;
            break;
          case 'greater_than':
            conditionMet = Number(fieldValue) > Number(condition.value);
            break;
          case 'less_than':
            conditionMet = Number(fieldValue) < Number(condition.value);
            break;
          case 'contains':
            conditionMet = String(fieldValue).includes(String(condition.value));
            break;
          case 'in':
            conditionMet = Array.isArray(condition.value) && condition.value.includes(fieldValue);
            break;
          case 'is_not_null':
            conditionMet = fieldValue !== null && fieldValue !== undefined;
            break;
        }

        if (!conditionMet) {
          errors.push(`Condition not met: ${condition.field} ${condition.operator} ${condition.value}`);
        }
      }
    }

    return {
      isAllowed: errors.length === 0,
      requiresApproval: transition.requiresApproval || false,
      errors
    };
  }

  static transformToStatusWorkflowType(dbWorkflow: StatusWorkflowTable): StatusWorkflowType {
    return {
      id: dbWorkflow.id,
      entityType: dbWorkflow.entity_type,
      name: dbWorkflow.name,
      nameTh: dbWorkflow.name_th,
      description: dbWorkflow.description,
      descriptionTh: dbWorkflow.description_th,
      statusTransitions: JSON.parse(dbWorkflow.status_transitions),
      transitionRules: dbWorkflow.transition_rules ? JSON.parse(dbWorkflow.transition_rules) : undefined,
      isActive: dbWorkflow.is_active,
      isDefault: dbWorkflow.is_default,
      createdBy: dbWorkflow.created_by,
      createdAt: dbWorkflow.created_at,
      updatedAt: dbWorkflow.updated_at
    };
  }

  static async getAllowedTransitions(entityType: WorkflowEntityType, currentStatus: string): Promise<string[]> {
    const workflow = await this.findDefault(entityType);
    if (!workflow) {
      return [];
    }

    const workflowConfig = this.transformToStatusWorkflowType(workflow);
    return workflowConfig.statusTransitions
      .filter(t => t.fromStatus === currentStatus && t.isAllowed)
      .map(t => t.toStatus);
  }
}