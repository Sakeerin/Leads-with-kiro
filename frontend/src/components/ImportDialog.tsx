import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  Alert,
  LinearProgress,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { ImportExportService, ImportValidationResult, ImportResult } from '../services/importExportService';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: (result: ImportResult) => void;
}

const steps = ['Upload File', 'Map Fields', 'Configure Options', 'Import'];

export const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onClose,
  onImportComplete
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ImportValidationResult | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [options, setOptions] = useState({
    skipDuplicates: false,
    updateExisting: false,
    validateOnly: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);
    setError(null);

    try {
      const validationResult = await ImportExportService.validateImportFile(uploadedFile);
      setValidation(validationResult);
      setFieldMapping(validationResult.suggestedMapping);
      
      if (validationResult.isValid) {
        setActiveStep(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate file');
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const result = await ImportExportService.importLeads(file, {
        fieldMapping,
        ...options
      });

      onImportComplete(result);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import leads');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setFile(null);
    setValidation(null);
    setFieldMapping({});
    setOptions({
      skipDuplicates: false,
      updateExisting: false,
      validateOnly: false
    });
    setError(null);
    onClose();
  };

  const renderFileUpload = () => (
    <Box>
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed #ccc',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive ? '#f5f5f5' : 'transparent',
          '&:hover': {
            backgroundColor: '#f9f9f9'
          }
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <Typography>Drop the file here...</Typography>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              Drag & drop a file here, or click to select
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Supported formats: CSV, XLSX (max 10MB)
            </Typography>
          </Box>
        )}
      </Box>

      {file && (
        <Box mt={2}>
          <Typography variant="subtitle2">Selected File:</Typography>
          <Typography variant="body2">{file.name}</Typography>
        </Box>
      )}

      {validation && (
        <Box mt={2}>
          <Alert severity={validation.isValid ? 'success' : 'error'}>
            {validation.isValid 
              ? `File is valid. Found ${validation.totalRecords} records.`
              : `File has ${validation.validationErrors.length} validation errors.`
            }
          </Alert>

          {validation.validationErrors.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2">Validation Errors:</Typography>
              {validation.validationErrors.slice(0, 5).map((error, index) => (
                <Typography key={index} variant="body2" color="error">
                  Row {error.row}: {error.message}
                </Typography>
              ))}
              {validation.validationErrors.length > 5 && (
                <Typography variant="body2" color="textSecondary">
                  ... and {validation.validationErrors.length - 5} more errors
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );

  const renderFieldMapping = () => {
    if (!validation) return null;

    const availableFields = [
      'company.name', 'contact.name', 'contact.email', 'contact.phone', 'contact.mobile',
      'source.channel', 'source.campaign', 'status', 'company.industry', 'company.size',
      'qualification.interest', 'qualification.budget', 'qualification.timeline',
      'qualification.businessType', 'product.type', 'product.adType',
      'followUp.nextDate', 'followUp.notes'
    ];

    const csvColumns = Object.keys(validation.suggestedMapping);

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Map CSV Columns to Lead Fields
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Map each column from your CSV file to the corresponding lead field.
        </Typography>

        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>CSV Column</TableCell>
                <TableCell>Sample Data</TableCell>
                <TableCell>Lead Field</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {csvColumns.map((column) => (
                <TableRow key={column}>
                  <TableCell>{column}</TableCell>
                  <TableCell>
                    {validation.sampleData[0]?.[column] || '-'}
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={fieldMapping[column] || ''}
                        onChange={(e) => setFieldMapping({
                          ...fieldMapping,
                          [column]: e.target.value
                        })}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>Skip this column</em>
                        </MenuItem>
                        {availableFields.map((field) => (
                          <MenuItem key={field} value={field}>
                            {field}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderOptions = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Import Options
      </Typography>

      <Box mt={2}>
        <FormControlLabel
          control={
            <Checkbox
              checked={options.skipDuplicates}
              onChange={(e) => setOptions({
                ...options,
                skipDuplicates: e.target.checked,
                updateExisting: e.target.checked ? false : options.updateExisting
              })}
            />
          }
          label="Skip duplicate records"
        />
        <Typography variant="body2" color="textSecondary">
          Skip records that match existing leads based on email, phone, or company name.
        </Typography>
      </Box>

      <Box mt={2}>
        <FormControlLabel
          control={
            <Checkbox
              checked={options.updateExisting}
              onChange={(e) => setOptions({
                ...options,
                updateExisting: e.target.checked,
                skipDuplicates: e.target.checked ? false : options.skipDuplicates
              })}
            />
          }
          label="Update existing records"
        />
        <Typography variant="body2" color="textSecondary">
          Update existing leads with new data from the import file.
        </Typography>
      </Box>

      <Box mt={2}>
        <FormControlLabel
          control={
            <Checkbox
              checked={options.validateOnly}
              onChange={(e) => setOptions({
                ...options,
                validateOnly: e.target.checked
              })}
            />
          }
          label="Validate only (don't import)"
        />
        <Typography variant="body2" color="textSecondary">
          Only validate the data without actually importing any records.
        </Typography>
      </Box>

      {validation && validation.totalRecords > 0 && (
        <Box mt={3}>
          <Alert severity="info">
            Ready to import {validation.totalRecords} records with the selected options.
          </Alert>
        </Box>
      )}
    </Box>
  );

  const renderImport = () => (
    <Box textAlign="center">
      <Typography variant="h6" gutterBottom>
        {loading ? 'Importing...' : 'Ready to Import'}
      </Typography>
      
      {loading && <LinearProgress sx={{ mt: 2, mb: 2 }} />}
      
      <Box mt={2}>
        <Typography variant="body1">
          File: {file?.name}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Records: {validation?.totalRecords}
        </Typography>
        
        <Box mt={2}>
          {options.skipDuplicates && (
            <Chip label="Skip Duplicates" size="small" sx={{ mr: 1 }} />
          )}
          {options.updateExisting && (
            <Chip label="Update Existing" size="small" sx={{ mr: 1 }} />
          )}
          {options.validateOnly && (
            <Chip label="Validate Only" size="small" sx={{ mr: 1 }} />
          )}
        </Box>
      </Box>
    </Box>
  );

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderFileUpload();
      case 1:
        return renderFieldMapping();
      case 2:
        return renderOptions();
      case 3:
        return renderImport();
      default:
        return null;
    }
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return file && validation?.isValid;
      case 1:
        return Object.values(fieldMapping).some(value => value !== '');
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Leads</DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {getStepContent(activeStep)}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={!isStepValid(activeStep) || loading}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={loading}
          >
            {options.validateOnly ? 'Validate' : 'Import'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};