import React, { useMemo, useState, useCallback } from 'react';
import { Box, List, ListItem, useMediaQuery, useTheme } from '@mui/material';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  mobileOptimized?: boolean;
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight = 80,
  containerHeight = 400,
  overscan = 5,
  mobileOptimized = true,
}: VirtualizedListProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [scrollTop, setScrollTop] = useState(0);

  // Only virtualize on mobile for performance, or when explicitly enabled
  const shouldVirtualize = (isMobile && mobileOptimized) || items.length > 100;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const visibleRange = useMemo(() => {
    if (!shouldVirtualize) {
      return { start: 0, end: items.length };
    }

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length, shouldVirtualize]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange]);

  if (!shouldVirtualize) {
    // Render all items without virtualization
    return (
      <List sx={{ maxHeight: containerHeight, overflow: 'auto' }}>
        {items.map((item, index) => (
          <ListItem key={index} sx={{ p: 0 }}>
            {renderItem(item, index)}
          </ListItem>
        ))}
      </List>
    );
  }

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return (
    <Box
      sx={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      <Box sx={{ height: totalHeight, position: 'relative' }}>
        <Box
          sx={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <Box
              key={visibleRange.start + index}
              sx={{
                height: itemHeight,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {renderItem(item, visibleRange.start + index)}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}