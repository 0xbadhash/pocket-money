/**
 * @file src/services/interfaces.ts
 * Service interface definitions for dependency injection and testing.
 * This module defines abstract interfaces for all services in the application.
 */

import type {
  ChoreDefinition,
  ChoreInstance,
  MatrixKanbanCategory,
} from '../types';
import type { BatchActionResult } from './choreService';

/**
 * Interface for chore-related operations.
 * Defines the contract for any service implementing chore business logic.
 */
export interface IChoreService {
  /**
   * Generates chore instances for active definitions within a date range.
   * @param choreDefinitions - Array of all chore definitions
   * @param periodStartDate - Start date in YYYY-MM-DD format
   * @param periodEndDate - End date in YYYY-MM-DD format
   * @param existingInstances - Current instances to preserve data from
   * @param defaultCategory - Default category for new instances
   * @returns New array of chore instances
   */
  generateInstancesForPeriod(
    choreDefinitions: ChoreDefinition[],
    periodStartDate: string,
    periodEndDate: string,
    existingInstances: ChoreInstance[],
    defaultCategory?: MatrixKanbanCategory
  ): ChoreInstance[];

  /**
   * Applies category update logic to a single chore instance.
   * @param instance - The chore instance to update
   * @param newCategory - The new category to apply
   * @param definition - The associated chore definition
   * @returns Updated chore instance
   */
  applyCategoryUpdateToInstance(
    instance: ChoreInstance,
    newCategory: MatrixKanbanCategory,
    definition?: ChoreDefinition
  ): ChoreInstance;

  /**
   * Toggles subtask completion on an instance with automatic category management.
   * @param instance - The chore instance to update
   * @param subtaskId - ID of the subtask to toggle
   * @param choreDefinitions - All chore definitions to find the associated definition
   * @returns Updated chore instance or null if not found
   */
  toggleSubtaskCompletionOnInstance(
    instance: ChoreInstance,
    subtaskId: string,
    choreDefinitions: ChoreDefinition[]
  ): ChoreInstance | null;

  /**
   * Prepares future instances for a chore series update.
   * @param updatedDefinition - The updated chore definition
   * @param fromDate - Start date for regeneration (YYYY-MM-DD)
   * @param existingInstances - Current instances to filter
   * @returns Array of new future instances
   */
  prepareSeriesUpdateInstances(
    updatedDefinition: ChoreDefinition,
    fromDate: string,
    existingInstances: ChoreInstance[]
  ): ChoreInstance[];

  /**
   * Filters chore instances for a specific kid and date range.
   * @param instances - All chore instances
   * @param definitions - All chore definitions
   * @param kidId - The kid ID to filter by
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns Filtered array of chore instances
   */
  filterInstancesForKidAndPeriod(
    instances: ChoreInstance[],
    definitions: ChoreDefinition[],
    kidId: string,
    startDate: string,
    endDate: string
  ): ChoreInstance[];

  /**
   * Groups chore instances by date and category for Matrix Kanban display.
   * @param instances - Array of chore instances to group
   * @param definitions - All chore definitions for lookup
   * @param dates - Array of dates to create columns for
   * @returns Map of date strings to maps of categories to instances
   */
  groupInstancesByDateAndCategory(
    instances: ChoreInstance[],
    definitions: ChoreDefinition[],
    dates: Date[]
  ): Map<string, Map<MatrixKanbanCategory, ChoreInstance[]>>;

  /**
   * Assigns IDs to new subtasks while preserving existing ones.
   * @param subTasks - Array of subtasks that may need IDs
   * @returns Subtasks with guaranteed IDs
   */
  ensureSubTaskIds(
    subTasks?: Array<{ id?: string; title: string; isComplete: boolean }>
  ): Array<{ id: string; title: string; isComplete: boolean }> | undefined;

  /**
   * Batch toggles completion status for multiple chore instances.
   * @param instances - All chore instances
   * @param instanceIds - IDs of instances to toggle
   * @param markAsComplete - Whether to mark as complete or incomplete
   * @param definitions - All chore definitions for reward processing
   * @returns Result of the batch operation
   */
  batchToggleComplete(
    instances: ChoreInstance[],
    instanceIds: string[],
    markAsComplete: boolean,
    definitions: ChoreDefinition[]
  ): {
    updatedInstances: ChoreInstance[];
    result: BatchActionResult;
  };

  /**
   * Batch updates category for multiple chore instances.
   * @param instances - All chore instances
   * @param instanceIds - IDs of instances to update
   * @param newCategory - New category to apply
   * @param definitions - All chore definitions for subtask logic
   * @returns Result of the batch operation
   */
  batchUpdateCategory(
    instances: ChoreInstance[],
    instanceIds: string[],
    newCategory: MatrixKanbanCategory,
    definitions: ChoreDefinition[]
  ): {
    updatedInstances: ChoreInstance[];
    result: BatchActionResult;
  };
}

