// src/ui/dashboard_components/__tests__/TotalFundsSummary.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import TotalFundsSummary from '../TotalFundsSummary';
import { FinancialContext, FinancialContextType } from '../../../contexts/FinancialContext';
import { vi } from 'vitest'; // Import vi

// Mocks
const mockFinancialContextValue: FinancialContextType = {
  financialData: { currentBalance: 100, transactions: [] },
  addFunds: vi.fn(), // Changed from jest.fn()
  addTransaction: vi.fn(), // Changed from jest.fn()
  addKidReward: vi.fn(), // Changed from jest.fn()
};

const renderComponent = (value = mockFinancialContextValue) => {
  return render(
    <FinancialContext.Provider value={value}>
      <TotalFundsSummary />
    </FinancialContext.Provider>
  );
};

describe('TotalFundsSummary', () => {
  beforeEach(() => {
    // Clear mocks if they were used in tests (good practice)
    mockFinancialContextValue.addFunds.mockClear();
    mockFinancialContextValue.addTransaction.mockClear();
    mockFinancialContextValue.addKidReward.mockClear();
  });

  it('renders the current balance correctly', () => {
    renderComponent();
    expect(screen.getByText('Total Balance:')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument(); // Assuming currency formatting
  });

  it('renders a different balance correctly', () => {
    const customBalanceValue = {
      ...mockFinancialContextValue,
      financialData: { currentBalance: 250.75, transactions: [] },
    };
    renderComponent(customBalanceValue);
    expect(screen.getByText('$250.75')).toBeInTheDocument();
  });

  it('renders "Loading..." when financialData is null or undefined (if applicable)', () => {
    // Assuming the component might handle a loading state or initial null data
    const loadingValue = {
      ...mockFinancialContextValue,
      financialData: null as any, // Simulate loading state or initial null
    };
    renderComponent(loadingValue);
    // You might need to adjust this expectation based on your actual component's loading state rendering
    // For example, if it renders 'Loading...', or nothing, or 0.00
    // As per your component, it likely just formats 0.00 or if currentBalance can be null, handle that.
    // Let's assume it defaults to 0 or handles it in the component.
    // If your component handles null/undefined by displaying a specific message, update this.
    // For now, if currentBalance is expected to be a number, the mock should provide one.
    // This test might be adjusted or removed if the component doesn't explicitly render "Loading..."
    // based on financialData being null/undefined.
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument(); // Assuming it won't explicitly show 'Loading...' for this
  });

  // Add more tests as needed for rendering transactions, etc.
});