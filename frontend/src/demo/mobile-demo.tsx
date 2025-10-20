import React from 'react';
import { 
  Box, 
  Typography, 
  Stack, 
  Card, 
  CardContent,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { 
  TouchFriendlyButton, 
  TouchFriendlyIconButton,
  MobileTextField,
  ResponsiveContainer 
} from '../components/MobileOptimized';
import { 
  Phone as PhoneIcon,
  Email as EmailIcon,
  Add as AddIcon,
} from '@mui/icons-material';

export const MobileDemo: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <ResponsiveContainer>
      <Box sx={{ py: 2 }}>
        <Typography variant="h4" gutterBottom>
          Mobile Responsiveness Demo
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Current viewport: {isMobile ? 'Mobile' : 'Desktop'}
        </Typography>

        <Stack spacing={3}>
          {/* Touch-Friendly Buttons */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Touch-Friendly Buttons
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <TouchFriendlyButton variant="contained">
                  Primary Button
                </TouchFriendlyButton>
                <TouchFriendlyButton variant="outlined">
                  Secondary Button
                </TouchFriendlyButton>
                <TouchFriendlyIconButton>
                  <AddIcon />
                </TouchFriendlyIconButton>
              </Stack>
            </CardContent>
          </Card>

          {/* Mobile Communication Features */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Mobile Communication Features
              </Typography>
              <Stack direction="row" spacing={2}>
                <TouchFriendlyButton
                  variant="contained"
                  startIcon={<PhoneIcon />}
                  href="tel:+1234567890"
                  component="a"
                >
                  Call Now
                </TouchFriendlyButton>
                <TouchFriendlyButton
                  variant="contained"
                  startIcon={<EmailIcon />}
                  href="mailto:test@example.com"
                  component="a"
                >
                  Send Email
                </TouchFriendlyButton>
              </Stack>
            </CardContent>
          </Card>

          {/* Mobile-Optimized Form Fields */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Mobile-Optimized Form Fields
              </Typography>
              <Stack spacing={2}>
                <MobileTextField
                  label="Name"
                  placeholder="Enter your name"
                  fullWidth
                />
                <MobileTextField
                  label="Email"
                  type="email"
                  placeholder="Enter your email"
                  fullWidth
                />
                <MobileTextField
                  label="Phone"
                  type="tel"
                  placeholder="Enter your phone"
                  fullWidth
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Responsive Layout Demo */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Responsive Layout
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: '1fr 1fr',
                    md: '1fr 1fr 1fr',
                  },
                  gap: 2,
                }}
              >
                {[1, 2, 3].map((item) => (
                  <Box
                    key={item}
                    sx={{
                      p: 2,
                      bgcolor: 'primary.light',
                      color: 'primary.contrastText',
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    Item {item}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Performance Info */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Features
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  ✓ Touch-friendly 44px minimum touch targets
                </Typography>
                <Typography variant="body2">
                  ✓ iOS zoom prevention with 16px font size
                </Typography>
                <Typography variant="body2">
                  ✓ Responsive breakpoints for all screen sizes
                </Typography>
                <Typography variant="body2">
                  ✓ Optimized spacing and typography for mobile
                </Typography>
                <Typography variant="body2">
                  ✓ Click-to-call and email functionality
                </Typography>
                <Typography variant="body2">
                  ✓ Smooth scrolling and touch interactions
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </ResponsiveContainer>
  );
};