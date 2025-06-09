// src/contexts/FinancialContext.tsx
import React, { createContext, useState, ReactNode, useContext } from 'react';
import { UserContext } from './UserContext';

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

// Define the structured error type
export interface ApiError {
  code: string;
  message: string; // This would be the backend's raw message or a dev-friendly one
}

// Define the shape of the context value
interface FinancialContextType {
  financialData: FinancialData;
  addFunds: (amount: number, source: string, kidId?: string, fullDescription?: string) => Promise<{ success: boolean; error?: ApiError; transaction?: Transaction }>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  addKidReward: (kidId: string, rewardAmount: number, choreTitle: string) => void;
}

export const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const useFinancialContext = () => {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancialContext must be used within a FinancialProvider');
  }
  return context;
};

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

  const addFunds = async (amount: number, source: string, kidId?: string, fullDescription?: string): Promise<{ success: boolean; error?: ApiError; transaction?: Transaction }> => {
    if (amount <= 0) {
      console.warn('Add funds amount must be positive.');
      // Return structure consistent with API error
      return { success: false, error: { code: 'LOCAL_VALIDATION_INVALID_AMOUNT', message: 'Amount must be positive' } };
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
        const errorResponse = await response.json().catch(() => null); // Try to parse JSON error
        console.error('Failed to add funds API error:', response.status, errorResponse);
        if (errorResponse && errorResponse.error && errorResponse.error.code) {
          // We have a structured error from the API (as defined in mock)
          return { success: false, error: { code: errorResponse.error.code, message: errorResponse.error.message || 'Server error occurred.' } };
        }
        // Fallback for non-structured errors or if JSON parsing failed
        return { success: false, error: { code: `HTTP_ERROR_${response.status}`, message: `Failed to add funds. Status: ${response.status}` } };
      }

      const result = await response.json();

      if (result.success && result.transaction) {
        const newTransaction: Transaction = {
          id: result.transaction.id,
          date: result.transaction.date ? new Date(result.transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          description: fullDescription || result.transaction.description || 'Funds added',
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
        // API call was "ok" (e.g. 200) but success:false in body, or transaction missing
        console.error('Add funds API call did not return a successful transaction object:', result);
        if (result.error && result.error.code) {
             return { success: false, error: { code: result.error.code, message: result.error.message || 'Invalid data from server.' } };
        }
        return { success: false, error: { code: 'INVALID_SERVER_RESPONSE', message: result.message || 'Invalid response data from server.' } };
      }
    } catch (error) {
      console.error('Error calling addFunds API (network or unhandled):', error);
      const errorMessage = error instanceof Error ? error.message : 'Network error or server is unreachable.';
      // For network errors or other unexpected issues, use a generic local code
      return { success: false, error: { code: 'NETWORK_ERROR', message: errorMessage } };
    }
  };

  const addTransaction = (transactionDetails: Omit<Transaction, 'id' | 'date'>) => {
    // ... (implementation remains the same)
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
    // ... (implementation remains the same)
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
