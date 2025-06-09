// src/ui/funds_management_components/AddFundsForm.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddFundsForm from './AddFundsForm';
import { FinancialContext, FinancialContextType, ApiError } from '../../../contexts/FinancialContext';
import { UserContext, UserContextType } from '../../../contexts/UserContext'; // Assuming UserContextType is exported
import { ReactNode } from 'react';

// Mock UserContext value
const mockUserContextValue: UserContextType = {
  user: {
    id: 'user123',
    name: 'Test Parent',
    token: 'test-token',
    kids: [
      { id: 'kid1', name: 'Kid A', balance: 0 },
      { id: 'kid2', name: 'Kid B', balance: 0 },
    ],
  },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

// Mock FinancialContext value - this will be overridden in specific test suites or tests
let mockAddFunds: vi.Spied<FinancialContextType['addFunds']>;

const getDefaultMockFinancialContextValue = (): FinancialContextType => {
  mockAddFunds = vi.fn().mockResolvedValue({ success: true, transaction: { id: 't1', date: '2024-01-01', description: 'Mock Tx', amount: 100, category: 'Income' } });
  return {
    financialData: {
      currentBalance: 100,
      transactions: [],
    },
    addFunds: mockAddFunds,
    addTransaction: vi.fn(),
    addKidReward: vi.fn(),
  };
};


// Helper component to wrap AddFundsForm with necessary contexts
const TestWrapper = ({ financialContextValue, userContextValue, children }: { financialContextValue?: Partial<FinancialContextType>, userContextValue?: Partial<UserContextType>, children: ReactNode }) => {
  return (
    <UserContext.Provider value={userContextValue as UserContextType || mockUserContextValue}>
      <FinancialContext.Provider value={financialContextValue as FinancialContextType || getDefaultMockFinancialContextValue()}>
        {children}
      </FinancialContext.Provider>
    </UserContext.Provider>
  );
};

describe('AddFundsForm', () => {
  beforeEach(() => {
    // Reset mocks before each test if needed, especially for mockAddFunds
    // This is handled by getDefaultMockFinancialContextValue re-creating mockAddFunds
  });

  it('should render correctly', () => {
    render(
      <TestWrapper>
        <AddFundsForm />
      </TestWrapper>
    );
    expect(screen.getByRole('heading', { name: /add funds/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/for/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add funds/i })).toBeInTheDocument();
  });

  // More tests will be added here in subsequent steps

  it('should allow typing in the amount field', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <AddFundsForm />
      </TestWrapper>
    );
    const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
    await user.type(amountInput, '123.45');
    expect(amountInput.value).toBe('123.45');
  });

  it('should allow changing the source selection', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <AddFundsForm />
      </TestWrapper>
    );
    const sourceSelect = screen.getByLabelText<HTMLSelectElement>(/source/i);
    // Default value is 'bank_account_1' (Bank Account ****1234)
    // Change to 'bank_account_2' (Savings Account ****5678)
    await user.selectOptions(sourceSelect, 'bank_account_2');
    expect(sourceSelect.value).toBe('bank_account_2');
    expect(screen.getByRole<HTMLOptionElement>('option', { name: 'Savings Account ****5678' }).selected).toBe(true);
  });

  it('should allow changing the kid target selection', async () => {
    const user = userEvent.setup();
    // Use default mockUserContextValue which includes kids
    render(
      <TestWrapper>
        <AddFundsForm />
      </TestWrapper>
    );
    const kidSelect = screen.getByLabelText<HTMLSelectElement>(/for/i);
    // Default value is '' (General Family Funds)
    // Change to 'Kid A' (kid1)
    await user.selectOptions(kidSelect, 'kid1');
    expect(kidSelect.value).toBe('kid1');
    expect(screen.getByRole<HTMLOptionElement>('option', { name: 'Kid A' }).selected).toBe(true);
  });

  it('should clear error/success messages when amount input changes', async () => {
    const user = userEvent.setup();
    // First, render with an initial error message
    // We can achieve this by having addFunds fail initially if we were testing submission,
    // but for this specific test, we can just check if the component clears its own error state.
    // The component's onChange for amount input directly sets error to null.

    render(
      <TestWrapper>
        <AddFundsForm />
      </TestWrapper>
    );

    const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
    const submitButton = screen.getByRole('button', { name: /add funds/i });

    // Simulate a submission that causes an error to display
    // For simplicity, trigger the client-side NaN error first
    await user.type(amountInput, 'abc');
    await user.click(submitButton);
    expect(screen.getByText(/Error: Please enter a valid number for the amount./i)).toBeInTheDocument();

    // Now, type a valid number, error should clear
    await user.clear(amountInput);
    await user.type(amountInput, '50');
    expect(screen.queryByText(/Error: Please enter a valid number for the amount./i)).not.toBeInTheDocument();
  });

   it('should clear error/success messages when source selection changes', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <AddFundsForm />
      </TestWrapper>
    );
    const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
    const sourceSelect = screen.getByLabelText<HTMLSelectElement>(/source/i);
    const submitButton = screen.getByRole('button', { name: /add funds/i });

    await user.type(amountInput, 'abc'); // to make submit cause an error
    await user.click(submitButton);
    expect(screen.getByText(/Error: Please enter a valid number for the amount./i)).toBeInTheDocument();

    await user.selectOptions(sourceSelect, 'bank_account_2');
    expect(screen.queryByText(/Error: Please enter a valid number for the amount./i)).not.toBeInTheDocument();
  });

  it('should clear error/success messages when kid target selection changes', async () => {
    const user = userEvent.setup();
     render(
      <TestWrapper>
        <AddFundsForm />
      </TestWrapper>
    );
    const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
    const kidSelect = screen.getByLabelText<HTMLSelectElement>(/for/i);
    const submitButton = screen.getByRole('button', { name: /add funds/i });

    await user.type(amountInput, 'abc'); // to make submit cause an error
    await user.click(submitButton);
    expect(screen.getByText(/Error: Please enter a valid number for the amount./i)).toBeInTheDocument();

    await user.selectOptions(kidSelect, 'kid1');
    expect(screen.queryByText(/Error: Please enter a valid number for the amount./i)).not.toBeInTheDocument();
  });

  describe('Form Submission - Success', () => {
    let mockFinancialContextValue: FinancialContextType;

    beforeEach(() => {
      // Ensure a fresh mock for addFunds before each test in this suite
      mockFinancialContextValue = getDefaultMockFinancialContextValue();
      // mockAddFunds is already spied via getDefaultMockFinancialContextValue
    });

    it('should call addFunds with correct parameters and display success for general funds', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper financialContextValue={mockFinancialContextValue}>
          <AddFundsForm />
        </TestWrapper>
      );

      const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
      const sourceSelect = screen.getByLabelText<HTMLSelectElement>(/source/i);
      // Kid select will default to "General Family Funds" (value: "")
      const submitButton = screen.getByRole('button', { name: /add funds/i });

      await user.type(amountInput, '100.50');
      await user.selectOptions(sourceSelect, 'bank_account_1');
      // No change to kidSelect, so it's for general funds

      // Mock addFunds to resolve successfully for this test
      const mockSuccessResponse = {
        success: true,
        transaction: {
          id: 'txn_success_123',
          date: new Date().toISOString(),
          description: 'Deposit from bank_account_1 to General Family Funds',
          amount: 100.50,
          category: 'Income',
          kidId: undefined, // Or not present
        },
      };
      mockAddFunds.mockResolvedValueOnce(mockSuccessResponse);

      await user.click(submitButton);

      // Check loading state
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/processing.../i)).toBeInTheDocument();

      await waitFor(() => {
        expect(mockAddFunds).toHaveBeenCalledTimes(1);
      });

      expect(mockAddFunds).toHaveBeenCalledWith(
        100.50,                     // amount
        'bank_account_1',           // source
        undefined,                  // kidId (General Family Funds)
        'Deposit from bank_account_1 to General Family Funds' // fullDescription
      );

      await waitFor(() => {
        expect(screen.getByText(/Successfully added \$100.50 for General Family Funds. Transaction ID: txn_success_123/i)).toBeInTheDocument();
      });

      expect(amountInput.value).toBe(''); // Amount field should be cleared
      expect(submitButton).not.toBeDisabled(); // Button should be re-enabled
      expect(screen.queryByText(/processing.../i)).not.toBeInTheDocument(); // Loading text gone
    });

    it('should call addFunds with correct parameters and display success for a specific kid', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper financialContextValue={mockFinancialContextValue} userContextValue={mockUserContextValue}> {/* Ensure kids are in userContext */}
          <AddFundsForm />
        </TestWrapper>
      );

      const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
      const sourceSelect = screen.getByLabelText<HTMLSelectElement>(/source/i);
      const kidSelect = screen.getByLabelText<HTMLSelectElement>(/for/i);
      const submitButton = screen.getByRole('button', { name: /add funds/i });

      await user.type(amountInput, '75.25');
      await user.selectOptions(sourceSelect, 'bank_account_2');
      await user.selectOptions(kidSelect, 'kid1'); // Kid A from mockUserContextValue

      const mockSuccessResponse = {
        success: true,
        transaction: {
          id: 'txn_kid_456',
          date: new Date().toISOString(),
          description: 'Deposit from bank_account_2 to Kid A',
          amount: 75.25,
          category: 'Income',
          kidId: 'kid1',
        },
      };
      mockAddFunds.mockResolvedValueOnce(mockSuccessResponse);

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAddFunds).toHaveBeenCalledTimes(1);
      });

      expect(mockAddFunds).toHaveBeenCalledWith(
        75.25,                      // amount
        'bank_account_2',           // source
        'kid1',                     // kidId
        'Deposit from bank_account_2 to Kid A' // fullDescription
      );

      await waitFor(() => {
        expect(screen.getByText(/Successfully added \$75.25 for Kid A. Transaction ID: txn_kid_456/i)).toBeInTheDocument();
      });

      expect(amountInput.value).toBe('');
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Form Submission - Error Cases', () => {
    let mockFinancialContextValue: FinancialContextType;

    beforeEach(() => {
      mockFinancialContextValue = getDefaultMockFinancialContextValue();
      // mockAddFunds is spied via getDefaultMockFinancialContextValue
    });

    // Test structure for a specific error
    const testSpecificError = async (
      errorCode: string,
      errorMessage: string, // The expected user-friendly message
      setupFormData?: (user: ReturnType<typeof userEvent.setup>) => Promise<void> // Optional function to set up specific form data
    ) => {
      const user = userEvent.setup();
      render(
        <TestWrapper financialContextValue={mockFinancialContextValue}>
          <AddFundsForm />
        </TestWrapper>
      );

      if (setupFormData) {
        await setupFormData(user);
      } else {
        // Default form data if not specified by the error case
        const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
        await user.type(amountInput, '50'); // Default valid amount
      }

      const submitButton = screen.getByRole('button', { name: /add funds/i });

      mockAddFunds.mockResolvedValueOnce({
        success: false,
        error: { code: errorCode, message: `Mock backend message for ${errorCode}` },
      });

      await user.click(submitButton);

      // Check for loading state during submission
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/processing.../i)).toBeInTheDocument();

      await waitFor(() => {
        expect(mockAddFunds).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
      });

      const amountInputAfterError = screen.getByLabelText<HTMLInputElement>(/amount/i);
      if (errorCode !== 'LOCAL_VALIDATION_INVALID_AMOUNT') { // LOCAL_VALIDATION_INVALID_AMOUNT might not clear if input was invalid
          // Check that amount is not cleared for API errors
          if (setupFormData) { // if custom setup was used, value might be different or not set
            // For specific setups, we might need to check if the value persisted if it was set
          } else {
            expect(amountInputAfterError.value).toBe('50');
          }
      }

      expect(submitButton).not.toBeDisabled(); // Button should be re-enabled
      expect(screen.queryByText(/processing.../i)).not.toBeInTheDocument(); // Loading text gone
    };

    it('should display error for INSUFFICIENT_FUNDS', async () => {
      await testSpecificError(
        'INSUFFICIENT_FUNDS',
        'The selected payment source has insufficient funds. Please try another source or a smaller amount.',
        async (user) => {
            const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
            await user.type(amountInput, '1.00'); // Amount that mock API links to INSUFFICIENT_FUNDS
        }
      );
       // Check that amount field (1.00) is not cleared
      const amountInputAfterError = screen.getByLabelText<HTMLInputElement>(/amount/i);
      expect(amountInputAfterError.value).toBe('1.00');
    });

    it('should display error for PAYMENT_METHOD_INVALID', async () => {
      await testSpecificError(
        'PAYMENT_METHOD_INVALID',
        'The selected payment method is invalid or could not be verified. Please check the details or try another method.',
        async (user) => {
            const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
            const sourceSelect = screen.getByLabelText<HTMLSelectElement>(/source/i);
            await user.type(amountInput, '50');
            await user.selectOptions(sourceSelect, 'expired_card'); // Source that mock API links to PAYMENT_METHOD_INVALID
        }
      );
      const amountInputAfterError = screen.getByLabelText<HTMLInputElement>(/amount/i);
      expect(amountInputAfterError.value).toBe('50');
    });

    it('should display error for ACCOUNT_LIMIT_EXCEEDED', async () => {
      await testSpecificError(
        'ACCOUNT_LIMIT_EXCEEDED',
        'The transaction amount exceeds the allowed limit for this payment source or your account.',
        async (user) => {
            const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
            await user.type(amountInput, '12345'); // Amount that mock API links to this error
        }
      );
      const amountInputAfterError = screen.getByLabelText<HTMLInputElement>(/amount/i);
      expect(amountInputAfterError.value).toBe('12345');
    });

    it('should display error for INVALID_KID_ID', async () => {
      await testSpecificError(
        'INVALID_KID_ID',
        'The selected recipient (kid) is not valid. Please refresh and try again.',
        async (user) => {
            const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
            const kidSelect = screen.getByLabelText<HTMLSelectElement>(/for/i);
            await user.type(amountInput, '50');
            await user.selectOptions(kidSelect, 'kid_nonexistent'); // Kid ID that mock API links to this error
        }
      );
      const amountInputAfterError = screen.getByLabelText<HTMLInputElement>(/amount/i);
      expect(amountInputAfterError.value).toBe('50');
    });

    it('should display error for LOCAL_VALIDATION_INVALID_AMOUNT (e.g. zero amount)', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper financialContextValue={mockFinancialContextValue}>
          <AddFundsForm />
        </TestWrapper>
      );
      const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
      await user.type(amountInput, '0'); // Invalid amount

      const submitButton = screen.getByRole('button', { name: /add funds/i });

      // This error is now returned by addFunds itself
      mockAddFunds.mockResolvedValueOnce({
        success: false,
        error: { code: 'LOCAL_VALIDATION_INVALID_AMOUNT', message: 'Amount must be positive' },
      });

      await user.click(submitButton);

      await waitFor(() => {
         expect(screen.getByText(/Error: Please enter a valid positive amount./i)).toBeInTheDocument();
      });
      expect(mockAddFunds).toHaveBeenCalledWith(0, expect.any(String), expect.any(String), expect.any(String)); // or undefined for kidId
      expect(amountInput.value).toBe('0'); // Value should remain for correction
    });

    it('should display a generic error message for an unknown error code', async () => {
      const user = userEvent.setup();
      // mockFinancialContextValue is set up by beforeEach in this describe block
      render(
        <TestWrapper financialContextValue={mockFinancialContextValue}>
          <AddFundsForm />
        </TestWrapper>
      );

      const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
      await user.type(amountInput, '50'); // Valid amount
      const submitButton = screen.getByRole('button', { name: /add funds/i });

      const unknownErrorCode = 'SOME_BIZARRE_UNKNOWN_ERROR';
      const backendMessage = 'A very strange thing happened.';
      mockAddFunds.mockResolvedValueOnce({
        success: false,
        error: { code: unknownErrorCode, message: backendMessage },
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAddFunds).toHaveBeenCalledTimes(1);
      });

      // The getFriendlyErrorMessage function in AddFundsForm should handle unknown codes
      // and use the backend message if available, or a more generic one.
      // Based on current getFriendlyErrorMessage: `An unknown error occurred (Code: ${errorCode}). Please try again.`
      // or it might use the backendMessage if provided as default. Let's check AddFundsForm's logic:
      // default: return defaultMessage || `An unknown error occurred (Code: ${errorCode}). Please try again.`;
      // So it should use backendMessage.
      await waitFor(() => {
        expect(screen.getByText(`Error: ${backendMessage}`)).toBeInTheDocument();
      });

      expect(amountInput.value).toBe('50'); // Amount not cleared
      expect(submitButton).not.toBeDisabled(); // Button re-enabled
    });

    it('should display a network error message when addFunds returns NETWORK_ERROR code', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper financialContextValue={mockFinancialContextValue}>
          <AddFundsForm />
        </TestWrapper>
      );

      const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
      await user.type(amountInput, '50');
      const submitButton = screen.getByRole('button', { name: /add funds/i });

      mockAddFunds.mockResolvedValueOnce({
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'Simulated network failure.' },
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAddFunds).toHaveBeenCalledTimes(1);
      });

      // Expecting the friendly message for NETWORK_ERROR from getFriendlyErrorMessage
      await waitFor(() => {
        expect(screen.getByText('Error: A network error occurred. Please check your connection and try again.')).toBeInTheDocument();
      });

      expect(amountInput.value).toBe('50');
      expect(submitButton).not.toBeDisabled();
    });

    it('should display a generic message if error object is malformed (e.g. no code)', async () => {
        const user = userEvent.setup();
        render(
          <TestWrapper financialContextValue={mockFinancialContextValue}>
            <AddFundsForm />
          </TestWrapper>
        );

        const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
        await user.type(amountInput, '50');
        const submitButton = screen.getByRole('button', { name: /add funds/i });

        // Simulate an error object that's not perfectly formed (e.g. missing code, only message)
        // The component's getFriendlyErrorMessage should handle this by returning a default.
        // FinancialContext is designed to always provide a code, but this tests robustness of AddFundsForm.
        mockAddFunds.mockResolvedValueOnce({
          success: false,
          error: { message: 'Something vaguely went wrong.' } as any, // Type assertion to simulate malformed ApiError
        });

        await user.click(submitButton);

        await waitFor(() => {
          expect(mockAddFunds).toHaveBeenCalledTimes(1);
        });

        // Expecting the default fallback from getFriendlyErrorMessage
        await waitFor(() => {
          expect(screen.getByText('Error: Something vaguely went wrong.')).toBeInTheDocument();
          // Or, if defaultMessage isn't preferred over the "An unexpected error..."
          // The current getFriendlyErrorMessage is: `defaultMessage || 'An unexpected error occurred. Please try again.'`
          // So it *will* use the message from the error object if errorCode is undefined.
        });

        expect(amountInput.value).toBe('50');
        expect(submitButton).not.toBeDisabled();
      });
  });

  describe('Client-Side Input Validation', () => {
    // No need to mock addFunds here as these errors should prevent it from being called.
    // However, FinancialContext still needs to be provided.
    let mockFinancialContextValue: FinancialContextType;

    beforeEach(() => {
      mockFinancialContextValue = getDefaultMockFinancialContextValue();
      // We don't expect addFunds to be called, so we can check mockAddFunds.not.toHaveBeenCalled()
    });

    it('should display an error if amount is not a number and prevent submission', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper financialContextValue={mockFinancialContextValue}> {/* Provide context */}
          <AddFundsForm />
        </TestWrapper>
      );

      const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
      const submitButton = screen.getByRole('button', { name: /add funds/i });

      await user.type(amountInput, 'abc'); // Non-numeric input
      await user.click(submitButton);

      expect(screen.getByText('Error: Please enter a valid number for the amount.')).toBeInTheDocument();
      expect(mockAddFunds).not.toHaveBeenCalled(); // addFunds should not be called
      expect(submitButton).not.toBeDisabled(); // Button should not be in loading state
    });

    it('should display an error if amount is empty (results in NaN) and prevent submission', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper financialContextValue={mockFinancialContextValue}>
          <AddFundsForm />
        </TestWrapper>
      );

      const amountInput = screen.getByLabelText<HTMLInputElement>(/amount/i);
      // Ensure amount is empty (it's empty by default, but user.clear() makes it explicit)
      await user.clear(amountInput);
      const submitButton = screen.getByRole('button', { name: /add funds/i });

      await user.click(submitButton);

      // parseFloat('') is NaN, so this triggers the same "valid number" message.
      expect(screen.getByText('Error: Please enter a valid number for the amount.')).toBeInTheDocument();
      expect(mockAddFunds).not.toHaveBeenCalled();
      expect(submitButton).not.toBeDisabled();
    });

    // Note: The validation for positive amount (e.g., amount > 0) is handled by
    // FinancialContext.addFunds, which returns LOCAL_VALIDATION_INVALID_AMOUNT.
    // Tests for that are already in 'Form Submission - Error Cases' because addFunds *is* called.
    // These client-side tests are for checks *before* addFunds is invoked.
  });
});
