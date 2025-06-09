// src/types.ts

// Re-export Transaction type directly from FinancialContext
export { type Transaction } from './contexts/FinancialContext';

export interface Kid {
  id: string;
  name: string;
  age?: number;
  spendingLimits?: { // Optional object for spending limits
    daily?: number;
    weekly?: number;
    monthly?: number;
    perTransaction?: number;
  };
  blockedCategories?: string[]; // Optional array of blocked category names/IDs
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

// Kanban-specific types
export type KanbanPeriod = 'daily' | 'weekly' | 'monthly';

export interface KanbanColumn {
  id: string; // e.g., 'monday', 'week-1', 'todo'
  title: string; // e.g., 'Monday', 'Week 1', 'To Do'
  chores: Chore[];
}

export interface KidKanbanConfig {
  kidId: string;
  selectedPeriod: KanbanPeriod;
  columns: KanbanColumn[];
}
