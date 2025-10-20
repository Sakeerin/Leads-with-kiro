import React from 'react';
import { Box, Container, useMediaQuery, useTheme } from '@mui/material';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
  mobileFullWidth?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 'lg',
  disableGutters = false,
  mobileFullWidth = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isMobile && mobileFullWidth) {
    return (
      <Box
        sx={{
          width: '100%',
          px: disableGutters ? 0 : 1,
          mx: 'auto',
        }}
      >
        {children}
      </Box>
    );
  }

  return (
    <Container
      maxWidth={maxWidth}
      disableGutters={disableGutters}
      sx={{
        px: { xs: disableGutters ? 0 : 1, md: disableGutters ? 0 : 3 },
      }}
    >
      {children}
    </Container>
  );
};