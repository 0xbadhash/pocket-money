// src/contexts/FinancialContext.tsx
import React, { createContext, useState, ReactNode, useContext, useCallback, useMemo } from 'react';

// Define shapes for our financial data
export interface Transaction { // Exporting for potential use in other files
  id: string;
  date: string;
  description: string;
  amount: number; // Positive for income, negative for expenses
  category: string;
  kidId?: string; // Optional kidId field
}

export interface FinancialData { // Exporting for potential use
  currentBalance: number;
  transactions: Transaction[];
}

// Define the shape of the context value
interface FinancialContextType {
  financialData: FinancialData;
  addFunds: (amount: number, description?: string, kidId?: string) => void; // Updated signature
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  addKidReward: (kidId: string, rewardAmount: number, choreTitle: string) => void; // <-- New function in type
}

// Create the context
export const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

// Custom hook for easier context consumption
export const useFinancialContext = () => {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancialContext must be used within a FinancialProvider');
  }
  return context;
};

// Create a FinancialProvider component
interface FinancialProviderProps {
  children: ReactNode;
}

export const FinancialProvider: React.FC<FinancialProviderProps> = ({ children }) => {
  const [financialData, setFinancialData] = useState<FinancialData>({
    currentBalance: 100.00,
    transactions: [
      { id: 't1', date: '2023-10-20', description: 'Initial Balance', amount: 100.00, category: 'Initial Funds' },
      { id: 't2', date: '2023-10-22', description: 'Pocket Money Received', amount: 20.00, category: 'Allowance', kidId: 'kid_a' },
      { id: 't3', date: '2023-10-25', description: 'Book Store', amount: -15.00, category: 'Books', kidId: 'kid_a' },
      { id: 't4', date: '2023-11-01', description: 'Video Game Purchase', amount: -25.00, category: 'Games', kidId: 'kid_b' },
      { id: 't5', date: '2023-11-05', description: 'Birthday Money', amount: 50.00, category: 'Income', kidId: 'kid_b' },
    ],
  });

  const addFunds = useCallback((amount: number, description: string = 'Funds Added', kidId?: string) => {
    if (amount <= 0) {
      console.warn('Add funds amount must be positive.');
      return;
    }
    const newTransaction: Transaction = {
      id: `t${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: description,
      amount: amount,
      category: 'Income',
      kidId: kidId, // Include kidId if provided
    };
    setFinancialData((prevData) => ({
      currentBalance: prevData.currentBalance + amount,
      transactions: [newTransaction, ...prevData.transactions],
    }));
  }, [setFinancialData]);

  const addTransaction = useCallback((transactionDetails: Omit<Transaction, 'id' | 'date'>) => {
    const newTransaction: Transaction = {
      id: `t${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...transactionDetails, // kidId will be included if present in transactionDetails
    };
    setFinancialData((prevData) => ({
      currentBalance: prevData.currentBalance + newTransaction.amount,
      transactions: [newTransaction, ...prevData.transactions],
    }));
  }, [setFinancialData]);

  const addKidReward = useCallback((kidId: string, rewardAmount: number, choreTitle: string) => {
    if (rewardAmount <= 0) {
      console.warn('Kid reward amount must be positive.');
      return;
    }
    const newTransaction: Transaction = {
      id: `t${Date.now()}_reward`, // Make ID slightly more unique for debugging
      date: new Date().toISOString().split('T')[0],
      description: `Reward for: ${choreTitle}`,
      amount: rewardAmount, // Positive amount
      category: 'Chore Reward',
      kidId: kidId,
    };
    setFinancialData((prevData) => ({
      currentBalance: prevData.currentBalance + rewardAmount,
      transactions: [newTransaction, ...prevData.transactions],
    }));
    console.log(`Added reward: $${rewardAmount} for ${kidId} for chore: ${choreTitle}`); // For debugging
  }, [setFinancialData]);

  const contextValue = useMemo(() => ({
    financialData,
    addFunds,
    addTransaction,
    addKidReward
  }), [financialData, addFunds, addTransaction, addKidReward]);
  // Note on useCallback/useMemo: All functions (addFunds, addTransaction, addKidReward)
  // are wrapped in useCallback to stabilize their references. The entire contextValue object
  // is memoized with useMemo. This strategy is crucial for performance optimization,
  // preventing unnecessary re-renders in consumer components.

  return (
    <FinancialContext.Provider value={contextValue}> {/* <-- Add to provider value */}
      {children}
    </FinancialContext.Provider>
  );
};
