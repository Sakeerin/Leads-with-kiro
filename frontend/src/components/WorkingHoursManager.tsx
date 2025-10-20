import React from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';

export const WorkingHoursManager: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Working Hours Configuration
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">
          Working hours configuration interface will be implemented here.
          This will allow setting up business hours, time zones, and
          availability schedules for lead assignment and SLA calculations.
        </Alert>
      </Paper>
    </Box>
  );
};