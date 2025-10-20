import { Request, Response } from 'express';
import { ConfigurationService } from '../services/configurationService';
import { 
  CustomFieldEntityType, 
  PicklistType, 
  WorkflowEntityType, 
  HolidayType,
  ConfigCategory 
} from '../types';

export class ConfigurationController {
  private configurationService: ConfigurationService;

  constructor() {
    this.configurationService = new ConfigurationService();
  }

  // Custom Fields endpoints
  getCustomFields = async (req: Request, res: Response): Promise<void> => {
    try {
      const { entityType } = req.params;
      
      if (!Object.values(CustomFieldEntityType).includes(entityType as CustomFieldEntityType)) {
        res.status(400).json({ error: 'Invalid entity type' });
        return;
      }

      const fields = await this.configurationService.getCustomFields(entityType as CustomFieldEntityType);
      res.json(fields);
    } catch (error) {
      console.error('Error getting custom fields:', error);
      res.status(500).json({ error: 'Failed to get custom fields' });
    }
  };

  createCustomField = async (req: Request, res: Response): Promise<void> => {
    try {
      const fieldData = {
        ...req.body,
        createdBy: req.user?.id
      };

      const field = await this.configurationService.createCustomField(fieldData);
      res.status(201).json(field);
    } catch (error) {
      console.error('Error creating custom field:', error);
      res.status(500).json({ error: 'Failed to create custom field' });
    }
  };

