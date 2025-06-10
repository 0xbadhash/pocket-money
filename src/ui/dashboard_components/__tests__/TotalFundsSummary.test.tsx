// src/ui/dashboard_components/__tests__/TotalFundsSummary.test.tsx
import React from 'react'; // Restore React import
import { render, screen } from '@testing-library/react';
import TotalFundsSummary from '../TotalFundsSummary';
import { FinancialContext, FinancialData } from '../../../contexts/FinancialContext'; // Adjust path as needed

// Mock FinancialContext
const mockFinancialData: FinancialData = {
  currentBalance: 1234.56,
  transactions: [],
};

const mockAddFunds = jest.fn();
const mockAddTransaction = jest.fn();
const mockAddKidReward = jest.fn();

const renderWithMockContext = (ui: React.ReactElement) => { // Restore React.ReactElement
  return render(
    <FinancialContext.Provider value={{
      financialData: mockFinancialData,
      addFunds: mockAddFunds,
      addTransaction: mockAddTransaction,
      addKidReward: mockAddKidReward,
    }}>
      {ui}
    </FinancialContext.Provider>
  );
};

describe('TotalFundsSummary', () => {
  it('renders the component and displays the current balance correctly', () => {
    renderWithMockContext(<TotalFundsSummary />);

    expect(screen.getByText('Total Funds')).toBeInTheDocument();
    expect(screen.getByText('Available: $1234.56')).toBeInTheDocument();
  });

  it('displays balance with two decimal places even for whole numbers', () => {
    const financialDataWithWholeBalance: FinancialData = {
      currentBalance: 1500,
      transactions: [],
    };
    render(
      <FinancialContext.Provider value={{
        financialData: financialDataWithWholeBalance,
        addFunds: mockAddFunds,
        addTransaction: mockAddTransaction,
        addKidReward: mockAddKidReward,
      }}>
        <TotalFundsSummary />
      </FinancialContext.Provider>
    );
    expect(screen.getByText('Available: $1500.00')).toBeInTheDocument();
  });
});
