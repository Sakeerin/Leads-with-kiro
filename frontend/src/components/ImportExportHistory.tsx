import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Undo as UndoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { 
  ImportExportService, 
  ImportHistory, 
  ExportHistory,
  ImportProgress 
} from '../services/importExportService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

export const ImportExportHistory: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImport, setSelectedImport] = useState<string | null>(null);
  const [importDetails, setImportDetails] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rollbackConfirmOpen, setRollbackConfirmOpen] = useState(false);
  const [rollbackImportId, setRollbackImportId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const [imports, exports] = await Promise.all([
        ImportExportService.getImportHistory(),
        ImportExportService.getExportHistory()
      ]);
      setImportHistory(imports);
      setExportHistory(exports);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewImportDetails = async (importId: string) => {
    try {
      const details = await ImportExportService.getImportDetails(importId);
      setImportDetails(details);
      setSelectedImport(importId);
      setDetailsOpen(true);
    } catch (error) {
      console.error('Failed to load import details:', error);
    }
  };

  const handleDownloadExport = async (exportId: string) => {
    try {
      const blob = await ImportExportService.downloadExport(exportId);
      const exportItem = exportHistory.find(item => item.id === exportId);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportItem?.filename || `export.${exportItem?.fileFormat || 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download export:', error);
    }
  };

  const handleRollbackImport = async () => {
    if (!rollbackImportId) return;

    try {
      await ImportExportService.rollbackImport(rollbackImportId);
      setRollbackConfirmOpen(false);
      setRollbackImportId(null);
      loadHistory(); // Refresh the list
    } catch (error) {
      console.error('Failed to rollback import:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      case 'rolled_back':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderImportHistory = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>File Name</TableCell>
            <TableCell>Records</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Success Rate</TableCell>
            <TableCell>Started At</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {importHistory.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {item.originalFilename}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {item.fileType.toUpperCase()}
                </Typography>
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2">
                    Total: {item.totalRecords}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    Success: {item.successfulRecords}
                  </Typography>
                  {item.failedRecords > 0 && (
                    <Typography variant="caption" color="error.main" display="block">
                      Failed: {item.failedRecords}
                    </Typography>
                  )}
                  {item.duplicateRecords > 0 && (
                    <Typography variant="caption" color="warning.main" display="block">
                      Duplicates: {item.duplicateRecords}
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={item.status}
                  color={getStatusColor(item.status) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {item.totalRecords > 0 && (
                  <Box>
                    <Typography variant="body2">
                      {Math.round((item.successfulRecords / item.totalRecords) * 100)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(item.successfulRecords / item.totalRecords) * 100}
                      sx={{ width: 60, height: 4 }}
                    />
                  </Box>
                )}
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatDate(item.startedAt)}
                </Typography>
                {item.completedAt && (
                  <Typography variant="caption" color="textSecondary">
                    Completed: {formatDate(item.completedAt)}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Tooltip title="View Details">
                  <IconButton
                    size="small"
                    onClick={() => handleViewImportDetails(item.id)}
                  >
                    <ViewIcon />
                  </IconButton>
                </Tooltip>
                {item.status === 'completed' && (
                  <Tooltip title="Rollback Import">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setRollbackImportId(item.id);
                        setRollbackConfirmOpen(true);
                      }}
                    >
                      <UndoIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderExportHistory = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>File Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Format</TableCell>
            <TableCell>Records</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Started At</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {exportHistory.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {item.filename}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={item.exportType}
                  variant="outlined"
                  size="small"
                />
              </TableCell>
              <TableCell>
                {item.fileFormat.toUpperCase()}
              </TableCell>
              <TableCell>
                {item.recordCount.toLocaleString()}
              </TableCell>
              <TableCell>
                <Chip
                  label={item.status}
                  color={getStatusColor(item.status) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatDate(item.startedAt)}
                </Typography>
                {item.completedAt && (
                  <Typography variant="caption" color="textSecondary">
                    Completed: {formatDate(item.completedAt)}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                {item.status === 'completed' && (
                  <Tooltip title="Download">
                    <IconButton
                      size="small"
                      onClick={() => handleDownloadExport(item.id)}
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Import/Export History</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadHistory}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Import History" />
          <Tab label="Export History" />
        </Tabs>

        {loading && <LinearProgress sx={{ mt: 1 }} />}

        <TabPanel value={tabValue} index={0}>
          {importHistory.length === 0 ? (
            <Alert severity="info">No import history found.</Alert>
          ) : (
            renderImportHistory()
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {exportHistory.length === 0 ? (
            <Alert severity="info">No export history found.</Alert>
          ) : (
            renderExportHistory()
          )}
        </TabPanel>

        {/* Import Details Dialog */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Import Details</DialogTitle>
          <DialogContent>
            {importDetails && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {importDetails.import.originalFilename}
                </Typography>
                
                <Box mb={2}>
                  <Typography variant="subtitle2">Summary:</Typography>
                  <Typography variant="body2">
                    Total Records: {importDetails.import.totalRecords}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    Successful: {importDetails.import.successfulRecords}
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    Failed: {importDetails.import.failedRecords}
                  </Typography>
                  <Typography variant="body2" color="warning.main">
                    Duplicates: {importDetails.import.duplicateRecords}
                  </Typography>
                </Box>

                {importDetails.summary.errorSummary.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2">Common Errors:</Typography>
                    {importDetails.summary.errorSummary.slice(0, 5).map((error: any, index: number) => (
                      <Typography key={index} variant="body2" color="error.main">
                        {error.error} ({error.count} occurrences)
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Rollback Confirmation Dialog */}
        <Dialog
          open={rollbackConfirmOpen}
          onClose={() => setRollbackConfirmOpen(false)}
        >
          <DialogTitle>Confirm Rollback</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This will delete all leads that were created during this import. This action cannot be undone.
            </Alert>
            <Typography>
              Are you sure you want to rollback this import?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRollbackConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleRollbackImport} color="error" variant="contained">
              Rollback
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};