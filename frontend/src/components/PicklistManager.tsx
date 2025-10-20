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
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import { configurationService, PicklistValue } from '../services/configurationService';

const PICKLIST_TYPES = [
  { value: 'status', label: 'Lead Status' },
  { value: 'source', label: 'Lead Source' },
  { value: 'product_type', label: 'Product Type' },
  { value: 'ad_type', label: 'Ad Type' },
  { value: 'industry', label: 'Industry' },
  { value: 'company_size', label: 'Company Size' },
  { value: 'interest_level', label: 'Interest Level' },
  { value: 'budget_status', label: 'Budget Status' },
  { value: 'purchase_timeline', label: 'Purchase Timeline' },
  { value: 'business_type', label: 'Business Type' }
];

interface PicklistValueFormData {
  picklistType: string;
  value: string;
  label: string;
  labelTh: string;
  description: string;
  descriptionTh: string;
  colorCode: string;
  icon: string;
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
}

export const PicklistManager: React.FC = () => {
  const [selectedPicklistType, setSelectedPicklistType] = useState('status');
  const [picklistValues, setPicklistValues] = useState<PicklistValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<PicklistValue | null>(null);
  const [formData, setFormData] = useState<PicklistValueFormData>({
    picklistType: 'status',
    value: '',
    label: '',
    labelTh: '',
    description: '',
    descriptionTh: '',
    colorCode: '',
    icon: '',
    isActive: true,
    isDefault: false,
    displayOrder: 0
  });

  useEffect(() => {
    loadPicklistValues();
  }, [selectedPicklistType]);

  const loadPicklistValues = async () => {
    try {
      setLoading(true);
      setError(null);
      const values = await configurationService.getPicklistValues(selectedPicklistType);
      setPicklistValues(values);
    } catch (err) {
      setError('Failed to load picklist values');
      console.error('Error loading picklist values:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePicklistTypeChange = (event: React.SyntheticEvent, newValue: string) => {
    setSelectedPicklistType(newValue);
  };

  const handleOpenDialog = (value?: PicklistValue) => {
    if (value) {
      setEditingValue(value);
      setFormData({
        picklistType: value.picklistType,
        value: value.value,
        label: value.label,
        labelTh: value.labelTh || '',
        description: value.description || '',
        descriptionTh: value.descriptionTh || '',
        colorCode: value.colorCode || '',
        icon: value.icon || '',
        isActive: value.isActive,
        isDefault: value.isDefault,
        displayOrder: value.displayOrder
      });
    } else {
      setEditingValue(null);
      setFormData({
        picklistType: selectedPicklistType,
        value: '',
        label: '',
        labelTh: '',
        description: '',
        descriptionTh: '',
        colorCode: '',
        icon: '',
        isActive: true,
        isDefault: false,
        displayOrder: picklistValues.length
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingValue(null);
    setError(null);
  };

  const handleFormChange = (field: keyof PicklistValueFormData) => (
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
      
      if (editingValue) {
        await configurationService.updatePicklistValue(editingValue.id, formData);
      } else {
        await configurationService.createPicklistValue({
          ...formData,
          createdBy: 'current-user'
        });
      }
      
      handleCloseDialog();
      loadPicklistValues();
    } catch (err) {
      setError('Failed to save picklist value');
      console.error('Error saving picklist value:', err);
    }
  };

  const handleDelete = async (value: PicklistValue) => {
    if (window.confirm(`Are you sure you want to delete "${value.label}"?`)) {
      try {
        await configurationService.deletePicklistValue(value.id);
        loadPicklistValues();
      } catch (err) {
        setError('Failed to delete picklist value');
        console.error('Error deleting picklist value:', err);
      }
    }
  };

  const handleSetDefault = async (value: PicklistValue) => {
    try {
      await configurationService.setDefaultPicklistValue(selectedPicklistType, value.id);
      loadPicklistValues();
    } catch (err) {
      setError('Failed to set default value');
      console.error('Error setting default value:', err);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Picklist Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Value
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
            Select Picklist Type
          </Typography>
          <Tabs
            value={selectedPicklistType}
            onChange={handlePicklistTypeChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {PICKLIST_TYPES.map((type) => (
              <Tab
                key={type.value}
                label={type.label}
                value={type.value}
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
              <TableCell>Value</TableCell>
              <TableCell>Label</TableCell>
              <TableCell>Color</TableCell>
              <TableCell>Default</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {picklistValues.map((value) => (
              <TableRow key={value.id}>
                <TableCell>{value.displayOrder}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {value.value}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{value.label}</Typography>
                    {value.labelTh && (
                      <Typography variant="caption" color="text.secondary">
                        {value.labelTh}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {value.colorCode && (
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        backgroundColor: value.colorCode,
                        borderRadius: 1,
                        border: '1px solid #ccc'
                      }}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleSetDefault(value)}
                    color={value.isDefault ? 'primary' : 'default'}
                  >
                    {value.isDefault ? <StarIcon /> : <StarBorderIcon />}
                  </IconButton>
                </TableCell>
                <TableCell>
                  <Chip
                    label={value.isActive ? 'Active' : 'Inactive'}
                    color={value.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(value)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(value)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {picklistValues.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">
                    No values defined for this picklist
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Picklist Value Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingValue ? 'Edit Picklist Value' : 'Add Picklist Value'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Value"
              value={formData.value}
              onChange={handleFormChange('value')}
              disabled={!!editingValue}
              helperText="Internal value (cannot be changed after creation)"
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Label (English)"
                value={formData.label}
                onChange={handleFormChange('label')}
                fullWidth
              />
              <TextField
                label="Label (Thai)"
                value={formData.labelTh}
                onChange={handleFormChange('labelTh')}
                fullWidth
              />
            </Box>

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

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Color Code"
                value={formData.colorCode}
                onChange={handleFormChange('colorCode')}
                placeholder="#FF5722"
                fullWidth
              />
              <TextField
                label="Icon"
                value={formData.icon}
                onChange={handleFormChange('icon')}
                placeholder="icon-name"
                fullWidth
              />
            </Box>

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
                    checked={formData.isActive}
                    onChange={handleFormChange('isActive')}
                  />
                }
                label="Active"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isDefault}
                    onChange={handleFormChange('isDefault')}
                  />
                }
                label="Default Value"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingValue ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};