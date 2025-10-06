import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, Typography, Box } from '@mui/material';

function App() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Lead Management System
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome to the Lead Management System. The application is being set up.
        </Typography>
        
        <Routes>
          <Route path="/" element={
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6">Dashboard</Typography>
              <Typography variant="body2">
                Dashboard functionality will be implemented in upcoming tasks.
              </Typography>
            </Box>
          } />
          <Route path="/leads" element={
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6">Lead Management</Typography>
              <Typography variant="body2">
                Lead management functionality will be implemented in upcoming tasks.
              </Typography>
            </Box>
          } />
        </Routes>
      </Box>
    </Container>
  );
}

export default App;