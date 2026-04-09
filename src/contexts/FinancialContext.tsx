// src/contexts/FinancialContext.tsx
import { createContext, useState, useContext, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

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

interface FinancialContextType {
  financialData: FinancialData;
  addFunds: (amount: number, description?: string, kidId?: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  addKidReward: (kidId: string, rewardAmount: number, choreTitle: string) => void;
}

export const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const useFinancialContext = (): FinancialContextType => {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancialContext must be used within a FinancialProvider');
  }
  return context;
};

interface FinancialProviderProps {
  children: ReactNode;
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2023-10-20', description: 'Initial Balance', amount: 100.00, category: 'Initial Funds' },
  { id: 't2', date: '2023-10-22', description: 'Pocket Money Received', amount: 20.00, category: 'Allowance', kidId: 'kid_a' },
  { id: 't3', date: '2023-10-25', description: 'Book Store', amount: -15.00, category: 'Books', kidId: 'kid_a' },
  { id: 't4', date: '2023-11-01', description: 'Video Game Purchase', amount: -25.00, category: 'Games', kidId: 'kid_b' },
  { id: 't5', date: '2023-11-05', description: 'Birthday Money', amount: 50.00, category: 'Income', kidId: 'kid_b' },
];

const INITIAL_BALANCE = 100.00;

export const FinancialProvider: React.FC<FinancialProviderProps> = ({ children }) => {
  const [financialData, setFinancialData] = useState<FinancialData>({
    currentBalance: INITIAL_BALANCE,
    transactions: INITIAL_TRANSACTIONS,
  });

  const addFunds = useCallback((amount: number, description: string = 'Funds Added', kidId?: string) => {
    if (amount <= 0) {
      console.warn('Add funds amount must be positive.');
      return;
    }
    const newTransaction: Transaction = {
      id: `t${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description,
      amount,
      category: 'Income',
      kidId,
    };
    setFinancialData((prevData) => ({
      currentBalance: prevData.currentBalance + amount,
      transactions: [newTransaction, ...prevData.transactions],
    }));
  }, []);

  const addTransaction = useCallback((transactionDetails: Omit<Transaction, 'id' | 'date'>) => {
    const newTransaction: Transaction = {
      id: `t${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...transactionDetails,
    };
    setFinancialData((prevData) => ({
      currentBalance: prevData.currentBalance + newTransaction.amount,
      transactions: [newTransaction, ...prevData.transactions],
    }));
  }, []);

  const addKidReward = useCallback((kidId: string, rewardAmount: number, choreTitle: string) => {
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
      kidId,
    };
    setFinancialData((prevData) => ({
      currentBalance: prevData.currentBalance + rewardAmount,
      transactions: [newTransaction, ...prevData.transactions],
    }));
  }, []);

  const contextValue = useMemo(() => ({
    financialData,
    addFunds,
    addTransaction,
    addKidReward,
  }), [financialData, addFunds, addTransaction, addKidReward]);

  return (
    <FinancialContext.Provider value={contextValue}>
      {children}
    </FinancialContext.Provider>
  );
};
