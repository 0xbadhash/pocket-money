/**
 * @file src/types/chore.ts
 * Core chore-related type definitions.
 */

import type { MatrixKanbanCategory } from '../types';

/**
 * Represents a subtask within a chore definition.
 */
export interface SubTask {
  /** Unique ID for the sub-task (e.g., generated on client-side) */
  id: string;
  /** Title/description of the subtask */
  title: string;
  /**
   * Default completion state for this subtask when a new chore instance is created.
   * For an active chore instance, the actual completion is tracked in `ChoreInstance.subtaskCompletions`.
   */
  isComplete: boolean;
}

/**
 * Represents a chore definition template.
 * This is the blueprint for generating chore instances.
 */
export interface ChoreDefinition {
  /** Unique ID for the chore definition */
  id: string;
  /** Title/name of the chore */
  title: string;
  /** Optional detailed description */
  description?: string;
  /** ID of the kid this chore is assigned to */
  assignedKidId?: string;
  /**
   * For non-recurring: the due date.
   * For recurring: the START date of recurrence.
   */
  dueDate?: string;
  /** Optional date before dueDate when instances should start appearing */
  earlyStartDate?: string;
  /** Reward amount for completing the chore */
  rewardAmount?: number;
  /** Whether the chore definition is archived/inactive */
  isComplete: boolean;
  /** Type of recurrence: daily, weekly, monthly, or null for non-recurring */
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | 'none' | null;
  /** For weekly: 0 (Sun) to 6 (Sat). For monthly: 1 to 31. Can be array for multiple days in week */
  recurrenceDay?: number | number[] | null;
  /** Date after which no more instances are generated */
  recurrenceEndDate?: string | null;
  /** Tags for categorization and filtering */
  tags?: string[];
  /** Subtasks that make up this chore */
  subTasks?: SubTask[];
  /** Timestamp for when this definition was created */
  createdAt?: string;
  /** Timestamp for when this definition was last updated */
  updatedAt?: string;
  /** Time of day when the chore should be done (optional) */
  hour?: number;
  /** Minute of the hour (optional) */
  minute?: number;
  /** Human-readable time of day (e.g., "morning", "afternoon", "evening") */
  timeOfDay?: string;
}

/**
 * Represents a specific instance of a chore.
 * Generated from ChoreDefinition for a particular date.
 */
export interface ChoreInstance {
  /** Unique ID for this specific instance (e.g., `choreDefId + '_' + instanceDate`) */
  id: string;
  /** The ID of the ChoreDefinition this instance is derived from */
  choreDefinitionId: string;
  /**
   * The specific date (YYYY-MM-DD format) for which this chore instance is scheduled.
   * Critical for positioning on the date axis of the Matrix Kanban.
   */
  instanceDate: string;
  /**
   * Overall completion status of the chore instance.
   * Typically true if categoryStatus is "COMPLETED".
   * Can be auto-updated if all subtasks are completed.
   */
  isComplete: boolean;
  /**
   * The current category (swimlane) in the Matrix Kanban.
   * Values: "TO_DO", "IN_PROGRESS", "COMPLETED"
   */
  categoryStatus: MatrixKanbanCategory;
  /**
   * Tracks completion status of individual subtasks for this instance.
   * Key: subTaskId from ChoreDefinition.subTasks
   * Value: boolean indicating completion
   */
  subtaskCompletions: Record<string, boolean>;
  /**
   * Stores subtaskCompletions state before moving to COMPLETED.
   * Used to restore states if moved back to IN_PROGRESS or TO_DO.
   */
  previousSubtaskCompletions?: Record<string, boolean>;
  /** Instance-specific reward override */
  overriddenRewardAmount?: number;
}

/**
 * Parameters for creating a new chore definition
 */
export type CreateChoreDefinitionParams = Omit<ChoreDefinition, 'id' | 'isComplete' | 'createdAt' | 'updatedAt'>;

/**
 * Parameters for updating an existing chore definition
 */
export type UpdateChoreDefinitionParams = Partial<ChoreDefinition>;

/**
 * Result of a chore operation
 */
export interface ChoreOperationResult {
  success: boolean;
  message?: string;
  errors?: string[];
}
