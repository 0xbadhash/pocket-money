// src/types.ts

// Re-export Transaction type directly from FinancialContext
export { type Transaction } from './contexts/FinancialContext';

export interface Kid {
  id: string;
  name: string;
  age?: number;
  // Add other kid-specific fields here if needed later
}

// Renamed from Chore
export interface ChoreDefinition {
  id: string; // Unique ID for the chore definition
  title: string;
  description?: string;
  assignedKidId?: string;
  // For non-recurring, this is the due date.
  // For recurring, this is the START date of recurrence.
  dueDate?: string;
  rewardAmount?: number;
  // isComplete for a definition might mean "archived" or "template no longer active"
  isComplete: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | null; // 'none' can be represented by null
  // For weekly: 0 (Sun) to 6 (Sat). For monthly: 1 to 31.
  recurrenceDay?: number | null;
  recurrenceEndDate?: string | null; // Date after which no more instances are generated
}

export interface ChoreInstance {
  id: string; // Unique ID for this specific instance (e.g., choreDefId + '_' + instanceDate)
  choreDefinitionId: string;
  instanceDate: string; // The specific date this instance is due (YYYY-MM-DD)
  isComplete: boolean;
  // Optional: if reward is snapshotted per instance or can vary
  // rewardAmount?: number;
}

// Keep existing Kanban types for now, they might need adjustment later
// if they directly reference 'Chore' which is now 'ChoreDefinition'
export type KanbanPeriod = 'daily' | 'weekly' | 'monthly';

export interface KanbanColumn {
  id: string;
  title: string;
  // This will eventually hold ChoreInstance[]
  chores: ChoreInstance[]; // MODIFIED: Was Chore[], now ChoreInstance[]
}

export interface KidKanbanConfig {
  kidId: string;
  selectedPeriod: KanbanPeriod;
  columns: KanbanColumn[];
}
