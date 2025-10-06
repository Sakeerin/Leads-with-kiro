import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import App from './App';
import theme from './theme';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('App', () => {
  it('renders lead management system title', () => {
    renderWithProviders(<App />);
    
    expect(screen.getByText('Lead Management System')).toBeInTheDocument();
  });

  it('renders welcome message', () => {
    renderWithProviders(<App />);
    
    expect(screen.getByText(/Welcome to the Lead Management System/)).toBeInTheDocument();
  });

  it('renders dashboard section', () => {
    renderWithProviders(<App />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});