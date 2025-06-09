// src/contexts/FinancialContext.tsx
import React, { createContext, useState, ReactNode, useContext } from 'react';
import { UserContext } from './UserContext'; // Ensure this path is correct.

// Define shapes for our financial data
export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  kidId?: string;
}

export interface FinancialData {
  currentBalance: number;
  transactions: Transaction[];
}

// Define the shape of the context value
interface FinancialContextType {
  financialData: FinancialData;
  addFunds: (amount: number, source: string, kidId?: string, fullDescription?: string) => Promise<{ success: boolean; error?: string; transaction?: Transaction }>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  addKidReward: (kidId: string, rewardAmount: number, choreTitle: string) => void;
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
  const userContext = useContext(UserContext);
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

  const addFunds = async (amount: number, source: string, kidId?: string, fullDescription?: string): Promise<{ success: boolean; error?: string; transaction?: Transaction }> => {
    if (amount <= 0) {
      console.warn('Add funds amount must be positive.');
      return { success: false, error: 'Amount must be positive' };
    }

    const authToken = userContext?.user?.token || 'mockAuthToken123';

    try {
      const response = await fetch('/api/funds/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount,
          source,
          kidId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to add funds. Server returned an error.' }));
        console.error('Failed to add funds API error:', response.status, errorData);
        return { success: false, error: errorData.message || `Failed to add funds. Status: ${response.status}` };
      }

      const result = await response.json();

      if (result.success && result.transaction) {
        const newTransaction: Transaction = {
          id: result.transaction.id,
          date: result.transaction.date ? new Date(result.transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          description: fullDescription || result.transaction.description || 'Funds added', // Ensure description is always a string
          amount: result.transaction.amount,
          category: result.transaction.category || 'Income',
          kidId: result.transaction.kidId,
        };

        setFinancialData((prevData) => ({
          currentBalance: result.newBalance !== undefined ? result.newBalance : prevData.currentBalance + newTransaction.amount,
          transactions: [newTransaction, ...prevData.transactions],
        }));
        return { success: true, transaction: newTransaction };
      } else {
        console.error('Add funds API call did not return a successful transaction object:', result);
        return { success: false, error: result.message || 'Invalid response data from server.' };
      }
    } catch (error) {
      console.error('Error calling addFunds API:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error or server is unreachable.';
      return { success: false, error: errorMessage };
    }
  };

  const addTransaction = (transactionDetails: Omit<Transaction, 'id' | 'date'>) => {
    const newTransaction: Transaction = {
      id: `t${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...transactionDetails,
    };
    setFinancialData((prevData) => ({
      currentBalance: prevData.currentBalance + newTransaction.amount,
      transactions: [newTransaction, ...prevData.transactions],
    }));
  };

  const addKidReward = (kidId: string, rewardAmount: number, choreTitle: string) => {
    if (rewardAmount <= 0) {
      console.warn('Kid reward amount must be positive.');
      return;
    }
    const newTransaction: Transaction = {
      id: `t${Date.now()}_reward`,
      date: new Date().toISOString().split('T')[0],
      description: `Reward for: ${choreTitle}`,
      amount: rewardAmount,
      category: 'Chore Reward',
      kidId: kidId,
    };
    setFinancialData((prevData) => ({
      currentBalance: prevData.currentBalance + rewardAmount,
      transactions: [newTransaction, ...prevData.transactions],
    }));
    console.log(`Added reward: $${rewardAmount} for ${kidId} for chore: ${choreTitle}`);
  };

  return (
    <FinancialContext.Provider value={{ financialData, addFunds, addTransaction, addKidReward }}>
      {children}
    </FinancialContext.Provider>
  );
};
