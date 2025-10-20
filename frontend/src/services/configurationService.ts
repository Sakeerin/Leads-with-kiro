import { api } from './api';

export interface CustomField {
  id: string;
  entityType: string;
  fieldName: string;
  fieldLabel: string;
  fieldLabelTh?: string;
  fieldType: string;
  description?: string;
  descriptionTh?: string;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  validationRules?: ValidationRule[];
  picklistValues?: PicklistOption[];
  defaultValue?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationRule {
  type: string;
  value?: any;
  message?: string;
  messageTh?: string;
}

export interface PicklistOption {
  value: string;
  label: string;
  labelTh?: string;
  isActive?: boolean;
}

export interface PicklistValue {
  id: string;
  picklistType: string;
  value: string;
  label: string;
  labelTh?: string;
  description?: string;
  descriptionTh?: string;
  colorCode?: string;
  icon?: string;
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusWorkflow {
  id: string;
  entityType: string;
  name: string;
  nameTh?: string;
  description?: string;
  descriptionTh?: string;
  statusTransitions: StatusTransition[];
  transitionRules?: TransitionRule[];
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusTransition {
  fromStatus: string;
  toStatus: string;
  isAllowed: boolean;
  requiresApproval?: boolean;
  approvalRoles?: string[];
  conditions?: TransitionCondition[];
}

export interface TransitionRule {
  id: string;
  name: string;
  conditions: TransitionCondition[];
  actions: TransitionAction[];
  isActive: boolean;
}

export interface TransitionCondition {
  field: string;
  operator: string;
  value: any;
}

export interface TransitionAction {
  type: string;
  parameters: Record<string, any>;
}

export interface WorkingHoursConfig {
  id: string;
  name: string;
  timezone: string;
  schedule: WeeklySchedule;
  holidays?: Holiday[];
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isWorkingDay: boolean;
  startTime?: string;
  endTime?: string;
  breaks?: TimeBreak[];
}

export interface TimeBreak {
  startTime: string;
  endTime: string;
  name?: string;
}

export interface Holiday {
  id: string;
  name: string;
  nameTh?: string;
  date: string;
  type: string;
  description?: string;
  descriptionTh?: string;
  isRecurring: boolean;
  recurrencePattern?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemConfig {
  id: string;
  configKey: string;
  configValue?: string;
  configJson?: Record<string, any>;
  dataType: string;
  description?: string;
  descriptionTh?: string;
  category: string;
  isSensitive: boolean;
  requiresRestart: boolean;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export class ConfigurationService {
  // Custom Fields
  async getCustomFields(entityType: string): Promise<CustomField[]> {
    const response = await api.get(`/configuration/custom-fields/${entityType}`);
    return response.data;
  }

  async createCustomField(fieldData: Omit<CustomField, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomField> {
    const response = await api.post('/configuration/custom-fields', fieldData);
    return response.data;
  }

  async updateCustomField(id: string, fieldData: Partial<CustomField>): Promise<CustomField> {
    const response = await api.put(`/configuration/custom-fields/${id}`, fieldData);
    return response.data;
  }

  async deleteCustomField(id: string): Promise<void> {
    await api.delete(`/configuration/custom-fields/${id}`);
  }

  async reorderCustomFields(entityType: string, fieldOrders: Array<{id: string, displayOrder: number}>): Promise<void> {
    await api.post(`/configuration/custom-fields/${entityType}/reorder`, { fieldOrders });
  }

  async validateCustomFieldValue(entityType: string, fieldName: string, value: any): Promise<{isValid: boolean, errors: string[]}> {
    const response = await api.post(`/configuration/custom-fields/${entityType}/${fieldName}/validate`, { value });
    return response.data;
  }

  // Picklist Values
  async getPicklistValues(picklistType: string): Promise<PicklistValue[]> {
    const response = await api.get(`/configuration/picklist-values/${picklistType}`);
    return response.data;
  }

  async getPicklistOptions(picklistType: string, language: 'en' | 'th' = 'en'): Promise<Array<{value: string, label: string}>> {
    const response = await api.get(`/configuration/picklist-values/${picklistType}/options`, {
      params: { language }
    });
    return response.data;
  }

  async createPicklistValue(valueData: Omit<PicklistValue, 'id' | 'createdAt' | 'updatedAt'>): Promise<PicklistValue> {
    const response = await api.post('/configuration/picklist-values', valueData);
    return response.data;
  }

  async updatePicklistValue(id: string, valueData: Partial<PicklistValue>): Promise<PicklistValue> {
    const response = await api.put(`/configuration/picklist-values/${id}`, valueData);
    return response.data;
  }

  async deletePicklistValue(id: string): Promise<void> {
    await api.delete(`/configuration/picklist-values/${id}`);
  }

  async setDefaultPicklistValue(picklistType: string, valueId: string): Promise<void> {
    await api.post(`/configuration/picklist-values/${picklistType}/${valueId}/set-default`);
  }

  async bulkCreatePicklistValues(picklistType: string, values: Array<Omit<PicklistValue, 'id' | 'picklistType' | 'createdAt' | 'updatedAt'>>): Promise<PicklistValue[]> {
    const response = await api.post(`/configuration/picklist-values/${picklistType}/bulk-create`, { values });
    return response.data;
  }

  // Status Workflows
  async getStatusWorkflows(entityType: string): Promise<StatusWorkflow[]> {
    const response = await api.get(`/configuration/status-workflows/${entityType}`);
    return response.data;
  }

  async createStatusWorkflow(workflowData: Omit<StatusWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<StatusWorkflow> {
    const response = await api.post('/configuration/status-workflows', workflowData);
    return response.data;
  }

  async updateStatusWorkflow(id: string, workflowData: Partial<StatusWorkflow>): Promise<StatusWorkflow> {
    const response = await api.put(`/configuration/status-workflows/${id}`, workflowData);
    return response.data;
  }

  async deleteStatusWorkflow(id: string): Promise<void> {
    await api.delete(`/configuration/status-workflows/${id}`);
  }

  async setDefaultStatusWorkflow(entityType: string, workflowId: string): Promise<void> {
    await api.post(`/configuration/status-workflows/${entityType}/${workflowId}/set-default`);
  }

  async validateStatusTransition(entityType: string, fromStatus: string, toStatus: string, context?: Record<string, any>): Promise<{isAllowed: boolean, requiresApproval: boolean, errors: string[]}> {
    const response = await api.post(`/configuration/status-workflows/${entityType}/validate-transition`, {
      fromStatus,
      toStatus,
      context
    });
    return response.data;
  }

  async getAllowedStatusTransitions(entityType: string, currentStatus: string): Promise<string[]> {
    const response = await api.get(`/configuration/status-workflows/${entityType}/${currentStatus}/allowed-transitions`);
    return response.data;
  }

  // Working Hours Configuration
  async getWorkingHoursConfigs(): Promise<WorkingHoursConfig[]> {
    const response = await api.get('/configuration/working-hours-configs');
    return response.data;
  }

  async getDefaultWorkingHoursConfig(): Promise<WorkingHoursConfig | null> {
    const response = await api.get('/configuration/working-hours-configs/default');
    return response.data;
  }

  async createWorkingHoursConfig(configData: Omit<WorkingHoursConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkingHoursConfig> {
    const response = await api.post('/configuration/working-hours-configs', configData);
    return response.data;
  }

  async updateWorkingHoursConfig(id: string, configData: Partial<WorkingHoursConfig>): Promise<WorkingHoursConfig> {
    const response = await api.put(`/configuration/working-hours-configs/${id}`, configData);
    return response.data;
  }

  async deleteWorkingHoursConfig(id: string): Promise<void> {
    await api.delete(`/configuration/working-hours-configs/${id}`);
  }

  async setDefaultWorkingHoursConfig(id: string): Promise<void> {
    await api.post(`/configuration/working-hours-configs/${id}/set-default`);
  }

  // Holiday Management
  async getHolidays(year?: number): Promise<Holiday[]> {
    const response = await api.get('/configuration/holidays', {
      params: year ? { year } : {}
    });
    return response.data;
  }

  async createHoliday(holidayData: Omit<Holiday, 'id' | 'createdAt' | 'updatedAt'>): Promise<Holiday> {
    const response = await api.post('/configuration/holidays', holidayData);
    return response.data;
  }

  async updateHoliday(id: string, holidayData: Partial<Holiday>): Promise<Holiday> {
    const response = await api.put(`/configuration/holidays/${id}`, holidayData);
    return response.data;
  }

  async deleteHoliday(id: string): Promise<void> {
    await api.delete(`/configuration/holidays/${id}`);
  }

  async initializeThaiHolidays(year?: number): Promise<Holiday[]> {
    const response = await api.post('/configuration/holidays/initialize-thai', { year });
    return response.data;
  }

  // System Configuration
  async getSystemConfigs(category?: string, includeSensitive?: boolean): Promise<SystemConfig[]> {
    const response = await api.get('/configuration/system-configs', {
      params: { category, includeSensitive }
    });
    return response.data;
  }

  async getSystemConfigsByCategory(category: string, includeSensitive?: boolean): Promise<Record<string, any>> {
    const response = await api.get(`/configuration/system-configs/category/${category}`, {
      params: { includeSensitive }
    });
    return response.data;
  }

  async setSystemConfigValue(configKey: string, value: any): Promise<SystemConfig> {
    const response = await api.post(`/configuration/system-configs/${configKey}`, { value });
    return response.data;
  }

  async bulkSetSystemConfigs(configs: Array<{key: string, value: any}>): Promise<void> {
    await api.post('/configuration/system-configs/bulk-set', { configs });
  }

  async initializeDefaultConfigs(): Promise<void> {
    await api.post('/configuration/system-configs/initialize-defaults');
  }

  // Utility methods
  async exportConfiguration(): Promise<any> {
    const response = await api.get('/configuration/export');
    return response.data;
  }

  async validateConfiguration(): Promise<{isValid: boolean, errors: string[]}> {
    const response = await api.get('/configuration/validate');
    return response.data;
  }
}

export const configurationService = new ConfigurationService();