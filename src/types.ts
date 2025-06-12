// src/types.ts

// Re-export Transaction type directly from FinancialContext
export { type Transaction } from './contexts/FinancialContext';

/**
 * Defines the fixed categories for the Matrix Kanban board.
 * These represent the primary status swimlanes for chore instances.
 */
export type MatrixKanbanCategory = "TO_DO" | "IN_PROGRESS" | "COMPLETED";

export interface Kid {
  id: string;
  name: string;
  age?: number;
  avatarFilename?: string; // Assuming this was added in UserContext or similar
  totalFunds?: number;     // Assuming this was added
  /** Optional list of custom Kanban column configurations for this kid. */
  kanbanColumnConfigs?: KanbanColumnConfig[];
  // Add other kid-specific fields here if needed later
}

export interface SubTask {
  id: string;          // Unique ID for the sub-task (e.g., generated on client-side)
  title: string;
  isComplete: boolean;
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
  tags?: string[]; // New field for tags
  subTasks?: SubTask[]; // New field for sub-tasks
}

export interface ChoreInstance {
  id: string; // Unique ID for this specific instance (e.g., choreDefId + '_' + instanceDate)
  choreDefinitionId: string;
  instanceDate: string; // The specific date this instance is due (YYYY-MM-DD)
  isComplete: boolean; // Overall completion of the instance (might be true if all subtasks done or moved to COMPLETED category)

  // New/Modified for Matrix Kanban:
  categoryStatus: MatrixKanbanCategory; // Replaces/clarifies kanbanColumnId's role
  subtaskCompletions: Record<string, boolean>; // Tracks completion of subtasks by subtaskId
  previousSubtaskCompletions?: Record<string, boolean>; // For reverting from COMPLETED status

  // Optional: if reward is snapshotted per instance or can vary
  // rewardAmount?: number;
  // kanbanColumnId?: string; // Removed in favor of categoryStatus for Matrix Kanban
}

/**
 * Represents the configuration for a custom Kanban column defined by a user for a specific kid.
 * These are user-defined columns beyond the default "Active" and "Completed".
 */
export interface KanbanColumnConfig {
  /** Unique identifier for the column configuration (e.g., UUID). */
  id: string;
  /** Identifier of the kid this column config belongs to. */
  kidId: string;
  /** Display title of the Kanban column (e.g., "To Do", "In Progress", "Waiting for Review"). */
  title: string;
  /** Order in which this column should be displayed on the board relative to other custom columns. */
  order: number;
  /** Optional: Timestamp for when this column configuration was created. */
  createdAt?: string;
  /** Optional: Timestamp for when this column configuration was last updated. */
  updatedAt?: string;
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

export type ColumnThemeOption = 'default' | 'pastel' | 'ocean';
