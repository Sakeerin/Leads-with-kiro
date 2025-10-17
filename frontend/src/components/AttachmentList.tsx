import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as PreviewIcon,
  MoreVert as MoreIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as PendingIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { attachmentService, Attachment } from '../services/attachmentService';

interface AttachmentListProps {
  leadId: string;
  attachments?: Attachment[];
  onAttachmentDeleted?: (attachmentId: string) => void;
  onRefresh?: () => void;
}

export const AttachmentList: React.FC<AttachmentListProps> = ({
  leadId,
  attachments: propAttachments,
  onAttachmentDeleted,
  onRefresh
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>(propAttachments || []);
  const [loading, setLoading] = useState(!propAttachments);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!propAttachments) {
      loadAttachments();
    }
  }, [leadId, propAttachments]);

  useEffect(() => {
    if (propAttachments) {
      setAttachments(propAttachments);
    }
  }, [propAttachments]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await attachmentService.getAttachmentsByLead(leadId);
      setAttachments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      setActionLoading(attachment.id);
      const blob = await attachmentService.downloadAttachment(attachment.id);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download attachment');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePreview = async (attachment: Attachment) => {
    if (!attachmentService.isPreviewable(attachment.contentType)) {
      setError('This file type cannot be previewed');
      return;
    }

    try {
      setActionLoading(attachment.id);
      const url = await attachmentService.previewAttachment(attachment.id);
      setPreviewUrl(url);
      setSelectedAttachment(attachment);
      setPreviewDialogOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to preview attachment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedAttachment) return;

    try {
      setActionLoading(selectedAttachment.id);
      await attachmentService.deleteAttachment(selectedAttachment.id);
      
      setAttachments(prev => prev.filter(a => a.id !== selectedAttachment.id));
      onAttachmentDeleted?.(selectedAttachment.id);
      setDeleteDialogOpen(false);
      setSelectedAttachment(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete attachment');
    } finally {
      setActionLoading(null);
    }
  };

  const openDeleteDialog = (attachment: Attachment) => {
    setSelectedAttachment(attachment);
    setDeleteDialogOpen(true);
    setMenuAnchor(null);
  };

  const openMenu = (event: React.MouseEvent<HTMLElement>, attachment: Attachment) => {
    setMenuAnchor(event.currentTarget);
    setSelectedAttachment(attachment);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setSelectedAttachment(null);
  };

  const getVirusStatusIcon = (attachment: Attachment) => {
    if (!attachment.virusScanned) {
      return (
        <Tooltip title="Virus scan pending">
          <PendingIcon color="warning" />
        </Tooltip>
      );
    }
    
    if (attachment.virusClean === true) {
      return (
        <Tooltip title="File is clean">
          <CheckIcon color="success" />
        </Tooltip>
      );
    }
    
    if (attachment.virusClean === false) {
      return (
        <Tooltip title="Virus detected">
          <ErrorIcon color="error" />
        </Tooltip>
      );
    }

    return null;
  };

  const getVirusStatusChip = (attachment: Attachment) => {
    if (!attachment.virusScanned) {
      return <Chip label="Scanning" size="small" color="warning" variant="outlined" />;
    }
    
    if (attachment.virusClean === true) {
      return <Chip label="Clean" size="small" color="success" variant="outlined" />;
    }
    
    if (attachment.virusClean === false) {
      return <Chip label="Infected" size="small" color="error" variant="outlined" />;
    }

    return null;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={loadAttachments}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (attachments.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          No attachments found
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <List>
        {attachments.map((attachment) => (
          <ListItem key={attachment.id} divider>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <Typography sx={{ fontSize: '1.5rem' }}>
                {attachmentService.getFileIcon(attachment.contentType)}
              </Typography>
            </Box>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {attachment.filename}
                  </Typography>
                  {getVirusStatusChip(attachment)}
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {attachmentService.formatFileSize(attachment.size)} • {attachment.contentType}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="text.secondary">
                    Uploaded {new Date(attachment.uploadedAt).toLocaleString()}
                  </Typography>
                  {attachment.scanResult && (
                    <>
                      <br />
                      <Typography variant="caption" color="text.secondary">
                        Scan: {attachment.scanResult}
                      </Typography>
                    </>
                  )}
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getVirusStatusIcon(attachment)}
                
                {/* Quick Actions */}
                {attachmentService.isPreviewable(attachment.contentType) && (
                  <IconButton
                    size="small"
                    onClick={() => handlePreview(attachment)}
                    disabled={actionLoading === attachment.id || attachment.virusClean === false}
                  >
                    {actionLoading === attachment.id ? (
                      <CircularProgress size={20} />
                    ) : (
                      <PreviewIcon />
                    )}
                  </IconButton>
                )}
                
                <IconButton
                  size="small"
                  onClick={() => handleDownload(attachment)}
                  disabled={actionLoading === attachment.id || attachment.virusClean === false}
                >
                  {actionLoading === attachment.id ? (
                    <CircularProgress size={20} />
                  ) : (
                    <DownloadIcon />
                  )}
                </IconButton>

                {/* More Actions Menu */}
                <IconButton
                  size="small"
                  onClick={(e) => openMenu(e, attachment)}
                >
                  <MoreIcon />
                </IconButton>
              </Box>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
      >
        <MenuItem
          onClick={() => {
            if (selectedAttachment) {
              handleDownload(selectedAttachment);
            }
            closeMenu();
          }}
          disabled={selectedAttachment?.virusClean === false}
        >
          <DownloadIcon sx={{ mr: 1 }} />
          Download
        </MenuItem>
        {selectedAttachment && attachmentService.isPreviewable(selectedAttachment.contentType) && (
          <MenuItem
            onClick={() => {
              if (selectedAttachment) {
                handlePreview(selectedAttachment);
              }
              closeMenu();
            }}
            disabled={selectedAttachment?.virusClean === false}
          >
            <PreviewIcon sx={{ mr: 1 }} />
            Preview
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (selectedAttachment) {
              openDeleteDialog(selectedAttachment);
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Attachment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedAttachment?.filename}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            disabled={actionLoading === selectedAttachment?.id}
          >
            {actionLoading === selectedAttachment?.id ? (
              <CircularProgress size={20} />
            ) : (
              'Delete'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Preview: {selectedAttachment?.filename}
        </DialogTitle>
        <DialogContent>
          {previewUrl && selectedAttachment && (
            <Box sx={{ textAlign: 'center' }}>
              {selectedAttachment.contentType.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={selectedAttachment.filename}
                  style={{ maxWidth: '100%', maxHeight: '70vh' }}
                />
              ) : selectedAttachment.contentType === 'application/pdf' ? (
                <iframe
                  src={previewUrl}
                  width="100%"
                  height="500px"
                  title={selectedAttachment.filename}
                />
              ) : (
                <Typography>Preview not available for this file type</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          <Button
            onClick={() => selectedAttachment && handleDownload(selectedAttachment)}
            startIcon={<DownloadIcon />}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttachmentList;