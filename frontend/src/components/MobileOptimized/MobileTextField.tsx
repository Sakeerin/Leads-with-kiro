import React from 'react';
import { TextField, TextFieldProps, useMediaQuery, useTheme } from '@mui/material';

interface MobileTextFieldProps extends TextFieldProps {
  preventZoom?: boolean;
}

export const MobileTextField: React.FC<MobileTextFieldProps> = ({
  preventZoom = true,
  InputProps,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <TextField
      InputProps={{
        ...InputProps,
        sx: {
          '& input': {
            fontSize: preventZoom && isMobile ? '16px' : 'inherit',
            padding: isMobile ? '16px 14px' : '8px 12px',
          },
          ...InputProps?.sx,
        },
      }}
      {...props}
    />
  );
};