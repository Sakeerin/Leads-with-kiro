import React from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';

export const SystemConfigManager: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        System Configuration
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">
          System configuration interface will be implemented here.
          This will allow management of system-wide settings including
          email configuration, security settings, and application preferences.
        </Alert>
      </Paper>
    </Box>
  );
};