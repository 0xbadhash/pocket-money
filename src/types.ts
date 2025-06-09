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
  dueDate?: string; // This might represent the first due date for recurring chores
  rewardAmount?: number;
  isComplete: boolean; // For recurring chores, this might represent the status of the current instance
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | null;
  recurrenceDay?: number | null;
  recurrenceEndDate?: string | null;
}
