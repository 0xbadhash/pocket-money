// src/contexts/FinancialContext.tsx
import React, { createContext, useState, ReactNode, useContext } from 'react';

// Define shapes for our financial data
interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number; // Positive for income, negative for expenses
  category: string;
}

interface FinancialData {
  currentBalance: number;
  transactions: Transaction[];
}

// Define the shape of the context value
interface FinancialContextType {
  financialData: FinancialData;
  addFunds: (amount: number, description?: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void; // Allow adding transaction without pre-set id/date
}

// Create the context
export const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

// Custom hook for easier context consumption (optional but good practice)
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
    currentBalance: 100.00, // Initial mock balance
    transactions: [
      { id: 't1', date: '2023-10-20', description: 'Initial Balance', amount: 100.00, category: 'Initial Funds' },
      { id: 't2', date: '2023-10-22', description: 'Pocket Money Received', amount: 20.00, category: 'Allowance' },
      { id: 't3', date: '2023-10-25', description: 'Book Store', amount: -15.00, category: 'Books' },
    ],
  });

  const addFunds = (amount: number, description: string = 'Funds Added') => {
    if (amount <= 0) {
      console.warn('Add funds amount must be positive.');
      return;
    }
    const newTransaction: Transaction = {
      id: `t${Date.now()}`, // Simple unique ID
      date: new Date().toISOString().split('T')[0], // Today's date
      description: description,
      amount: amount,
      category: 'Income', // Or a more specific category if provided
    };
    setFinancialData((prevData) => ({
      currentBalance: prevData.currentBalance + amount,
      transactions: [newTransaction, ...prevData.transactions], // Add to top
    }));
  };

  const addTransaction = (transactionDetails: Omit<Transaction, 'id' | 'date'>) => {
    const newTransaction: Transaction = {
      id: `t${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...transactionDetails,
    };
    setFinancialData((prevData) => ({
      // Adjust balance only if it's not an income/expense that should also call addFunds or similar
      // For simplicity here, we assume addTransaction is for general logging,
      // and balance impacting transactions (like adding funds) are handled by specific functions.
      // Or, more robustly:
      currentBalance: prevData.currentBalance + newTransaction.amount,
      transactions: [newTransaction, ...prevData.transactions],
    }));
  };


  return (
    <FinancialContext.Provider value={{ financialData, addFunds, addTransaction }}>
      {children}
    </FinancialContext.Provider>
  );
};
