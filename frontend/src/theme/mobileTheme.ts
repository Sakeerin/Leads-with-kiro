import { createTheme } from '@mui/material/styles';

// Mobile-optimized theme configuration
export const mobileTheme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    // Optimize buttons for touch
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44, // Minimum touch target size
          '@media (max-width: 768px)': {
            minHeight: 48,
            fontSize: '0.875rem',
          },
        },
      },
    },
    // Optimize IconButtons for touch
    MuiIconButton: {
      styleOverrides: {
        root: {
          '@media (max-width: 768px)': {
            minWidth: 44,
            minHeight: 44,
            padding: 12,
          },
        },
      },
    },
    // Optimize Fab for mobile
    MuiFab: {
      styleOverrides: {
        root: {
          '@media (max-width: 768px)': {
            width: 56,
            height: 56,
          },
        },
      },
    },
    // Optimize TextField for mobile
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input': {
            '@media (max-width: 768px)': {
              fontSize: '16px', // Prevent zoom on iOS
              padding: '16px 14px',
            },
          },
        },
      },
    },
    // Optimize Select for mobile
    MuiSelect: {
      styleOverrides: {
        select: {
          '@media (max-width: 768px)': {
            fontSize: '16px', // Prevent zoom on iOS
            padding: '16px 14px',
          },
        },
      },
    },
    // Optimize Chip for mobile
    MuiChip: {
      styleOverrides: {
        root: {
          '@media (max-width: 768px)': {
            height: 32,
            fontSize: '0.8125rem',
          },
        },
      },
    },
    // Optimize Dialog for mobile
    MuiDialog: {
      styleOverrides: {
        paper: {
          '@media (max-width: 768px)': {
            margin: 8,
            width: 'calc(100% - 16px)',
            maxHeight: 'calc(100% - 16px)',
          },
        },
      },
    },
    // Optimize AppBar for mobile
    MuiAppBar: {
      styleOverrides: {
        root: {
          '@media (max-width: 768px)': {
            '& .MuiToolbar-root': {
              minHeight: 56,
              paddingLeft: 16,
              paddingRight: 16,
            },
          },
        },
      },
    },
    // Optimize Table for mobile
    MuiTableCell: {
      styleOverrides: {
        root: {
          '@media (max-width: 768px)': {
            padding: '8px 4px',
            fontSize: '0.8125rem',
          },
        },
      },
    },
    // Optimize Card for mobile
    MuiCard: {
      styleOverrides: {
        root: {
          '@media (max-width: 768px)': {
            '& .MuiCardContent-root': {
              padding: 12,
              '&:last-child': {
                paddingBottom: 12,
              },
            },
          },
        },
      },
    },
    // Optimize Menu for mobile
    MuiMenu: {
      styleOverrides: {
        paper: {
          '@media (max-width: 768px)': {
            minWidth: 200,
            '& .MuiMenuItem-root': {
              minHeight: 48,
              fontSize: '0.875rem',
            },
          },
        },
      },
    },
    // Optimize Drawer for mobile
    MuiDrawer: {
      styleOverrides: {
        paper: {
          '@media (max-width: 768px)': {
            '& .MuiListItemButton-root': {
              minHeight: 48,
            },
          },
        },
      },
    },
  },
  typography: {
    // Responsive typography
    h1: {
      fontSize: '2rem',
      '@media (max-width: 768px)': {
        fontSize: '1.75rem',
      },
    },
    h2: {
      fontSize: '1.75rem',
      '@media (max-width: 768px)': {
        fontSize: '1.5rem',
      },
    },
    h3: {
      fontSize: '1.5rem',
      '@media (max-width: 768px)': {
        fontSize: '1.25rem',
      },
    },
    h4: {
      fontSize: '1.25rem',
      '@media (max-width: 768px)': {
        fontSize: '1.125rem',
      },
    },
    h5: {
      fontSize: '1.125rem',
      '@media (max-width: 768px)': {
        fontSize: '1rem',
      },
    },
    h6: {
      fontSize: '1rem',
      '@media (max-width: 768px)': {
        fontSize: '0.875rem',
      },
    },
    body1: {
      '@media (max-width: 768px)': {
        fontSize: '0.875rem',
      },
    },
    body2: {
      '@media (max-width: 768px)': {
        fontSize: '0.8125rem',
      },
    },
  },
  spacing: 8, // Base spacing unit
});

// Mobile-specific utility functions
export const getMobileSpacing = (desktop: number, mobile?: number) => ({
  xs: mobile ?? Math.max(1, Math.floor(desktop / 2)),
  md: desktop,
});

export const getMobileFontSize = (desktop: string, mobile?: string) => ({
  xs: mobile ?? '0.875rem',
  md: desktop,
});

export const getTouchTargetSize = (size: 'small' | 'medium' | 'large' = 'medium') => {
  const sizes = {
    small: { xs: 40, md: 32 },
    medium: { xs: 44, md: 36 },
    large: { xs: 48, md: 40 },
  };
  return sizes[size];
};