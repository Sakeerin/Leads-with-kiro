import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { attachmentService, Attachment, AttachmentUploadProgress } from '../services/attachmentService';

interface FileUploadProps {
  leadId: string;
  onUploadComplete?: (attachments: Attachment[]) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedFileTypes?: string[];
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  attachment?: Attachment;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  leadId,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
  acceptedFileTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip'
  ]
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Validate files
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > maxSize) {
        onUploadError?.(`File ${file.name} is too large. Maximum size is ${attachmentService.formatFileSize(maxSize)}`);
        return false;
      }
      if (!acceptedFileTypes.includes(file.type)) {
        onUploadError?.(`File type ${file.type} is not supported`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Check total file limit
    if (uploadingFiles.length + validFiles.length > maxFiles) {
      onUploadError?.(`Cannot upload more than ${maxFiles} files at once`);
      return;
    }

    setIsUploading(true);

    // Initialize uploading files state
    const newUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Upload files one by one
    const completedAttachments: Attachment[] = [];
    
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const fileIndex = uploadingFiles.length + i;

      try {
        const attachment = await attachmentService.uploadAttachment(
          leadId,
          file,
          {
            onProgress: (progress: AttachmentUploadProgress) => {
              setUploadingFiles(prev => 
                prev.map((uploadFile, index) => 
                  index === fileIndex 
                    ? { ...uploadFile, progress: progress.percentage }
                    : uploadFile
                )
              );
            }
          }
        );

        // Mark as completed
        setUploadingFiles(prev => 
          prev.map((uploadFile, index) => 
            index === fileIndex 
              ? { 
                  ...uploadFile, 
                  status: 'completed', 
                  progress: 100,
                  attachment 
                }
              : uploadFile
          )
        );

        completedAttachments.push(attachment);
      } catch (error: any) {
        // Mark as error
        setUploadingFiles(prev => 
          prev.map((uploadFile, index) => 
            index === fileIndex 
              ? { 
                  ...uploadFile, 
                  status: 'error', 
                  error: error.message || 'Upload failed'
                }
              : uploadFile
          )
        );

        onUploadError?.(error.message || `Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    
    if (completedAttachments.length > 0) {
      onUploadComplete?.(completedAttachments);
    }
  }, [leadId, maxFiles, maxSize, acceptedFileTypes, uploadingFiles.length, onUploadComplete, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize,
    maxFiles,
    disabled: isUploading
  });

  const removeUploadingFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearCompleted = () => {
    setUploadingFiles(prev => prev.filter(file => file.status !== 'completed'));
  };

  const getStatusIcon = (status: UploadingFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'uploading':
        return <WarningIcon color="warning" />;
      default:
        return <FileIcon />;
    }
  };

  const getStatusColor = (status: UploadingFile['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'uploading':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {/* Drop Zone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          textAlign: 'center',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
          }
        }}
      >
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          or click to select files
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Maximum {maxFiles} files, up to {attachmentService.formatFileSize(maxSize)} each
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            disabled={isUploading}
          >
            Choose Files
          </Button>
        </Box>
      </Paper>

      {/* Accepted File Types */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Accepted file types:
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {acceptedFileTypes.map(type => (
            <Chip
              key={type}
              label={type.split('/')[1].toUpperCase()}
              size="small"
              variant="outlined"
            />
          ))}
        </Box>
      </Box>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Upload Progress ({uploadingFiles.filter(f => f.status === 'completed').length}/{uploadingFiles.length})
            </Typography>
            <Button
              size="small"
              onClick={clearCompleted}
              disabled={uploadingFiles.every(f => f.status !== 'completed')}
            >
              Clear Completed
            </Button>
          </Box>

          <List>
            {uploadingFiles.map((uploadFile, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                    {getStatusIcon(uploadFile.status)}
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {uploadFile.file.name}
                        </Typography>
                        <Chip
                          label={uploadFile.status}
                          size="small"
                          color={getStatusColor(uploadFile.status) as any}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {attachmentService.formatFileSize(uploadFile.file.size)} • {uploadFile.file.type}
                        </Typography>
                        {uploadFile.status === 'uploading' && (
                          <LinearProgress
                            variant="determinate"
                            value={uploadFile.progress}
                            sx={{ mt: 1 }}
                          />
                        )}
                        {uploadFile.error && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            {uploadFile.error}
                          </Alert>
                        )}
                        {uploadFile.attachment?.virusScanned && !uploadFile.attachment.virusClean && (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            File failed virus scan
                          </Alert>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => removeUploadingFile(index)}
                      disabled={uploadFile.status === 'uploading'}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < uploadingFiles.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default FileUpload;