/**
 * Interface for user management operations.
 * Defines the contract for any service implementing user authentication and management.
 */
export interface IUserService {
  /**
   * Authenticates a user with credentials.
   * @param username - User's username
   * @param password - User's password
   * @returns Authentication result with user data if successful
   */
  login(username: string, password: string): Promise<{
    success: boolean;
    user?: User;
    message?: string;
    errors?: string[];
  }>;

  /**
   * Logs out the current user.
   * @returns True if logout was successful
   */
  logout(): Promise<boolean>;

  /**
   * Registers a new user.
   * @param userData - User registration data
   * @returns Registration result
   */
  register(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<{
    success: boolean;
    user?: User;
    message?: string;
    errors?: string[];
  }>;

  /**
   * Updates user profile information.
   * @param userId - ID of the user to update
   * @param updates - Fields to update
   * @returns Update result
   */
  updateUserProfile(
    userId: string,
    updates: Record<string, unknown>
  ): Promise<{
    success: boolean;
    user?: User;
    message?: string;
    errors?: string[];
  }>;
}

/**
 * Interface for financial operations.
 * Defines the contract for any service implementing financial transaction management.
 */
export interface IFinancialService {
  /**
   * Adds funds to an account.
   * @param amount - Amount to add
   * @param description - Description of the transaction
   * @param kidId - Optional kid ID associated with the transaction
   * @returns Transaction result
   */
  addFunds(
    amount: number,
    description: string,
    kidId?: string
  ): Promise<{
    success: boolean;
    transaction?: Transaction;
    message?: string;
    errors?: string[];
  }>;

  /**
   * Records a financial transaction.
   * @param transaction - Transaction details
   * @returns Transaction result
   */
  recordTransaction(transaction: {
    amount: number;
    description: string;
    category: string;
    kidId?: string;
  }): Promise<{
    success: boolean;
    transaction?: Transaction;
    message?: string;
    errors?: string[];
  }>;

  /**
   * Gets account balance.
   * @param userId - ID of the user
   * @returns Current balance
   */
  getBalance(userId: string): Promise<number>;

  /**
   * Gets transaction history.
   * @param userId - ID of the user
   * @param limit - Maximum number of transactions to return
   * @returns Array of transactions
   */
  getTransactionHistory(
    userId: string,
    limit?: number
  ): Promise<Transaction[]>;
}

/**
 * Interface for notification operations.
 * Defines the contract for any service implementing notification management.
 */
export interface INotificationService {
  /**
   * Shows a notification.
   * @param message - Notification message
   * @param type - Type of notification
   * @param duration - Duration in milliseconds
   * @returns Notification ID
   */
  showNotification(
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
    duration?: number
  ): string;

  /**
   * Dismisses a notification.
   * @param notificationId - ID of notification to dismiss
   */
  dismissNotification(notificationId: string): void;

  /**
   * Clears all notifications.
   */
  clearAllNotifications(): void;

  /**
   * Gets all active notifications.
   * @returns Array of active notifications
   */
  getActiveNotifications(): AppNotification[];
}

/**
 * Interface for Kanban board operations.
 * Defines the contract for any service implementing Kanban functionality.
 */
export interface IKanbanService {
  /**
   * Gets column configurations for a kid.
   * @param kidId - ID of the kid
   * @returns Array of column configurations
   */
  getColumnConfigs(kidId: string): Promise<KanbanColumnConfig[]>;

  /**
   * Updates column configuration.
   * @param kidId - ID of the kid
   * @param configId - ID of the configuration to update
   * @param updates - Fields to update
   * @returns Update result
   */
  updateColumnConfig(
    kidId: string,
    configId: string,
    updates: Record<string, unknown>
  ): Promise<{
    success: boolean;
    config?: KanbanColumnConfig;
    message?: string;
    errors?: string[];
  }>;

  /**
   * Reorders columns.
   * @param kidId - ID of the kid
   * @param orderedConfigs - New order of configurations
   * @returns Reorder result
   */
  reorderColumns(
    kidId: string,
    orderedConfigs: KanbanColumnConfig[]
  ): Promise<{
    success: boolean;
    configs?: KanbanColumnConfig[];
    message?: string;
    errors?: string[];
  }>;

  /**
   * Adds a new column configuration.
   * @param kidId - ID of the kid
   * @param title - Column title
   * @param color - Optional column color
   * @returns Add result
   */
  addColumnConfig(
    kidId: string,
    title: string,
    color?: string
  ): Promise<{
    success: boolean;
    config?: KanbanColumnConfig;
    message?: string;
    errors?: string[];
  }>;

  /**
   * Deletes a column configuration.
   * @param kidId - ID of the kid
   * @param configId - ID of the configuration to delete
   * @returns Delete result
   */
  deleteColumnConfig(
    kidId: string,
    configId: string
  ): Promise<{
    success: boolean;
    message?: string;
    errors?: string[];
  }>;
}
