import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import LeadForm from '../../components/LeadForm';
import * as leadService from '../../services/leadService';

// Mock the lead service
jest.mock('../../services/leadService');
const mockedLeadService = leadService as jest.Mocked<typeof leadService>;

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('LeadForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render all required form fields', () => {
      render(<LeadForm />, { wrapper: createWrapper() });

      // Company fields
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/industry/i)).toBeInTheDocument();

      // Contact fields
      expect(screen.getByLabelText(/contact name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mobile/i)).toBeInTheDocument();

      // Source fields
      expect(screen.getByLabelText(/source channel/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/campaign/i)).toBeInTheDocument();

      // Action buttons
      expect(screen.getByRole('button', { name: /create lead/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render form in edit mode when lead data is provided', () => {
      const existingLead = {
        id: 'lead-123',
        company: { name: 'Test Company', industry: 'Technology' },
        contact: { name: 'John Doe', email: 'john@test.com', phone: '+1234567890' },
        source: { channel: 'web_form', campaign: 'Test Campaign' }
      };

      render(<LeadForm lead={existingLead} />, { wrapper: createWrapper() });

      expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@test.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update lead/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      render(<LeadForm />, { wrapper: createWrapper() });

      const submitButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/company name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/contact name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<LeadForm />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab(); // Trigger blur event

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('should validate phone number format', async () => {
      render(<LeadForm />, { wrapper: createWrapper() });

      const phoneInput = screen.getByLabelText(/phone/i);
      await user.type(phoneInput, 'invalid-phone');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/invalid phone format/i)).toBeInTheDocument();
      });
    });

    it('should accept valid phone number formats', async () => {
      render(<LeadForm />, { wrapper: createWrapper() });

      const phoneInput = screen.getByLabelText(/phone/i);
      const validPhones = ['+1234567890', '1234567890', '+66-2-123-4567'];

      for (const phone of validPhones) {
        await user.clear(phoneInput);
        await user.type(phoneInput, phone);
        await user.tab();

        await waitFor(() => {
          expect(screen.queryByText(/invalid phone format/i)).not.toBeInTheDocument();
        });
      }
    });

    it('should validate required source channel', async () => {
      render(<LeadForm />, { wrapper: createWrapper() });

      // Fill required fields but leave source channel empty
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@test.com');

      const submitButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/source channel is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    const validFormData = {
      companyName: 'Test Company',
      industry: 'Technology',
      contactName: 'John Doe',
      email: 'john@test.com',
      phone: '+1234567890',
      mobile: '+1987654321',
      sourceChannel: 'web_form',
      campaign: 'Test Campaign'
    };

    it('should submit form with valid data', async () => {
      const mockCreatedLead = {
        id: 'lead-123',
        accountLeadId: 'AL-24-01-001',
        company: { name: 'Test Company', industry: 'Technology' },
        contact: { name: 'John Doe', email: 'john@test.com' }
      };

      mockedLeadService.createLead.mockResolvedValue(mockCreatedLead);

      render(<LeadForm />, { wrapper: createWrapper() });

      // Fill form fields
      await user.type(screen.getByLabelText(/company name/i), validFormData.companyName);
      await user.type(screen.getByLabelText(/contact name/i), validFormData.contactName);
      await user.type(screen.getByLabelText(/email/i), validFormData.email);
      await user.type(screen.getByLabelText(/phone/i), validFormData.phone);

      // Select source channel
      const sourceSelect = screen.getByLabelText(/source channel/i);
      await user.click(sourceSelect);
      await user.click(screen.getByText(/web form/i));

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedLeadService.createLead).toHaveBeenCalledWith({
          company: {
            name: validFormData.companyName,
            industry: undefined
          },
          contact: {
            name: validFormData.contactName,
            email: validFormData.email,
            phone: validFormData.phone,
            mobile: undefined
          },
          source: {
            channel: 'web_form',
            campaign: undefined
          }
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith('/leads/lead-123');
    });

    it('should update existing lead', async () => {
      const existingLead = {
        id: 'lead-123',
        company: { name: 'Old Company', industry: 'Technology' },
        contact: { name: 'John Doe', email: 'john@test.com' },
        source: { channel: 'web_form' }
      };

      const mockUpdatedLead = {
        ...existingLead,
        company: { name: 'Updated Company', industry: 'Technology' }
      };

      mockedLeadService.updateLead.mockResolvedValue(mockUpdatedLead);

      render(<LeadForm lead={existingLead} />, { wrapper: createWrapper() });

      // Update company name
      const companyNameInput = screen.getByDisplayValue('Old Company');
      await user.clear(companyNameInput);
      await user.type(companyNameInput, 'Updated Company');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update lead/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedLeadService.updateLead).toHaveBeenCalledWith('lead-123', {
          company: {
            name: 'Updated Company',
            industry: 'Technology'
          },
          contact: {
            name: 'John Doe',
            email: 'john@test.com',
            phone: undefined,
            mobile: undefined
          },
          source: {
            channel: 'web_form',
            campaign: undefined
          }
        });
      });
    });

    it('should handle submission errors gracefully', async () => {
      mockedLeadService.createLead.mockRejectedValue(new Error('Server error'));

      render(<LeadForm />, { wrapper: createWrapper() });

      // Fill minimum required fields
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@test.com');

      const sourceSelect = screen.getByLabelText(/source channel/i);
      await user.click(sourceSelect);
      await user.click(screen.getByText(/web form/i));

      const submitButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create lead/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button during submission', async () => {
      mockedLeadService.createLead.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({} as any), 1000))
      );

      render(<LeadForm />, { wrapper: createWrapper() });

      // Fill minimum required fields
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@test.com');

      const sourceSelect = screen.getByLabelText(/source channel/i);
      await user.click(sourceSelect);
      await user.click(screen.getByText(/web form/i));

      const submitButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(submitButton);

      // Button should be disabled during submission
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/creating lead/i)).toBeInTheDocument();
    });
  });

  describe('Duplicate Detection', () => {
    it('should check for duplicates on email blur', async () => {
      const mockDuplicates = [
        {
          id: 'existing-lead',
          matchType: 'email',
          confidence: 1.0,
          lead: {
            id: 'existing-lead',
            company: { name: 'Existing Company' },
            contact: { name: 'Jane Doe', email: 'john@test.com' }
          }
        }
      ];

      mockedLeadService.checkDuplicates.mockResolvedValue(mockDuplicates);

      render(<LeadForm />, { wrapper: createWrapper() });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'john@test.com');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(mockedLeadService.checkDuplicates).toHaveBeenCalledWith({
          email: 'john@test.com'
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/potential duplicate found/i)).toBeInTheDocument();
        expect(screen.getByText(/existing company/i)).toBeInTheDocument();
      });
    });

    it('should allow user to proceed despite duplicates', async () => {
      const mockDuplicates = [
        {
          id: 'existing-lead',
          matchType: 'email',
          confidence: 0.8,
          lead: {
            id: 'existing-lead',
            company: { name: 'Similar Company' },
            contact: { name: 'Jane Doe', email: 'similar@test.com' }
          }
        }
      ];

      mockedLeadService.checkDuplicates.mockResolvedValue(mockDuplicates);
      mockedLeadService.createLead.mockResolvedValue({} as any);

      render(<LeadForm />, { wrapper: createWrapper() });

      // Fill form and trigger duplicate check
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/contact name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@test.com');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/potential duplicate found/i)).toBeInTheDocument();
      });

      // Select source and proceed anyway
      const sourceSelect = screen.getByLabelText(/source channel/i);
      await user.click(sourceSelect);
      await user.click(screen.getByText(/web form/i));

      const proceedButton = screen.getByRole('button', { name: /create anyway/i });
      await user.click(proceedButton);

      await waitFor(() => {
        expect(mockedLeadService.createLead).toHaveBeenCalled();
      });
    });
  });

  describe('Form Reset and Cancel', () => {
    it('should reset form when cancel is clicked', async () => {
      render(<LeadForm />, { wrapper: createWrapper() });

      // Fill some fields
      await user.type(screen.getByLabelText(/company name/i), 'Test Company');
      await user.type(screen.getByLabelText(/contact name/i), 'John Doe');

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Form should be reset
      expect(screen.getByLabelText(/company name/i)).toHaveValue('');
      expect(screen.getByLabelText(/contact name/i)).toHaveValue('');
    });

    it('should navigate back when cancel is clicked in edit mode', async () => {
      const existingLead = {
        id: 'lead-123',
        company: { name: 'Test Company' },
        contact: { name: 'John Doe', email: 'john@test.com' },
        source: { channel: 'web_form' }
      };

      render(<LeadForm lead={existingLead} />, { wrapper: createWrapper() });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<LeadForm />, { wrapper: createWrapper() });

      // Check form has proper role
      expect(screen.getByRole('form')).toBeInTheDocument();

      // Check required fields have aria-required
      expect(screen.getByLabelText(/company name/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/contact name/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-required', 'true');
    });

    it('should associate error messages with form fields', async () => {
      render(<LeadForm />, { wrapper: createWrapper() });

      const submitButton = screen.getByRole('button', { name: /create lead/i });
      await user.click(submitButton);

      await waitFor(() => {
        const companyNameInput = screen.getByLabelText(/company name/i);
        const errorMessage = screen.getByText(/company name is required/i);
        
        expect(companyNameInput).toHaveAttribute('aria-describedby');
        expect(errorMessage).toHaveAttribute('id');
      });
    });

    it('should support keyboard navigation', async () => {
      render(<LeadForm />, { wrapper: createWrapper() });

      const companyNameInput = screen.getByLabelText(/company name/i);
      companyNameInput.focus();

      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText(/industry/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/contact name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/email/i)).toHaveFocus();
    });
  });
});