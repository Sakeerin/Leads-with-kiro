import { Router } from 'express';
import { ConfigurationController } from '../controllers/configurationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const configurationController = new ConfigurationController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Custom Fields routes
router.get('/custom-fields/:entityType', configurationController.getCustomFields);
router.post('/custom-fields', configurationController.createCustomField);
router.put('/custom-fields/:id', configurationController.updateCustomField);
router.delete('/custom-fields/:id', configurationController.deleteCustomField);
router.post('/custom-fields/:entityType/reorder', configurationController.reorderCustomFields);
router.post('/custom-fields/:entityType/:fieldName/validate', configurationController.validateCustomFieldValue);

// Picklist Values routes
router.get('/picklist-values/:picklistType', configurationController.getPicklistValues);
router.get('/picklist-values/:picklistType/options', configurationController.getPicklistOptions);
router.post('/picklist-values', configurationController.createPicklistValue);
router.put('/picklist-values/:id', configurationController.updatePicklistValue);
router.delete('/picklist-values/:id', configurationController.deletePicklistValue);
router.post('/picklist-values/:picklistType/:valueId/set-default', configurationController.setDefaultPicklistValue);
router.post('/picklist-values/:picklistType/bulk-create', configurationController.bulkCreatePicklistValues);

// Status Workflow routes
router.get('/status-workflows/:entityType', configurationController.getStatusWorkflows);
router.post('/status-workflows', configurationController.createStatusWorkflow);
router.put('/status-workflows/:id', configurationController.updateStatusWorkflow);
router.delete('/status-workflows/:id', configurationController.deleteStatusWorkflow);
router.post('/status-workflows/:entityType/:workflowId/set-default', configurationController.setDefaultStatusWorkflow);
router.post('/status-workflows/:entityType/validate-transition', configurationController.validateStatusTransition);
router.get('/status-workflows/:entityType/:currentStatus/allowed-transitions', configurationController.getAllowedStatusTransitions);

// Working Hours Configuration routes
router.get('/working-hours-configs', configurationController.getWorkingHoursConfigs);
router.get('/working-hours-configs/default', configurationController.getDefaultWorkingHoursConfig);
router.post('/working-hours-configs', configurationController.createWorkingHoursConfig);
router.put('/working-hours-configs/:id', configurationController.updateWorkingHoursConfig);
router.delete('/working-hours-configs/:id', configurationController.deleteWorkingHoursConfig);
router.post('/working-hours-configs/:id/set-default', configurationController.setDefaultWorkingHoursConfig);

// Holiday Management routes
router.get('/holidays', configurationController.getHolidays);
router.post('/holidays', configurationController.createHoliday);
router.put('/holidays/:id', configurationController.updateHoliday);
router.delete('/holidays/:id', configurationController.deleteHoliday);
router.post('/holidays/initialize-thai', configurationController.initializeThaiHolidays);

// System Configuration routes
router.get('/system-configs', configurationController.getSystemConfigs);
router.get('/system-configs/category/:category', configurationController.getSystemConfigsByCategory);
router.post('/system-configs/:configKey', configurationController.setSystemConfigValue);
router.post('/system-configs/bulk-set', configurationController.bulkSetSystemConfigs);
router.post('/system-configs/initialize-defaults', configurationController.initializeDefaultConfigs);

// Utility routes
router.get('/export', configurationController.exportConfiguration);
router.get('/validate', configurationController.validateConfiguration);

export default router;