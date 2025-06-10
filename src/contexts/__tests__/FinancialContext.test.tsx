// src/contexts/__tests__/FinancialContext.test.tsx
import React from 'react';
import { render, act } from '@testing-library/react';
import { FinancialProvider, useFinancialContext, FinancialContextType, Transaction } from '../FinancialContext';

// Test component to access context values
let capturedContextState: FinancialContextType | null = null;
const TestConsumerComponent = () => {
  capturedContextState = useFinancialContext();
  return null;
};

// Helper to render with provider
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <FinancialProvider>
      {ui}
      <TestConsumerComponent />
    </FinancialProvider>
  );
};

describe('FinancialContext', () => {
  beforeEach(() => {
    capturedContextState = null;
    // Reset any mocks if FinancialContext had dependencies, but it doesn't.
    // Spy on console.warn for tests that expect it
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.warn
    (console.warn as jest.Mock).mockRestore();
  });

  it('initializes with a default balance and some initial transactions', () => {
    renderWithProviders(<div />);
    expect(capturedContextState).not.toBeNull();
    // Assuming FinancialProvider initializes with a default state like in the current code
    expect(capturedContextState?.financialData.currentBalance).toBe(100.00);
    expect(capturedContextState?.financialData.transactions.length).toBe(5);
  });

  describe('addFunds', () => {
    it('should increase currentBalance and add an income transaction', () => {
      renderWithProviders(<div />);
      const initialBalance = capturedContextState?.financialData.currentBalance || 0;
      const initialTransactionsCount = capturedContextState?.financialData.transactions.length || 0;
      const amountToAdd = 50;

      act(() => {
        capturedContextState?.addFunds(amountToAdd, 'Test Deposit');
      });

      expect(capturedContextState?.financialData.currentBalance).toBe(initialBalance + amountToAdd);
      expect(capturedContextState?.financialData.transactions.length).toBe(initialTransactionsCount + 1);
      const newTransaction = capturedContextState?.financialData.transactions[0]; // Assumes it's added to the beginning
      expect(newTransaction?.amount).toBe(amountToAdd);
      expect(newTransaction?.description).toBe('Test Deposit');
      expect(newTransaction?.category).toBe('Income');
      expect(newTransaction?.kidId).toBeUndefined();
    });

    it('should allow adding funds for a specific kidId', () => {
      renderWithProviders(<div />);
      const amountToAdd = 25;
      const kidId = 'kid_test_funds';

      act(() => {
        capturedContextState?.addFunds(amountToAdd, 'Pocket Money for Kid', kidId);
      });

      const newTransaction = capturedContextState?.financialData.transactions[0];
      expect(newTransaction?.kidId).toBe(kidId);
      expect(newTransaction?.description).toBe('Pocket Money for Kid');
    });

    it('should use default description if none provided', () => {
      renderWithProviders(<div />);
      act(() => {
        capturedContextState?.addFunds(10);
      });
      const newTransaction = capturedContextState?.financialData.transactions[0];
      expect(newTransaction?.description).toBe('Funds Added');
    });

    it('should log a warning and not add funds if amount is zero or negative', () => {
      renderWithProviders(<div />);
      const initialBalance = capturedContextState?.financialData.currentBalance;
      const initialTransactionsCount = capturedContextState?.financialData.transactions.length;

      act(() => {
        capturedContextState?.addFunds(0);
      });
      expect(console.warn).toHaveBeenCalledWith('Add funds amount must be positive.');
      expect(capturedContextState?.financialData.currentBalance).toBe(initialBalance);
      expect(capturedContextState?.financialData.transactions.length).toBe(initialTransactionsCount);

      act(() => {
        capturedContextState?.addFunds(-10);
      });
      expect(console.warn).toHaveBeenCalledWith('Add funds amount must be positive.');
      expect(capturedContextState?.financialData.currentBalance).toBe(initialBalance);
      expect(capturedContextState?.financialData.transactions.length).toBe(initialTransactionsCount);
    });
  });

  // More test suites for addTransaction and addKidReward will be added here

  describe('addTransaction', () => {
    it('should update balance and add transaction for income', () => {
      renderWithProviders(<div />);
      const initialBalance = capturedContextState?.financialData.currentBalance || 0;
      const initialTransactionsCount = capturedContextState?.financialData.transactions.length || 0;

      const incomeTransaction: Omit<Transaction, 'id' | 'date'> = {
        description: 'Freelance Payment',
        amount: 200,
        category: 'Income',
      };

      act(() => {
        capturedContextState?.addTransaction(incomeTransaction);
      });

      expect(capturedContextState?.financialData.currentBalance).toBe(initialBalance + 200);
      expect(capturedContextState?.financialData.transactions.length).toBe(initialTransactionsCount + 1);
      const newTransaction = capturedContextState?.financialData.transactions[0];
      expect(newTransaction?.description).toBe('Freelance Payment');
      expect(newTransaction?.amount).toBe(200);
    });

    it('should update balance and add transaction for expense', () => {
      renderWithProviders(<div />);
      const initialBalance = capturedContextState?.financialData.currentBalance || 0;
      const initialTransactionsCount = capturedContextState?.financialData.transactions.length || 0;

      const expenseTransaction: Omit<Transaction, 'id' | 'date'> = {
        description: 'Groceries',
        amount: -75,
        category: 'Food',
        kidId: 'kid_expense_test'
      };

      act(() => {
        capturedContextState?.addTransaction(expenseTransaction);
      });

      expect(capturedContextState?.financialData.currentBalance).toBe(initialBalance - 75);
      expect(capturedContextState?.financialData.transactions.length).toBe(initialTransactionsCount + 1);
      const newTransaction = capturedContextState?.financialData.transactions[0];
      expect(newTransaction?.description).toBe('Groceries');
      expect(newTransaction?.amount).toBe(-75);
      expect(newTransaction?.kidId).toBe('kid_expense_test');
    });
  });

  describe('addKidReward', () => {
    const kidId = 'kid_reward_test';
    const rewardAmount = 10;
    const choreTitle = 'Cleaned Room';

    it('should increase currentBalance and add a "Chore Reward" transaction', () => {
      renderWithProviders(<div />);
      const initialBalance = capturedContextState?.financialData.currentBalance || 0;
      const initialTransactionsCount = capturedContextState?.financialData.transactions.length || 0;

      act(() => {
        capturedContextState?.addKidReward(kidId, rewardAmount, choreTitle);
      });

      expect(capturedContextState?.financialData.currentBalance).toBe(initialBalance + rewardAmount);
      expect(capturedContextState?.financialData.transactions.length).toBe(initialTransactionsCount + 1);
      const newTransaction = capturedContextState?.financialData.transactions[0];
      expect(newTransaction?.amount).toBe(rewardAmount);
      expect(newTransaction?.description).toBe(`Reward for: ${choreTitle}`);
      expect(newTransaction?.category).toBe('Chore Reward');
      expect(newTransaction?.kidId).toBe(kidId);
    });

    it('should log a warning and not add reward if amount is zero or negative', () => {
      renderWithProviders(<div />);
      const initialBalance = capturedContextState?.financialData.currentBalance;
      const initialTransactionsCount = capturedContextState?.financialData.transactions.length;

      act(() => {
        capturedContextState?.addKidReward(kidId, 0, choreTitle);
      });
      expect(console.warn).toHaveBeenCalledWith('Kid reward amount must be positive.');
      expect(capturedContextState?.financialData.currentBalance).toBe(initialBalance);
      expect(capturedContextState?.financialData.transactions.length).toBe(initialTransactionsCount);

      act(() => {
        capturedContextState?.addKidReward(kidId, -5, choreTitle);
      });
      expect(console.warn).toHaveBeenCalledWith('Kid reward amount must be positive.');
      expect(capturedContextState?.financialData.currentBalance).toBe(initialBalance);
      expect(capturedContextState?.financialData.transactions.length).toBe(initialTransactionsCount);
    });
  });
});
