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
  Typography,
  Box,
  TextField,
} from '@mui/material';
import { LeadStatus, BulkOperation } from '../types';

interface BulkOperationsDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (operation: BulkOperation) => void;
  selectedCount: number;
  loading?: boolean;
}

export const BulkOperationsDialog: React.FC<BulkOperationsDialogProps> = ({
  open,
  onClose,
  onSubmit,
  selectedCount,
  loading = false,
}) => {
  const [operationType, setOperationType] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [label, setLabel] = useState<string>('');

  const handleSubmit = () => {
    const operation: BulkOperation = {
      type: operationType as any,
      leadIds: [], // This will be populated by the parent component
      parameters: {},
    };

    switch (operationType) {
      case 'assign':
        operation.parameters.assigneeId = assigneeId;
        break;
      case 'status_change':
        operation.parameters.status = status;
        break;
      case 'add_label':
        operation.parameters.label = label;
        break;
    }

    onSubmit(operation);
  };

  const handleClose = () => {
    setOperationType('');
    setAssigneeId('');
    setStatus('');
    setLabel('');
    onClose();
  };

  const isValid = () => {
    switch (operationType) {
      case 'assign':
        return !!assigneeId;
      case 'status_change':
        return !!status;
      case 'add_label':
        return !!label;
      case 'delete':
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Bulk Operations</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {selectedCount} lead{selectedCount > 1 ? 's' : ''} selected
        </Typography>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Operation</InputLabel>
          <Select
            value={operationType}
            onChange={(e) => setOperationType(e.target.value)}
            label="Operation"
          >
            <MenuItem value="assign">Assign to User</MenuItem>
            <MenuItem value="status_change">Change Status</MenuItem>
            <MenuItem value="add_label">Add Label</MenuItem>
            <MenuItem value="delete">Delete</MenuItem>
          </Select>
        </FormControl>

        {operationType === 'assign' && (
          <FormControl fullWidth>
            <InputLabel>Assign To</InputLabel>
            <Select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              label="Assign To"
            >
              <MenuItem value="user1">John Doe</MenuItem>
              <MenuItem value="user2">Jane Smith</MenuItem>
              <MenuItem value="user3">Mike Johnson</MenuItem>
            </Select>
          </FormControl>
        )}

        {operationType === 'status_change' && (
          <FormControl fullWidth>
            <InputLabel>New Status</InputLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              label="New Status"
            >
              {Object.values(LeadStatus).map(statusValue => (
                <MenuItem key={statusValue} value={statusValue}>
                  {statusValue.replace('_', ' ').toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {operationType === 'add_label' && (
          <TextField
            fullWidth
            label="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Enter label name"
          />
        )}

        {operationType === 'delete' && (
          <Box sx={{ p: 2, backgroundColor: 'error.light', borderRadius: 1 }}>
            <Typography variant="body2" color="error.contrastText">
              ⚠️ This action cannot be undone. The selected leads will be permanently deleted.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isValid() || loading}
          color={operationType === 'delete' ? 'error' : 'primary'}
        >
          {loading ? 'Processing...' : 'Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};