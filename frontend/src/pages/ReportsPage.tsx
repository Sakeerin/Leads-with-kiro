import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { ReportingDashboard } from '../components/ReportingDashboard';

export const ReportsPage: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Reports & Analytics
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          Comprehensive reporting dashboard with funnel metrics, SLA compliance, source effectiveness, and sales performance analytics.
        </Typography>
        
        <ReportingDashboard />
      </Box>
    </Container>
  );
};