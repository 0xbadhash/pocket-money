/**
 * @file src/types/kanban.ts
 * Kanban board-related type definitions.
 */

import type { ChoreInstance } from './chore';
import type { MatrixKanbanCategory } from '../types';

/**
 * Represents a custom Kanban column/swimlane configuration for a specific kid.
 * These are user-defined swimlanes beyond the default categories.
 */
export interface KanbanColumnConfig {
  /** Unique identifier for the swimlane configuration (e.g., UUID) */
  id: string;
  /** ID of the kid this swimlane config belongs to */
  kidId: string;
  /** Display title of the Kanban column (e.g., "To Do", "In Progress") */
  title: string;
  /** Order in which this column should be displayed relative to others */
  order: number;
  /** Optional background color for the column */
  color?: string;
  /** Timestamp for when this configuration was created */
  createdAt?: string;
  /** Timestamp for when this configuration was last updated */
  updatedAt?: string;
}

/**
 * Represents a Kanban column in the data structure.
 */
export interface KanbanColumn {
  /** Unique identifier for the column */
  id: string;
  /** Display title of the column */
  title: string;
  /** Array of chore instances in this column */
  chores: ChoreInstance[];
}

/**
 * Time period selection for the Kanban board view.
 */
export type KanbanPeriod = 'daily' | 'weekly' | 'monthly';

/**
 * Configuration for a kid's Kanban board.
 */
export interface KidKanbanConfig {
  /** ID of the kid this config belongs to */
  kidId: string;
  /** Selected time period for viewing */
  selectedPeriod: KanbanPeriod;
  /** Array of columns in the board */
  columns: KanbanColumn[];
}

/**
 * Visual theme options for Kanban columns.
 */
export type ColumnThemeOption = 'default' | 'pastel' | 'ocean';

/**
 * Parsed swimlane ID structure for drag-and-drop operations.
 */
export interface SwimlaneId {
  /** Date string in YYYY-MM-DD format */
  dateString: string;
  /** Category of the swimlane */
  category: MatrixKanbanCategory;
}

/**
 * Result of parsing a swimlane ID string.
 */
export type ParsedSwimlaneId = SwimlaneId | null;

/**
 * Drag state for Kanban operations.
 */
export interface KanbanDragState {
  /** The chore instance being dragged */
  instance: ChoreInstance;
  /** The definition of the chore being dragged */
  definition?: ChoreInstance;
}

/**
 * Parameters for batch operations on Kanban items.
 */
export interface BatchOperationParams {
  /** IDs of items to operate on */
  ids: string[];
  /** The operation to perform */
  operation: 'complete' | 'incomplete' | 'category_change' | 'assign';
  /** Additional parameters depending on operation type */
  payload?: unknown;
}

/**
 * Result of a batch operation.
 */
export interface BatchOperationResult {
  /** Number of successfully processed items */
  succeededCount: number;
  /** Number of failed items */
  failedCount: number;
  /** IDs of successfully processed items */
  succeededIds: string[];
  /** IDs of failed items */
  failedIds: string[];
}
