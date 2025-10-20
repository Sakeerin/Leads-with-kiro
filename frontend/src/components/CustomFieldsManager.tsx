import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';
import { configurationService, CustomField } from '../services/configurationService';

const ENTITY_TYPES = [
  { value: 'lead', label: 'Lead' },
  { value: 'account', label: 'Account' },
  { value: 'contact', label: 'Contact' },
  { value: 'opportunity', label: 'Opportunity' },
  { value: 'task', label: 'Task' },
  { value: 'activity', label: 'Activity' }
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date Time' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'picklist', label: 'Picklist' },
  { value: 'multi_picklist', label: 'Multi Picklist' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'currency', label: 'Currency' }
];

interface CustomFieldFormData {
  entityType: string;
  fieldName: string;
  fieldLabel: string;
  fieldLabelTh: string;
  fieldType: string;
  description: string;
  descriptionTh: string;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  defaultValue: string;
}

export const CustomFieldsManager: React.FC = () => {
  const [selectedEntityType, setSelectedEntityType] = useState('lead');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [formData, setFormData] = useState<CustomFieldFormData>({
    entityType: 'lead',
    fieldName: '',
    fieldLabel: '',
    fieldLabelTh: '',
    fieldType: 'text',
    description: '',
    descriptionTh: '',
    isRequired: false,
    isActive: true,
    displayOrder: 0,
    defaultValue: ''
  });

  useEffect(() => {
    loadCustomFields();
  }, [selectedEntityType]);

  const loadCustomFields = async () => {
    try {
      setLoading(true);
      setError(null);
      const fields = await configurationService.getCustomFields(selectedEntityType);
      setCustomFields(fields);
    } catch (err) {
      setError('Failed to load custom fields');
      console.error('Error loading custom fields:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEntityTypeChange = (event: React.SyntheticEvent, newValue: string) => {
    setSelectedEntityType(newValue);
  };

  const handleOpenDialog = (field?: CustomField) => {
    if (field) {
      setEditingField(field);
      setFormData({
        entityType: field.entityType,
        fieldName: field.fieldName,
        fieldLabel: field.fieldLabel,
        fieldLabelTh: field.fieldLabelTh || '',
        fieldType: field.fieldType,
        description: field.description || '',
        descriptionTh: field.descriptionTh || '',
        isRequired: field.isRequired,
        isActive: field.isActive,
        displayOrder: field.displayOrder,
        defaultValue: field.defaultValue || ''
      });
    } else {
      setEditingField(null);
      setFormData({
        entityType: selectedEntityType,
        fieldName: '',
        fieldLabel: '',
        fieldLabelTh: '',
        fieldType: 'text',
        description: '',
        descriptionTh: '',
        isRequired: false,
        isActive: true,
        displayOrder: customFields.length,
        defaultValue: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingField(null);
    setError(null);
  };

  const handleFormChange = (field: keyof CustomFieldFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      
      if (editingField) {
        await configurationService.updateCustomField(editingField.id, formData);
      } else {
        await configurationService.createCustomField({
          ...formData,
          createdBy: 'current-user' // This should come from auth context
        });
      }
      
      handleCloseDialog();
      loadCustomFields();
    } catch (err) {
      setError('Failed to save custom field');
      console.error('Error saving custom field:', err);
    }
  };

  const handleDelete = async (field: CustomField) => {
    if (window.confirm(`Are you sure you want to delete the field "${field.fieldLabel}"?`)) {
      try {
        await configurationService.deleteCustomField(field.id);
        loadCustomFields();
      } catch (err) {
        setError('Failed to delete custom field');
        console.error('Error deleting custom field:', err);
      }
    }
  };

  const getFieldTypeLabel = (type: string) => {
    const fieldType = FIELD_TYPES.find(ft => ft.value === type);
    return fieldType ? fieldType.label : type;
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Custom Fields Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Custom Field
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Select Entity Type
          </Typography>
          <Tabs
            value={selectedEntityType}
            onChange={handleEntityTypeChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {ENTITY_TYPES.map((entityType) => (
              <Tab
                key={entityType.value}
                label={entityType.label}
                value={entityType.value}
              />
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order</TableCell>
              <TableCell>Field Name</TableCell>
              <TableCell>Label</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Required</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customFields.map((field) => (
              <TableRow key={field.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DragIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    {field.displayOrder}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {field.fieldName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{field.fieldLabel}</Typography>
                    {field.fieldLabelTh && (
                      <Typography variant="caption" color="text.secondary">
                        {field.fieldLabelTh}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getFieldTypeLabel(field.fieldType)}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {field.isRequired ? (
                    <Chip label="Required" color="error" size="small" />
                  ) : (
                    <Chip label="Optional" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={field.isActive ? 'Active' : 'Inactive'}
                    color={field.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(field)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(field)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {customFields.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">
                    No custom fields defined for {selectedEntityType}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Custom Field Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingField ? 'Edit Custom Field' : 'Add Custom Field'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Entity Type</InputLabel>
              <Select
                value={formData.entityType}
                onChange={handleFormChange('entityType')}
                disabled={!!editingField}
              >
                {ENTITY_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Field Name"
              value={formData.fieldName}
              onChange={handleFormChange('fieldName')}
              disabled={!!editingField}
              helperText="Internal field name (cannot be changed after creation)"
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Field Label (English)"
                value={formData.fieldLabel}
                onChange={handleFormChange('fieldLabel')}
                fullWidth
              />
              <TextField
                label="Field Label (Thai)"
                value={formData.fieldLabelTh}
                onChange={handleFormChange('fieldLabelTh')}
                fullWidth
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>Field Type</InputLabel>
              <Select
                value={formData.fieldType}
                onChange={handleFormChange('fieldType')}
              >
                {FIELD_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Description (English)"
                value={formData.description}
                onChange={handleFormChange('description')}
                multiline
                rows={2}
                fullWidth
              />
              <TextField
                label="Description (Thai)"
                value={formData.descriptionTh}
                onChange={handleFormChange('descriptionTh')}
                multiline
                rows={2}
                fullWidth
              />
            </Box>

            <TextField
              label="Default Value"
              value={formData.defaultValue}
              onChange={handleFormChange('defaultValue')}
              fullWidth
            />

            <TextField
              label="Display Order"
              type="number"
              value={formData.displayOrder}
              onChange={handleFormChange('displayOrder')}
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isRequired}
                    onChange={handleFormChange('isRequired')}
                  />
                }
                label="Required Field"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={handleFormChange('isActive')}
                  />
                }
                label="Active"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingField ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};