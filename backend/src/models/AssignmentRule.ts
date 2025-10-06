import { BaseModel } from './BaseModel';
import { AssignmentRule as AssignmentRuleType, AssignmentRuleTable } from '../types';

export class AssignmentRule extends BaseModel {
  protected static override tableName = 'assignment_rules';

  static async findActiveRules(): Promise<AssignmentRuleTable[]> {
    return this.query
      .where('is_active', true)
      .orderBy('priority', 'asc');
  }

  static async findByPriority(priority: number): Promise<AssignmentRuleTable[]> {
    return this.query
      .where('priority', priority)
      .where('is_active', true);
  }

  static async createRule(ruleData: Omit<AssignmentRuleType, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssignmentRuleTable> {
    const dbData: Partial<AssignmentRuleTable> = {
      name: ruleData.name,
      priority: ruleData.priority,
      conditions: JSON.stringify(ruleData.conditions),
      actions: JSON.stringify(ruleData.actions),
      is_active: ruleData.isActive,
      working_hours: ruleData.workingHours ? JSON.stringify(ruleData.workingHours) : null,
      territories: ruleData.territories ? JSON.stringify(ruleData.territories) : null,
      created_by: ruleData.createdBy
    };

    return this.create(dbData);
  }

  static async updateRule(id: string, ruleData: Partial<AssignmentRuleType>): Promise<AssignmentRuleTable> {
    const dbData: Partial<AssignmentRuleTable> = {};
    
    if (ruleData.name) dbData.name = ruleData.name;
    if (ruleData.priority !== undefined) dbData.priority = ruleData.priority;
    if (ruleData.conditions) dbData.conditions = JSON.stringify(ruleData.conditions);
    if (ruleData.actions) dbData.actions = JSON.stringify(ruleData.actions);
    if (ruleData.isActive !== undefined) dbData.is_active = ruleData.isActive;
    if (ruleData.workingHours) dbData.working_hours = JSON.stringify(ruleData.workingHours);
    if (ruleData.territories) dbData.territories = JSON.stringify(ruleData.territories);

    return this.update(id, dbData);
  }

  static async activateRule(id: string): Promise<AssignmentRuleTable> {
    return this.update(id, { is_active: true });
  }

  static async deactivateRule(id: string): Promise<AssignmentRuleTable> {
    return this.update(id, { is_active: false });
  }

  static async reorderRules(ruleIds: string[]): Promise<void> {
    const updates = ruleIds.map((id, index) => 
      this.update(id, { priority: index + 1 })
    );
    
    await Promise.all(updates);
  }

  static async evaluateRuleConditions(ruleId: string, leadData: any): Promise<boolean> {
    const rule = await this.findById(ruleId);
    if (!rule) return false;
    
    const conditions = JSON.parse(rule.conditions);
    
    return conditions.every((condition: any) => {
      const fieldValue = this.getNestedValue(leadData, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'not_equals':
          return fieldValue !== condition.value;
        case 'contains':
          return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
        case 'not_contains':
          return typeof fieldValue === 'string' && !fieldValue.includes(condition.value);
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
    });
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  static async findMatchingRules(leadData: any): Promise<AssignmentRuleTable[]> {
    const activeRules = await this.findActiveRules();
    const matchingRules: AssignmentRuleTable[] = [];
    
    for (const rule of activeRules) {
      const matches = await this.evaluateRuleConditions(rule.id, leadData);
      if (matches) {
        matchingRules.push(rule);
      }
    }
    
    return matchingRules.sort((a, b) => a.priority - b.priority);
  }

  static async getRuleStatistics(): Promise<{
    totalRules: number;
    activeRules: number;
    inactiveRules: number;
    rulesByPriority: Record<number, number>;
  }> {
    const [total, active, inactive, byPriority] = await Promise.all([
      this.query.count('* as count').first(),
      this.query.where('is_active', true).count('* as count').first(),
      this.query.where('is_active', false).count('* as count').first(),
      this.query.select('priority').count('* as count').groupBy('priority')
    ]);
    
    const rulesByPriority: Record<number, number> = {};
    byPriority.forEach((row: any) => {
      rulesByPriority[row.priority] = parseInt(row.count);
    });
    
    return {
      totalRules: parseInt(total?.['count'] as string) || 0,
      activeRules: parseInt(active?.['count'] as string) || 0,
      inactiveRules: parseInt(inactive?.['count'] as string) || 0,
      rulesByPriority
    };
  }

  static transformToAssignmentRuleType(dbRule: AssignmentRuleTable): AssignmentRuleType {
    return {
      id: dbRule.id,
      name: dbRule.name,
      priority: dbRule.priority,
      conditions: JSON.parse(dbRule.conditions),
      actions: JSON.parse(dbRule.actions),
      isActive: dbRule.is_active,
      workingHours: dbRule.working_hours ? JSON.parse(dbRule.working_hours) : undefined,
      territories: dbRule.territories ? JSON.parse(dbRule.territories) : undefined,
      createdAt: dbRule.created_at,
      updatedAt: dbRule.updated_at,
      createdBy: dbRule.created_by
    };
  }
}