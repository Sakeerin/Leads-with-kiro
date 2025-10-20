import React from 'react';
import { Button, ButtonProps, IconButton, IconButtonProps, useMediaQuery, useTheme } from '@mui/material';

interface TouchFriendlyButtonProps extends Omit<ButtonProps, 'size'> {
  mobileSize?: 'small' | 'medium' | 'large';
  desktopSize?: 'small' | 'medium' | 'large';
}

export const TouchFriendlyButton: React.FC<TouchFriendlyButtonProps> = ({
  mobileSize = 'medium',
  desktopSize = 'medium',
  sx,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Button
      size={isMobile ? mobileSize : desktopSize}
      sx={{
        minHeight: { xs: 44, md: 36 },
        minWidth: { xs: 44, md: 'auto' },
        ...sx,
      }}
      {...props}
    />
  );
};

interface TouchFriendlyIconButtonProps extends Omit<IconButtonProps, 'size'> {
  mobileSize?: 'small' | 'medium' | 'large';
  desktopSize?: 'small' | 'medium' | 'large';
}

export const TouchFriendlyIconButton: React.FC<TouchFriendlyIconButtonProps> = ({
  mobileSize = 'medium',
  desktopSize = 'small',
  sx,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <IconButton
      size={isMobile ? mobileSize : desktopSize}
      sx={{
        minWidth: { xs: 44, md: 'auto' },
        minHeight: { xs: 44, md: 'auto' },
        ...sx,
      }}
      {...props}
    />
  );
};