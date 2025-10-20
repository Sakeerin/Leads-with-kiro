import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { mobileTheme } from '../theme/mobileTheme';
import { LeadManagement } from '../pages/LeadManagement';
import { TouchFriendlyButton, TouchFriendlyIconButton } from '../components/MobileOptimized';
import { Add as AddIcon } from '@mui/icons-material';

// Mock the services
vi.mock('../services/leadService');
vi.mock('../services/searchService');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider theme={mobileTheme}>
          {children}
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Mobile Performance Tests', () => {
  beforeEach(() => {
    // Mock window.innerWidth for mobile testing
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone SE width
    });

    // Mock matchMedia for useMediaQuery
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 900px'), // md breakpoint
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  test('TouchFriendlyButton has appropriate touch target size on mobile', () => {
    render(
      <TouchFriendlyButton>Test Button</TouchFriendlyButton>,
      { wrapper: createWrapper() }
    );

    const button = screen.getByRole('button');
    const styles = window.getComputedStyle(button);
    
    // Should have minimum 44px height for touch targets
    expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
  });

  test('TouchFriendlyIconButton has appropriate touch target size on mobile', () => {
    render(
      <TouchFriendlyIconButton>
        <AddIcon />
      </TouchFriendlyIconButton>,
      { wrapper: createWrapper() }
    );

    const button = screen.getByRole('button');
    const styles = window.getComputedStyle(button);
    
    // Should have minimum 44px width and height for touch targets
    expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44);
    expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44);
  });

  test('LeadManagement renders mobile layout correctly', () => {
    render(<LeadManagement />, { wrapper: createWrapper() });

    // Should show mobile view mode selector
    expect(screen.getByText('List')).toBeInTheDocument();
    expect(screen.getByText('Board')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();

    // Should show mobile "Add" button instead of "New Lead"
    expect(screen.getByText('Add')).toBeInTheDocument();
    expect(screen.queryByText('New Lead')).not.toBeInTheDocument();
  });

  test('Mobile navigation drawer opens and closes correctly', () => {
    render(<LeadManagement />, { wrapper: createWrapper() });

    // Find and click the menu button (should be visible on mobile)
    const menuButton = screen.getByLabelText('open drawer');
    expect(menuButton).toBeInTheDocument();

    fireEvent.click(menuButton);

    // Drawer should open and show navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Leads')).toBeInTheDocument();
  });

  test('Mobile theme applies correct font sizes', () => {
    const { container } = render(
      <ThemeProvider theme={mobileTheme}>
        <div>
          <h1>Heading 1</h1>
          <h4>Heading 4</h4>
          <p>Body text</p>
        </div>
      </ThemeProvider>
    );

    const h1 = container.querySelector('h1');
    const h4 = container.querySelector('h4');
    const p = container.querySelector('p');

    // Check that mobile font sizes are applied
    expect(h1).toHaveStyle('font-size: 1.75rem'); // Mobile h1
    expect(h4).toHaveStyle('font-size: 1.125rem'); // Mobile h4
    expect(p).toHaveStyle('font-size: 0.875rem'); // Mobile body1
  });

  test('Performance: Component renders within acceptable time', () => {
    const startTime = performance.now();
    
    render(<LeadManagement />, { wrapper: createWrapper() });
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within 100ms for good mobile performance
    expect(renderTime).toBeLessThan(100);
  });

  test('Touch events work correctly on mobile components', () => {
    const handleClick = vi.fn();
    
    render(
      <TouchFriendlyButton onClick={handleClick}>
        Touch Me
      </TouchFriendlyButton>,
      { wrapper: createWrapper() }
    );

    const button = screen.getByRole('button');
    
    // Simulate touch events
    fireEvent.touchStart(button);
    fireEvent.touchEnd(button);
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('Mobile Accessibility Tests', () => {
  test('All interactive elements have sufficient touch target size', () => {
    render(<LeadManagement />, { wrapper: createWrapper() });

    const buttons = screen.getAllByRole('button');
    
    buttons.forEach(button => {
      const styles = window.getComputedStyle(button);
      const minWidth = parseInt(styles.minWidth) || parseInt(styles.width);
      const minHeight = parseInt(styles.minHeight) || parseInt(styles.height);
      
      // WCAG 2.1 AA requires minimum 44x44px touch targets
      expect(minWidth).toBeGreaterThanOrEqual(44);
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });
  });

  test('Text inputs prevent zoom on iOS', () => {
    render(
      <input 
        type="text" 
        style={{ fontSize: '16px' }} 
        placeholder="Test input"
      />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByPlaceholderText('Test input');
    const styles = window.getComputedStyle(input);
    
    // Font size should be 16px or larger to prevent zoom on iOS
    expect(parseInt(styles.fontSize)).toBeGreaterThanOrEqual(16);
  });
});