
import { Routes, Route } from 'react-router-dom';
import { Container, Typography, Box, AppBar, Toolbar, Button, Stack } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { LeadManagement } from './pages/LeadManagement';

function App() {
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Navigation */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Lead Management System
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              color="inherit"
              component={Link}
              to="/"
              variant={location.pathname === '/' ? 'outlined' : 'text'}
              sx={{ color: 'white', borderColor: 'white' }}
            >
              Dashboard
            </Button>
            <Button
              color="inherit"
              component={Link}
              to="/leads"
              variant={location.pathname === '/leads' ? 'outlined' : 'text'}
              sx={{ color: 'white', borderColor: 'white' }}
            >
              Leads
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={
            <Container maxWidth="lg" sx={{ py: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                Dashboard
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Welcome to the Lead Management System. Dashboard functionality will be implemented in upcoming tasks.
              </Typography>
            </Container>
          } />
          <Route path="/leads" element={<LeadManagement />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;