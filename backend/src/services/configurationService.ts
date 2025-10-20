import { 
  CustomField, 
  PicklistValue, 
  StatusWorkflow, 
  WorkingHoursConfig, 
  Holiday, 
  SystemConfig 
} from '../models';
import { 
  CustomField as CustomFieldType,
  PicklistValue as PicklistValueType,
  StatusWorkflow as StatusWorkflowType,
  WorkingHoursConfig as WorkingHoursConfigType,
  Holiday as HolidayType,
  SystemConfig as SystemConfigType,
  CustomFieldEntityType,
  PicklistType,
  WorkflowEntityType,
  HolidayType as HolidayTypeEnum,
  ConfigCategory
} from '../types';

export class ConfigurationService {
  // Custom Fields Management
  async getCustomFields(entityType: CustomFieldEntityType): Promise<CustomFieldType[]> {
    const fields = await CustomField.findByEntityType(entityType);
    return fields.map(field => CustomField.transformToCustomFieldType(field));
  }

  async createCustomField(fieldData: Omit<CustomFieldType, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomFieldType> {
    // Validate field name uniqueness
    const existing = await CustomField.findByFieldName(fieldData.entityType, fieldData.fieldName);
    if (existing) {
      throw new Error(`Custom field '${fieldData.fieldName}' already exists for ${fieldData.entityType}`);
    }

    const field = await CustomField.createCustomField(fieldData);
    return CustomField.transformToCustomFieldType(field);
  }

  async updateCustomField(id: string, fieldData: Partial<CustomFieldType>): Promise<CustomFieldType> {
    const field = await CustomField.updateCustomField(id, fieldData);
    return CustomField.transformToCustomFieldType(field);
  }

  async deleteCustomField(id: string): Promise<void> {
    await CustomField.delete(id);
  }

  async reorderCustomFields(entityType: CustomFieldEntityType, fieldOrders: Array<{id: string, displayOrder: number}>): Promise<void> {
    await CustomField.reorderFields(entityType, fieldOrders);
  }

  async validateCustomFieldValue(entityType: CustomFieldEntityType, fieldName: string, value: any): Promise<{isValid: boolean, errors: string[]}> {
    return CustomField.validateFieldValue(entityType, fieldName, value);
  }

  // Picklist Management
  async getPicklistValues(picklistType: PicklistType): Promise<PicklistValueType[]> {
    const values = await PicklistValue.findByType(picklistType);
    return values.map(value => PicklistValue.transformToPicklistValueType(value));
  }

  async createPicklistValue(valueData: Omit<PicklistValueType, 'id' | 'createdAt' | 'updatedAt'>): Promise<PicklistValueType> {
    // Validate value uniqueness
    const existing = await PicklistValue.findByValue(valueData.picklistType, valueData.value);
    if (existing) {
      throw new Error(`Picklist value '${valueData.value}' already exists for ${valueData.picklistType}`);
    }

    const value = await PicklistValue.createPicklistValue(valueData);
    return PicklistValue.transformToPicklistValueType(value);
  }

  async updatePicklistValue(id: string, valueData: Partial<PicklistValueType>): Promise<PicklistValueType> {
    const value = await PicklistValue.updatePicklistValue(id, valueData);
    return PicklistValue.transformToPicklistValueType(value);
  }

  async deletePicklistValue(id: string): Promise<void> {
    await PicklistValue.delete(id);
  }

  async setDefaultPicklistValue(picklistType: PicklistType, valueId: string): Promise<void> {
    await PicklistValue.setDefault(picklistType, valueId);
  }

  async reorderPicklistValues(picklistType: PicklistType, valueOrders: Array<{id: string, displayOrder: number}>): Promise<void> {
    await PicklistValue.reorderValues(picklistType, valueOrders);
  }

  async bulkCreatePicklistValues(picklistType: PicklistType, values: Array<Omit<PicklistValueType, 'id' | 'picklistType' | 'createdAt' | 'updatedAt'>>, createdBy: string): Promise<PicklistValueType[]> {
    const createdValues = await PicklistValue.bulkCreate(picklistType, values, createdBy);
    return createdValues.map(value => PicklistValue.transformToPicklistValueType(value));
  }

  async getPicklistOptions(picklistType: PicklistType, language: 'en' | 'th' = 'en'): Promise<Array<{value: string, label: string}>> {
    return PicklistValue.getPicklistOptions(picklistType, language);
  }

  // Status Workflow Management
  async getStatusWorkflows(entityType: WorkflowEntityType): Promise<StatusWorkflowType[]> {
    const workflows = await StatusWorkflow.findByEntityType(entityType);
    return workflows.map(workflow => StatusWorkflow.transformToStatusWorkflowType(workflow));
  }

  async createStatusWorkflow(workflowData: Omit<StatusWorkflowType, 'id' | 'createdAt' | 'updatedAt'>): Promise<StatusWorkflowType> {
    const workflow = await StatusWorkflow.createStatusWorkflow(workflowData);
    return StatusWorkflow.transformToStatusWorkflowType(workflow);
  }

  async updateStatusWorkflow(id: string, workflowData: Partial<StatusWorkflowType>): Promise<StatusWorkflowType> {
    const workflow = await StatusWorkflow.updateStatusWorkflow(id, workflowData);
    return StatusWorkflow.transformToStatusWorkflowType(workflow);
  }

  async deleteStatusWorkflow(id: string): Promise<void> {
    await StatusWorkflow.delete(id);
  }

  async setDefaultStatusWorkflow(entityType: WorkflowEntityType, workflowId: string): Promise<void> {
    await StatusWorkflow.setDefault(entityType, workflowId);
  }

  async validateStatusTransition(entityType: WorkflowEntityType, fromStatus: string, toStatus: string, context?: Record<string, any>): Promise<{isAllowed: boolean, requiresApproval: boolean, errors: string[]}> {
    return StatusWorkflow.validateTransition(entityType, fromStatus, toStatus, context);
  }

  async getAllowedStatusTransitions(entityType: WorkflowEntityType, currentStatus: string): Promise<string[]> {
    return StatusWorkflow.getAllowedTransitions(entityType, currentStatus);
  }

  // Working Hours Configuration
  async getWorkingHoursConfigs(): Promise<WorkingHoursConfigType[]> {
    const configs = await WorkingHoursConfig.findActive();
    return configs.map(config => WorkingHoursConfig.transformToWorkingHoursConfigType(config));
  }

  async getDefaultWorkingHoursConfig(): Promise<WorkingHoursConfigType | null> {
    const config = await WorkingHoursConfig.findDefault();
    return config ? WorkingHoursConfig.transformToWorkingHoursConfigType(config) : null;
  }

  async createWorkingHoursConfig(configData: Omit<WorkingHoursConfigType, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkingHoursConfigType> {
    const config = await WorkingHoursConfig.createWorkingHoursConfig(configData);
    return WorkingHoursConfig.transformToWorkingHoursConfigType(config);
  }

  async updateWorkingHoursConfig(id: string, configData: Partial<WorkingHoursConfigType>): Promise<WorkingHoursConfigType> {
    const config = await WorkingHoursConfig.updateWorkingHoursConfig(id, configData);
    return WorkingHoursConfig.transformToWorkingHoursConfigType(config);
  }

  async deleteWorkingHoursConfig(id: string): Promise<void> {
    await WorkingHoursConfig.delete(id);
  }

  async setDefaultWorkingHoursConfig(configId: string): Promise<void> {
    await WorkingHoursConfig.setDefault(configId);
  }

  async isWorkingTime(date: Date, configId?: string): Promise<boolean> {
    return WorkingHoursConfig.isWorkingTime(date, configId);
  }

  async getNextWorkingTime(fromDate: Date, configId?: string): Promise<Date> {
    return WorkingHoursConfig.getNextWorkingTime(fromDate, configId);
  }

  // Holiday Management
  async getHolidays(year?: number): Promise<HolidayType[]> {
    let holidays;
    if (year) {
      holidays = await Holiday.findByYear(year);
    } else {
      holidays = await Holiday.findUpcoming();
    }
    return holidays.map(holiday => Holiday.transformToHolidayType(holiday));
  }

  async getHolidaysByType(type: HolidayTypeEnum): Promise<HolidayType[]> {
    const holidays = await Holiday.findByType(type);
    return holidays.map(holiday => Holiday.transformToHolidayType(holiday));
  }

  async createHoliday(holidayData: Omit<HolidayType, 'id' | 'createdAt' | 'updatedAt'>): Promise<HolidayType> {
    const holiday = await Holiday.createHoliday(holidayData);
    return Holiday.transformToHolidayType(holiday);
  }

  async updateHoliday(id: string, holidayData: Partial<HolidayType>): Promise<HolidayType> {
    const holiday = await Holiday.updateHoliday(id, holidayData);
    return Holiday.transformToHolidayType(holiday);
  }

  async deleteHoliday(id: string): Promise<void> {
    await Holiday.delete(id);
  }

  async bulkCreateHolidays(holidays: Array<Omit<HolidayType, 'id' | 'createdAt' | 'updatedAt'>>, createdBy: string): Promise<HolidayType[]> {
    const createdHolidays = await Holiday.bulkCreateHolidays(holidays, createdBy);
    return createdHolidays.map(holiday => Holiday.transformToHolidayType(holiday));
  }

  async isHoliday(date: Date, types?: HolidayTypeEnum[]): Promise<boolean> {
    return Holiday.isHoliday(date, types);
  }

  async generateRecurringHolidays(year: number): Promise<HolidayType[]> {
    const holidays = await Holiday.generateRecurringHolidays(year);
    return holidays.map(holiday => Holiday.transformToHolidayType(holiday));
  }

  async initializeThaiHolidays(year: number, createdBy: string): Promise<HolidayType[]> {
    const thaiHolidays = Holiday.getThaiHolidays(year);
    return this.bulkCreateHolidays(thaiHolidays, createdBy);
  }

  // System Configuration
  async getSystemConfigs(category?: ConfigCategory, includeSensitive: boolean = false): Promise<SystemConfigType[]> {
    let configs;
    if (category) {
      configs = await SystemConfig.findByCategory(category);
    } else {
      configs = await SystemConfig.findAll();
    }

    if (!includeSensitive) {
      configs = configs.filter(config => !config.is_sensitive);
    }

    return configs.map(config => SystemConfig.transformToSystemConfigType(config));
  }

  async getSystemConfigsByCategory(category: ConfigCategory, includeSensitive: boolean = false): Promise<Record<string, any>> {
    return SystemConfig.getConfigsByCategory(category, includeSensitive);
  }

  async getSystemConfigValue(configKey: string, defaultValue?: any): Promise<any> {
    return SystemConfig.getValue(configKey, defaultValue);
  }

  async setSystemConfigValue(configKey: string, value: any, updatedBy: string): Promise<SystemConfigType> {
    const config = await SystemConfig.setValue(configKey, value, updatedBy);
    return SystemConfig.transformToSystemConfigType(config);
  }

  async bulkSetSystemConfigs(configs: Array<{key: string, value: any}>, updatedBy: string): Promise<void> {
    await SystemConfig.bulkSet(configs, updatedBy);
  }

  async createSystemConfig(configData: Omit<SystemConfigType, 'id' | 'createdAt' | 'updatedAt'>): Promise<SystemConfigType> {
    const config = await SystemConfig.createSystemConfig(configData);
    return SystemConfig.transformToSystemConfigType(config);
  }

  async updateSystemConfig(configKey: string, configData: Partial<SystemConfigType>): Promise<SystemConfigType> {
    const config = await SystemConfig.updateSystemConfig(configKey, configData);
    return SystemConfig.transformToSystemConfigType(config);
  }

  async initializeDefaultConfigs(updatedBy: string): Promise<void> {
    await SystemConfig.initializeDefaultConfigs(updatedBy);
  }

  // Utility methods for configuration management
  async exportConfiguration(): Promise<{
    customFields: CustomFieldType[],
    picklistValues: Record<string, PicklistValueType[]>,
    statusWorkflows: Record<string, StatusWorkflowType[]>,
    workingHoursConfigs: WorkingHoursConfigType[],
    holidays: HolidayType[],
    systemConfigs: SystemConfigType[]
  }> {
    const customFields = await this.getCustomFields(CustomFieldEntityType.LEAD);
    
    const picklistValues: Record<string, PicklistValueType[]> = {};
    for (const type of Object.values(PicklistType)) {
      picklistValues[type] = await this.getPicklistValues(type);
    }

    const statusWorkflows: Record<string, StatusWorkflowType[]> = {};
    for (const type of Object.values(WorkflowEntityType)) {
      statusWorkflows[type] = await this.getStatusWorkflows(type);
    }

    const workingHoursConfigs = await this.getWorkingHoursConfigs();
    const holidays = await this.getHolidays();
    const systemConfigs = await this.getSystemConfigs();

    return {
      customFields,
      picklistValues,
      statusWorkflows,
      workingHoursConfigs,
      holidays,
      systemConfigs
    };
  }

  async validateConfiguration(): Promise<{isValid: boolean, errors: string[]}> {
    const errors: string[] = [];

    // Check if default working hours config exists
    const defaultWorkingHours = await this.getDefaultWorkingHoursConfig();
    if (!defaultWorkingHours) {
      errors.push('No default working hours configuration found');
    }

    // Check if default status workflows exist for each entity type
    for (const entityType of Object.values(WorkflowEntityType)) {
      const workflows = await this.getStatusWorkflows(entityType);
      const hasDefault = workflows.some(w => w.isDefault);
      if (!hasDefault) {
        errors.push(`No default status workflow found for ${entityType}`);
      }
    }

    // Check for required system configurations
    const requiredConfigs = [
      'system.name',
      'system.timezone',
      'email.from.address'
    ];

    for (const configKey of requiredConfigs) {
      const value = await this.getSystemConfigValue(configKey);
      if (!value) {
        errors.push(`Required system configuration '${configKey}' is missing`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}