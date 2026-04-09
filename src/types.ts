// src/types.ts

// Re-export Transaction type directly from FinancialContext
export type { Transaction } from './contexts/FinancialContext';

/**
 * Defines the fixed categories for the Matrix Kanban board.
 * These represent the primary status swimlanes for chore instances.
 */
export type MatrixKanbanCategory = "TO_DO" | "IN_PROGRESS" | "COMPLETED";

/**
 * Represents user information in the application.
 */
export interface User {
  id: string;
  username: string;
  email: string;
  kids: Kid[];
  settings?: {
    defaultView?: string;
    theme?: 'light' | 'dark';
  };
  createdAt?: string;
  updatedAt?: string;
  role?: 'admin' | 'user';
}

export interface Kid {
  id: string;
  name: string;
  age?: number;
  avatarFilename?: string;
  totalFunds?: number;
  /** Optional list of custom Kanban swimlane configurations for this kid (UI term: swimlane). */
  kanbanColumnConfigs?: KanbanColumnConfig[];
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
  id: string;
  title: string;
  description?: string;
  assignedKidId?: string;
  dueDate?: string;
  earlyStartDate?: string;
  rewardAmount?: number;
  isComplete: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | null;
  recurrenceDay?: number | number[] | null;
  recurrenceEndDate?: string | null;
  tags?: string[];
  subTasks?: SubTask[];
  priority?: 'Low' | 'Medium' | 'High';
  definitionComments?: Array<{ id: string; userId: string; userName: string; text: string; createdAt: string; }>;
  timeOfDay?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChoreInstance {
  id: string;
  choreDefinitionId: string;
  instanceDate: string;
  isComplete: boolean;
  categoryStatus: string;
  subtaskCompletions: Record<string, boolean>;
  previousSubtaskCompletions?: Record<string, boolean>;
  overriddenRewardAmount?: number;
  priority?: 'Low' | 'Medium' | 'High';
  instanceComments?: Array<{ id: string; userId: string; userName: string; text: string; createdAt: string; }>;
  isSkipped?: boolean;
  activityLog?: Array<{ timestamp: string; action: string; userId?: string; userName?: string; details?: string; }>;
  instanceDescription?: string;
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
  /** Optional: Indicates if this column represents a "completed" state for chores. */
  isCompletedColumn?: boolean;
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

// Added from previous subtask, re-adding after reset
export interface BatchActionResult {
  succeededCount: number;
  failedCount: number;
  succeededIds: string[];
  failedIds: string[];
}

export interface NotificationMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface AppNotification {
  id: string;
  message: string;
  choreInstanceId: string;
  choreDefinitionId: string;
  type: 'due_today' | 'overdue' | 'recently_completed';
  date: string;
  isRead?: boolean;
}
