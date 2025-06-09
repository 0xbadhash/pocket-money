// src/types.ts

// Re-export Transaction type directly from FinancialContext
export { type Transaction } from './contexts/FinancialContext';

export interface Kid {
  id: string;
  name: string;
  age?: number;
  // Add other kid-specific fields here if needed later
}

export interface Chore {
  id: string;
  title: string;
  description?: string;
  assignedKidId?: string;
  dueDate?: string;
  rewardAmount?: number;
  isComplete: boolean;
}