  updateCustomField = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const field = await this.configurationService.updateCustomField(id, req.body);
      res.json(field);
    } catch (error) {
      console.error('Error updating custom field:', error);
      res.status(500).json({ error: 'Failed to update custom field' });
    }
  };

  deleteCustomField = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.configurationService.deleteCustomField(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting custom field:', error);
      res.status(500).json({ error: 'Failed to delete custom field' });
    }
  };

  reorderCustomFields = async (req: Request, res: Response): Promise<void> => {
    try {
      const { entityType } = req.params;
      const { fieldOrders } = req.body;

      if (!Object.values(CustomFieldEntityType).includes(entityType as CustomFieldEntityType)) {
        res.status(400).json({ error: 'Invalid entity type' });
        return;
      }

      await this.configurationService.reorderCustomFields(entityType as CustomFieldEntityType, fieldOrders);
      res.status(204).send();
    } catch (error) {
      console.error('Error reordering custom fields:', error);
      res.status(500).json({ error: 'Failed to reorder custom fields' });
    }
  };

  validateCustomFieldValue = async (req: Request, res: Response): Promise<void> => {
    try {
      const { entityType, fieldName } = req.params;
      const { value } = req.body;

      if (!Object.values(CustomFieldEntityType).includes(entityType as CustomFieldEntityType)) {
        res.status(400).json({ error: 'Invalid entity type' });
        return;
      }

      const result = await this.configurationService.validateCustomFieldValue(
        entityType as CustomFieldEntityType, 
        fieldName, 
        value
      );
      res.json(result);
    } catch (error) {
      console.error('Error validating custom field value:', error);
      res.status(500).json({ error: 'Failed to validate custom field value' });
    }
  };

  // Picklist Values endpoints
  getPicklistValues = async (req: Request, res: Response): Promise<void> => {
    try {
      const { picklistType } = req.params;
      
      if (!Object.values(PicklistType).includes(picklistType as PicklistType)) {
        res.status(400).json({ error: 'Invalid picklist type' });
        return;
      }

      const values = await this.configurationService.getPicklistValues(picklistType as PicklistType);
      res.json(values);
    } catch (error) {
      console.error('Error getting picklist values:', error);
      res.status(500).json({ error: 'Failed to get picklist values' });
    }
  };

  getPicklistOptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { picklistType } = req.params;
      const { language = 'en' } = req.query;
      
      if (!Object.values(PicklistType).includes(picklistType as PicklistType)) {
        res.status(400).json({ error: 'Invalid picklist type' });
        return;
      }

      const options = await this.configurationService.getPicklistOptions(
        picklistType as PicklistType, 
        language as 'en' | 'th'
      );
      res.json(options);
    } catch (error) {
      console.error('Error getting picklist options:', error);
      res.status(500).json({ error: 'Failed to get picklist options' });
    }
  };

  createPicklistValue = async (req: Request, res: Response): Promise<void> => {
    try {
      const valueData = {
        ...req.body,
        createdBy: req.user?.id
      };

      const value = await this.configurationService.createPicklistValue(valueData);
      res.status(201).json(value);
    } catch (error) {
      console.error('Error creating picklist value:', error);
      res.status(500).json({ error: 'Failed to create picklist value' });
    }
  };

  updatePicklistValue = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const value = await this.configurationService.updatePicklistValue(id, req.body);
      res.json(value);
    } catch (error) {
      console.error('Error updating picklist value:', error);
      res.status(500).json({ error: 'Failed to update picklist value' });
    }
  };

  deletePicklistValue = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.configurationService.deletePicklistValue(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting picklist value:', error);
      res.status(500).json({ error: 'Failed to delete picklist value' });
    }
  };

  setDefaultPicklistValue = async (req: Request, res: Response): Promise<void> => {
    try {
      const { picklistType, valueId } = req.params;

      if (!Object.values(PicklistType).includes(picklistType as PicklistType)) {
        res.status(400).json({ error: 'Invalid picklist type' });
        return;
      }

      await this.configurationService.setDefaultPicklistValue(picklistType as PicklistType, valueId);
      res.status(204).send();
    } catch (error) {
      console.error('Error setting default picklist value:', error);
      res.status(500).json({ error: 'Failed to set default picklist value' });
    }
  };

  bulkCreatePicklistValues = async (req: Request, res: Response): Promise<void> => {
    try {
      const { picklistType } = req.params;
      const { values } = req.body;

      if (!Object.values(PicklistType).includes(picklistType as PicklistType)) {
        res.status(400).json({ error: 'Invalid picklist type' });
        return;
      }

      const createdValues = await this.configurationService.bulkCreatePicklistValues(
        picklistType as PicklistType,
        values,
        req.user?.id || 'system'
      );
      res.status(201).json(createdValues);
    } catch (error) {
      console.error('Error bulk creating picklist values:', error);
      res.status(500).json({ error: 'Failed to bulk create picklist values' });
    }
  };

  // Status Workflow endpoints
  getStatusWorkflows = async (req: Request, res: Response): Promise<void> => {
    try {
      const { entityType } = req.params;
      
      if (!Object.values(WorkflowEntityType).includes(entityType as WorkflowEntityType)) {
        res.status(400).json({ error: 'Invalid entity type' });
        return;
      }

      const workflows = await this.configurationService.getStatusWorkflows(entityType as WorkflowEntityType);
      res.json(workflows);
    } catch (error) {
      console.error('Error getting status workflows:', error);
      res.status(500).json({ error: 'Failed to get status workflows' });
    }
  };

  createStatusWorkflow = async (req: Request, res: Response): Promise<void> => {
    try {
      const workflowData = {
        ...req.body,
        createdBy: req.user?.id
      };

      const workflow = await this.configurationService.createStatusWorkflow(workflowData);
      res.status(201).json(workflow);
    } catch (error) {
      console.error('Error creating status workflow:', error);
      res.status(500).json({ error: 'Failed to create status workflow' });
    }
  };

  updateStatusWorkflow = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const workflow = await this.configurationService.updateStatusWorkflow(id, req.body);
      res.json(workflow);
    } catch (error) {
      console.error('Error updating status workflow:', error);
      res.status(500).json({ error: 'Failed to update status workflow' });
    }
  };

  deleteStatusWorkflow = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.configurationService.deleteStatusWorkflow(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting status workflow:', error);
      res.status(500).json({ error: 'Failed to delete status workflow' });
    }
  };

  setDefaultStatusWorkflow = async (req: Request, res: Response): Promise<void> => {
    try {
      const { entityType, workflowId } = req.params;

      if (!Object.values(WorkflowEntityType).includes(entityType as WorkflowEntityType)) {
        res.status(400).json({ error: 'Invalid entity type' });
        return;
      }

      await this.configurationService.setDefaultStatusWorkflow(entityType as WorkflowEntityType, workflowId);
      res.status(204).send();
    } catch (error) {
      console.error('Error setting default status workflow:', error);
      res.status(500).json({ error: 'Failed to set default status workflow' });
    }
  };

  validateStatusTransition = async (req: Request, res: Response): Promise<void> => {
    try {
      const { entityType } = req.params;
      const { fromStatus, toStatus, context } = req.body;

      if (!Object.values(WorkflowEntityType).includes(entityType as WorkflowEntityType)) {
        res.status(400).json({ error: 'Invalid entity type' });
        return;
      }

      const result = await this.configurationService.validateStatusTransition(
        entityType as WorkflowEntityType,
        fromStatus,
        toStatus,
        context
      );
      res.json(result);
    } catch (error) {
      console.error('Error validating status transition:', error);
      res.status(500).json({ error: 'Failed to validate status transition' });
    }
  };

  getAllowedStatusTransitions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { entityType, currentStatus } = req.params;

      if (!Object.values(WorkflowEntityType).includes(entityType as WorkflowEntityType)) {
        res.status(400).json({ error: 'Invalid entity type' });
        return;
      }

      const transitions = await this.configurationService.getAllowedStatusTransitions(
        entityType as WorkflowEntityType,
        currentStatus
      );
      res.json(transitions);
    } catch (error) {
      console.error('Error getting allowed status transitions:', error);
      res.status(500).json({ error: 'Failed to get allowed status transitions' });
    }
  };

  // Working Hours Configuration endpoints
  getWorkingHoursConfigs = async (req: Request, res: Response): Promise<void> => {
    try {
      const configs = await this.configurationService.getWorkingHoursConfigs();
      res.json(configs);
    } catch (error) {
      console.error('Error getting working hours configs:', error);
      res.status(500).json({ error: 'Failed to get working hours configs' });
    }
  };

  getDefaultWorkingHoursConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const config = await this.configurationService.getDefaultWorkingHoursConfig();
      res.json(config);
    } catch (error) {
      console.error('Error getting default working hours config:', error);
      res.status(500).json({ error: 'Failed to get default working hours config' });
    }
  };

  createWorkingHoursConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const configData = {
        ...req.body,
        createdBy: req.user?.id
      };

      const config = await this.configurationService.createWorkingHoursConfig(configData);
      res.status(201).json(config);
    } catch (error) {
      console.error('Error creating working hours config:', error);
      res.status(500).json({ error: 'Failed to create working hours config' });
    }
  };

  updateWorkingHoursConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const config = await this.configurationService.updateWorkingHoursConfig(id, req.body);
      res.json(config);
    } catch (error) {
      console.error('Error updating working hours config:', error);
      res.status(500).json({ error: 'Failed to update working hours config' });
    }
  };

  deleteWorkingHoursConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.configurationService.deleteWorkingHoursConfig(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting working hours config:', error);
      res.status(500).json({ error: 'Failed to delete working hours config' });
    }
  };

  setDefaultWorkingHoursConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.configurationService.setDefaultWorkingHoursConfig(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error setting default working hours config:', error);
      res.status(500).json({ error: 'Failed to set default working hours config' });
    }
  };

  // Holiday Management endpoints
  getHolidays = async (req: Request, res: Response): Promise<void> => {
    try {
      const { year } = req.query;
      const holidays = await this.configurationService.getHolidays(year ? parseInt(year as string) : undefined);
      res.json(holidays);
    } catch (error) {
      console.error('Error getting holidays:', error);
      res.status(500).json({ error: 'Failed to get holidays' });
    }
  };

  createHoliday = async (req: Request, res: Response): Promise<void> => {
    try {
      const holidayData = {
        ...req.body,
        createdBy: req.user?.id
      };

      const holiday = await this.configurationService.createHoliday(holidayData);
      res.status(201).json(holiday);
    } catch (error) {
      console.error('Error creating holiday:', error);
      res.status(500).json({ error: 'Failed to create holiday' });
    }
  };

  updateHoliday = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const holiday = await this.configurationService.updateHoliday(id, req.body);
      res.json(holiday);
    } catch (error) {
      console.error('Error updating holiday:', error);
      res.status(500).json({ error: 'Failed to update holiday' });
    }
  };

  deleteHoliday = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.configurationService.deleteHoliday(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      res.status(500).json({ error: 'Failed to delete holiday' });
    }
  };

  initializeThaiHolidays = async (req: Request, res: Response): Promise<void> => {
    try {
      const { year } = req.body;
      const holidays = await this.configurationService.initializeThaiHolidays(
        year || new Date().getFullYear(),
        req.user?.id || 'system'
      );
      res.status(201).json(holidays);
    } catch (error) {
      console.error('Error initializing Thai holidays:', error);
      res.status(500).json({ error: 'Failed to initialize Thai holidays' });
    }
  };

  // System Configuration endpoints
  getSystemConfigs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category, includeSensitive } = req.query;
      
      let categoryEnum: ConfigCategory | undefined;
      if (category && Object.values(ConfigCategory).includes(category as ConfigCategory)) {
        categoryEnum = category as ConfigCategory;
      }

      const configs = await this.configurationService.getSystemConfigs(
        categoryEnum,
        includeSensitive === 'true'
      );
      res.json(configs);
    } catch (error) {
      console.error('Error getting system configs:', error);
      res.status(500).json({ error: 'Failed to get system configs' });
    }
  };

  getSystemConfigsByCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category } = req.params;
      const { includeSensitive } = req.query;

      if (!Object.values(ConfigCategory).includes(category as ConfigCategory)) {
        res.status(400).json({ error: 'Invalid category' });
        return;
      }

      const configs = await this.configurationService.getSystemConfigsByCategory(
        category as ConfigCategory,
        includeSensitive === 'true'
      );
      res.json(configs);
    } catch (error) {
      console.error('Error getting system configs by category:', error);
      res.status(500).json({ error: 'Failed to get system configs by category' });
    }
  };

  setSystemConfigValue = async (req: Request, res: Response): Promise<void> => {
    try {
      const { configKey } = req.params;
      const { value } = req.body;

      const config = await this.configurationService.setSystemConfigValue(
        configKey,
        value,
        req.user?.id || 'system'
      );
      res.json(config);
    } catch (error) {
      console.error('Error setting system config value:', error);
      res.status(500).json({ error: 'Failed to set system config value' });
    }
  };

  bulkSetSystemConfigs = async (req: Request, res: Response): Promise<void> => {
    try {
      const { configs } = req.body;
      await this.configurationService.bulkSetSystemConfigs(configs, req.user?.id || 'system');
      res.status(204).send();
    } catch (error) {
      console.error('Error bulk setting system configs:', error);
      res.status(500).json({ error: 'Failed to bulk set system configs' });
    }
  };

  // Utility endpoints
  exportConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const configuration = await this.configurationService.exportConfiguration();
      res.json(configuration);
    } catch (error) {
      console.error('Error exporting configuration:', error);
      res.status(500).json({ error: 'Failed to export configuration' });
    }
  };

  validateConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.configurationService.validateConfiguration();
      res.json(result);
    } catch (error) {
      console.error('Error validating configuration:', error);
      res.status(500).json({ error: 'Failed to validate configuration' });
    }
  };

  initializeDefaultConfigs = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.configurationService.initializeDefaultConfigs(req.user?.id || 'system');
      res.status(204).send();
    } catch (error) {
      console.error('Error initializing default configs:', error);
      res.status(500).json({ error: 'Failed to initialize default configs' });
    }
  };
}