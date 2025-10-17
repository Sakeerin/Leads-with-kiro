import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Alert,
  Chip,
  OutlinedInput,
  ListItemText,
  CircularProgress
} from '@mui/material';
import { ImportExportService, ExportResult } from '../services/importExportService';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  exportType: 'leads' | 'reports' | 'analytics';
  filters?: Record<string, any>;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  exportType,
  filters = {}
}) => {
  const [fileFormat, setFileFormat] = useState('csv');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ExportResult | null>(null);

  const availableColumns = ImportExportService.getAvailableLeadColumns();
  const fileFormatOptions = ImportExportService.getFileFormatOptions();

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let result: ExportResult;

      const exportOptions = {
        fileFormat,
        filters,
        columns: selectedColumns.length > 0 ? selectedColumns : undefined,
        includeHeaders
      };

      switch (exportType) {
        case 'leads':
          result = await ImportExportService.exportLeads(exportOptions);
          break;
        case 'reports':
          result = await ImportExportService.exportReports(exportOptions);
          break;
        case 'analytics':
          result = await ImportExportService.exportAnalytics(exportOptions);
          break;
        default:
          throw new Error('Invalid export type');
      }

      setSuccess(result);
      
      // Auto-download the file
      setTimeout(() => {
        handleDownload(result.exportId);
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (exportId: string) => {
    try {
      const blob = await ImportExportService.downloadExport(exportId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = success?.filename || `export.${fileFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download export file');
    }
  };

  const handleClose = () => {
    setFileFormat('csv');
    setSelectedColumns([]);
    setIncludeHeaders(true);
    setLoading(false);
    setError(null);
    setSuccess(null);
    onClose();
  };

  const getExportTitle = () => {
    switch (exportType) {
      case 'leads':
        return 'Export Leads';
      case 'reports':
        return 'Export Reports';
      case 'analytics':
        return 'Export Analytics';
      default:
        return 'Export Data';
    }
  };

  const getExportDescription = () => {
    switch (exportType) {
      case 'leads':
        return 'Export lead data with the current filters applied.';
      case 'reports':
        return 'Export report data in the selected format.';
      case 'analytics':
        return 'Export analytics data for further analysis.';
      default:
        return 'Export data in the selected format.';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{getExportTitle()}</DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {getExportDescription()}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Export completed successfully! {success.recordCount} records exported.
            <Button
              size="small"
              onClick={() => handleDownload(success.exportId)}
              sx={{ ml: 1 }}
            >
              Download Again
            </Button>
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>File Format</InputLabel>
            <Select
              value={fileFormat}
              onChange={(e) => setFileFormat(e.target.value)}
              label="File Format"
            >
              {fileFormatOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {exportType === 'leads' && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Columns to Export</InputLabel>
              <Select
                multiple
                value={selectedColumns}
                onChange={(e) => setSelectedColumns(e.target.value as string[])}
                input={<OutlinedInput label="Columns to Export" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const column = availableColumns.find(col => col.value === value);
                      return (
                        <Chip key={value} label={column?.label || value} size="small" />
                      );
                    })}
                  </Box>
                )}
              >
                {availableColumns.map((column) => (
                  <MenuItem key={column.value} value={column.value}>
                    <Checkbox checked={selectedColumns.indexOf(column.value) > -1} />
                    <ListItemText primary={column.label} />
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="textSecondary">
                Leave empty to export all columns
              </Typography>
            </FormControl>
          )}

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeHeaders}
                  onChange={(e) => setIncludeHeaders(e.target.checked)}
                />
              }
              label="Include column headers"
            />
          </Box>

          {Object.keys(filters).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Applied Filters:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {Object.entries(filters).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${key}: ${value}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};