// src/contexts/__tests__/FinancialContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { FinancialContext, useFinancialContext } from '../FinancialContext';
import { vi } from 'vitest'; // Import vi

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('FinancialContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Spy on console.warn for tests that expect it
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.warn
    (console.warn as ReturnType<typeof vi.fn>).mockRestore();
  });

  const renderFinancialContextHook = (initialData?: any) => {
    localStorageMock.setItem('financialData', JSON.stringify(initialData));
    return renderHook(() => useFinancialContext(), {
      wrapper: ({ children }) => (
        <FinancialContext.Provider value={{} as any}> {/* Provide a dummy value, the hook will provide the real one */}
          {children}
        </FinancialContext.Provider>
      ),
    });
  };

  it('initializes with a default balance and some initial transactions', () => {
    const { result } = renderFinancialContextHook();
    expect(result.current.financialData.currentBalance).toBe(0);
    expect(result.current.financialData.transactions).toEqual([]);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('financialData');
  });

  it('loads financial data from localStorage if available', () => {
    const storedData = {
      currentBalance: 500,
      transactions: [{ id: 'tx1', type: 'income', amount: 500, description: 'Initial Funds', date: '2024-01-01' }],
    };
    const { result } = renderFinancialContextHook(storedData);
    expect(result.current.financialData).toEqual(storedData);
  });

  describe('addFunds', () => {
    it('should increase currentBalance and add an income transaction', () => {
      const { result } = renderFinancialContextHook();
      act(() => {
        result.current.addFunds(100, 'Allowance');
      });
      expect(result.current.financialData.currentBalance).toBe(100);
      expect(result.current.financialData.transactions.length).toBe(1);
      expect(result.current.financialData.transactions[0].amount).toBe(100);
      expect(result.current.financialData.transactions[0].description).toBe('Allowance');
      expect(result.current.financialData.transactions[0].type).toBe('income');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('financialData', expect.any(String));
    });

    it('should allow adding funds for a specific kidId', () => {
      const { result } = renderFinancialContextHook();
      act(() => {
        result.current.addFunds(50, 'Gift from Grandma', 'kid1');
      });
      expect(result.current.financialData.transactions[0].kidId).toBe('kid1');
    });

    it('should use default description if none provided', () => {
      const { result } = renderFinancialContextHook();
      act(() => {
        result.current.addFunds(20);
      });
      expect(result.current.financialData.transactions[0].description).toBe('Funds Added');
    });

    it('should log a warning and not add funds if amount is zero or negative', () => {
      const { result } = renderFinancialContextHook();
      const initialBalance = result.current.financialData.currentBalance;
      const initialTransactions = result.current.financialData.transactions.length;

      act(() => {
        result.current.addFunds(0, 'Zero Amount');
      });
      expect(result.current.financialData.currentBalance).toBe(initialBalance);
      expect(result.current.financialData.transactions.length).toBe(initialTransactions);
      expect(console.warn).toHaveBeenCalledWith('Attempted to add zero or negative funds.');

      act(() => {
        result.current.addFunds(-10, 'Negative Amount');
      });
      expect(result.current.financialData.currentBalance).toBe(initialBalance);
      expect(result.current.financialData.transactions.length).toBe(initialTransactions);
      expect(console.warn).toHaveBeenCalledWith('Attempted to add zero or negative funds.');
    });
  });

  describe('addTransaction', () => {
    it('should update balance and add transaction for income', () => {
      const { result } = renderFinancialContextHook();
      act(() => {
        result.current.addTransaction('income', 75, 'Refund');
      });
      expect(result.current.financialData.currentBalance).toBe(75);
      expect(result.current.financialData.transactions[0].type).toBe('income');
      expect(result.current.financialData.transactions[0].amount).toBe(75);
      expect(result.current.financialData.transactions[0].description).toBe('Refund');
    });

    it('should update balance and add transaction for expense', () => {
      const { result } = renderFinancialContextHook({ currentBalance: 100, transactions: [] });
      act(() => {
        result.current.addTransaction('expense', 25, 'Candy');
      });
      expect(result.current.financialData.currentBalance).toBe(75);
      expect(result.current.financialData.transactions[0].type).toBe('expense');
      expect(result.current.financialData.transactions[0].amount).toBe(25);
      expect(result.current.financialData.transactions[0].description).toBe('Candy');
    });

    it('should log a warning and not add transaction if amount is zero or negative', () => {
      const { result } = renderFinancialContextHook({ currentBalance: 100, transactions: [] });
      const initialBalance = result.current.financialData.currentBalance;
      const initialTransactions = result.current.financialData.transactions.length;

      act(() => {
        result.current.addTransaction('income', 0, 'Zero');
      });
      expect(result.current.financialData.currentBalance).toBe(initialBalance);
      expect(result.current.financialData.transactions.length).toBe(initialTransactions);
      expect(console.warn).toHaveBeenCalledWith('Attempted to add zero or negative transaction amount.');

      act(() => {
        result.current.addTransaction('expense', -5, 'Negative');
      });
      expect(result.current.financialData.currentBalance).toBe(initialBalance);
      expect(result.current.financialData.transactions.length).toBe(initialTransactions);
      expect(console.warn).toHaveBeenCalledWith('Attempted to add zero or negative transaction amount.');
    });
  });

  describe('addKidReward', () => {
    it('should increase currentBalance and add a "Chore Reward" transaction', () => {
      const { result } = renderFinancialContextHook();
      act(() => {
        result.current.addKidReward('kid1', 10, 'Clean Room');
      });
      expect(result.current.financialData.currentBalance).toBe(10);
      expect(result.current.financialData.transactions[0].type).toBe('income');
      expect(result.current.financialData.transactions[0].amount).toBe(10);
      expect(result.current.financialData.transactions[0].description).toBe('Chore Reward: Clean Room');
      expect(result.current.financialData.transactions[0].kidId).toBe('kid1');
    });

    it('should log a warning and not add reward if amount is zero or negative', () => {
      const { result } = renderFinancialContextHook();
      const initialBalance = result.current.financialData.currentBalance;
      const initialTransactions = result.current.financialData.transactions.length;

      act(() => {
        result.current.addKidReward('kid1', 0, 'Zero Reward');
      });
      expect(result.current.financialData.currentBalance).toBe(initialBalance);
      expect(result.current.financialData.transactions.length).toBe(initialTransactions);
      expect(console.warn).toHaveBeenCalledWith('Attempted to add zero or negative kid reward.');

      act(() => {
        result.current.addKidReward('kid1', -5, 'Negative Reward');
      });
      expect(result.current.financialData.currentBalance).toBe(initialBalance);
      expect(result.current.financialData.transactions.length).toBe(initialTransactions);
      expect(console.warn).toHaveBeenCalledWith('Attempted to add zero or negative kid reward.');
    });
  });
});