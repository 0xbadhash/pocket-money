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
  /** Optional list of custom Kanban swimlane configurations for this kid (UI term: swimlane). */
  kanbanColumnConfigs?: KanbanColumnConfig[];
  // Add other kid-specific fields here if needed later
}

export interface SubTask {
  id: string;          // Unique ID for the sub-task (e.g., generated on client-side)
  title: string;
  /**
   * Default completion state for this subtask when a new chore instance is created.
   * For an active chore instance, the actual completion is tracked in `ChoreInstance.subtaskCompletions`.
   */
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
  /** Unique ID for this specific instance (e.g., `choreDefId + '_' + instanceDate`). */
  id: string;
  /** The ID of the `ChoreDefinition` this instance is derived from. */
  choreDefinitionId: string;
  /**
   * The specific date (YYYY-MM-DD format) for which this chore instance is scheduled or relevant.
   * This is crucial for positioning on the date axis of the Matrix Kanban.
   */
  instanceDate: string;
  /**
   * Overall completion status of the chore instance.
   * This is typically true if `categoryStatus` is "COMPLETED".
   * It can also be updated if all subtasks are completed, potentially leading to an auto-move to "COMPLETED".
   */
  isComplete: boolean;

  // New/Modified for Matrix Kanban:
  /**
   * The current category (swimlane) of the chore instance in the Matrix Kanban.
   * Uses the fixed `MatrixKanbanCategory` type ("TO_DO", "IN_PROGRESS", "COMPLETED").
   */
  categoryStatus: MatrixKanbanCategory;
  /**
   * Tracks the completion status of individual subtasks for this specific chore instance.
   * Structure: A record where the key is the `subTaskId` (from `ChoreDefinition.subTasks`)
   * and the value is a boolean indicating if that subtask is completed for this instance.
   */
  subtaskCompletions: Record<string, boolean>;
  /**
   * Stores the state of `subtaskCompletions` before the chore instance was moved into the "COMPLETED" category.
   * This is used to restore subtask states if the chore is moved back to "IN_PROGRESS" or "TO_DO",
   * allowing users to uncheck previously completed subtasks if needed. Optional.
   */
  previousSubtaskCompletions?: Record<string, boolean>;

  // Optional: if reward is snapshotted per instance or can vary
  // rewardAmount?: number;
  // kanbanColumnId?: string; // Removed in favor of categoryStatus for Matrix Kanban
}

/**
 * Represents the configuration for a custom Kanban column/swimlane defined by a user for a specific kid.
 * In the UI, these are referred to as "swimlanes".
 * These are user-defined swimlanes beyond the default "Active" and "Completed".
 */
export interface KanbanColumnConfig {
  /** Unique identifier for the swimlane configuration (e.g., UUID). */
  id: string;
  /** Identifier of the kid this swimlane config belongs to. */
  kidId: string;
  /** Display title of the Kanban swimlane (e.g., "To Do", "In Progress", "Waiting for Review"). */
  title: string;
  /** Order in which this swimlane should be displayed on the board relative to other custom swimlanes. */
  order: number;
  /** Optional: Background color for the swimlane. */
  color?: string;
  /** Optional: Timestamp for when this swimlane configuration was created. */
  createdAt?: string;
  /** Optional: Timestamp for when this swimlane configuration was last updated. */
  updatedAt?: string;
}

// Keep existing Kanban types for now, they might need adjustment later
// if they directly reference 'Chore' which is now 'ChoreDefinition'
export type KanbanPeriod = 'daily' | 'weekly' | 'monthly';

/**
 * Represents a Kanban column in the data structure, often referred to as a "swimlane" in the UI.
 */
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
