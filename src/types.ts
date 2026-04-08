/**
 * @file src/types.ts
 * Legacy type exports - DEPRECATED
 * 
 * This file is maintained for backward compatibility only.
 * Please import types from the organized modules:
 * - @/types/chore for ChoreDefinition, ChoreInstance, SubTask, etc.
 * - @/types/user for Kid, User, etc.
 * - @/types/kanban for KanbanColumn, KanbanPeriod, etc.
 * - @/types/notification for NotificationMessage, AppNotification, etc.
 * - @/types/index for all re-exported types
 */

// Re-export all types from organized modules for backward compatibility
export { type Transaction } from './contexts/FinancialContext';
export type {
  MatrixKanbanCategory,
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
} from './types/kanban';
export type {
  Kid,
  CreateKidParams,
  UpdateKidParams,
  User,
  LoginCredentials,
  AuthResult,
  UserSession,
} from './types/user';
export type {
  ChoreDefinition,
  ChoreInstance,
  SubTask,
  CreateChoreDefinitionParams,
  UpdateChoreDefinitionParams,
  ChoreOperationResult,
} from './types/chore';
export type {
  NotificationMessage,
  AppNotification,
  NotificationType,
  AppNotificationType,
  NotificationFilter,
  NotificationPreferences,
} from './types/notification';

// Re-export from types/index for complete backward compatibility
export type {
  AtLeastOne,
  RequiredFields,
  OptionalFields,
  DateRange,
  PaginatedResult,
  ApiResponse,
  AuditableEntity,
} from './types/index';

// Legacy aliases (deprecated - use BatchOperationResult instead)
import type { BatchOperationResult } from './types/kanban';
export type BatchActionResult = BatchOperationResult;
