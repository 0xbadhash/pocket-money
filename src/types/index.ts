/**
 * @file src/types/index.ts
 * Central type definitions and re-exports for the application.
 * This module consolidates all TypeScript interfaces and types used across the codebase.
 */

// Re-export from main types.ts file (legacy support)
export {
  type MatrixKanbanCategory,
  type BatchActionResult,
} from '../types';

// Re-export from organized type modules
export type {
  // Core chore types
  ChoreDefinition,
  ChoreInstance,
  SubTask,
  CreateChoreDefinitionParams,
  UpdateChoreDefinitionParams,
  ChoreOperationResult,
} from './chore';

export type {
  // Kanban types
  KanbanColumnConfig,
  KanbanColumn,
  KanbanPeriod,
  KidKanbanConfig,
  ColumnThemeOption,
  SwimlaneId,
  ParsedSwimlaneId,
  KanbanDragState,
  BatchOperationParams,
  BatchOperationResult,
} from './kanban';

export type {
  // User types
  Kid,
  User,
  CreateKidParams,
  UpdateKidParams,
  LoginCredentials,
  AuthResult,
  UserSession,
} from './user';

export type {
  // Notification types
  NotificationMessage,
  AppNotification,
  NotificationType,
  AppNotificationType,
  NotificationFilter,
  NotificationPreferences,
} from './notification';

// Re-export Transaction from FinancialContext
export { type Transaction } from '../contexts/FinancialContext';

/**
 * Utility type for partial updates that require at least one field
 */
export type AtLeastOne<T> = {
  [K in keyof T]: Pick<T, K>;
}[keyof T];

/**
 * Utility type for making specific properties required
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Utility type for making specific properties optional
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Represents a date range with start and end dates in YYYY-MM-DD format
 */
export interface DateRange {
  start: string;
  end: string;
}

/**
 * Represents a paginated result set
 */
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Common API response structure
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

/**
 * Base interface for entities with timestamps
 */
export interface AuditableEntity {
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}
