/**
 * @file src/types/context.ts
 * Context-related type definitions for the application.
 * This module defines all context provider types and hooks used across the app.
 */

import type { User } from './user';
import type { Kid, KanbanColumnConfig } from './kanban';
import type { Transaction } from '../contexts/FinancialContext';
import type { ReactNode } from 'react';

/**
 * Defines the shape of the User context value.
 * Provides user authentication and management functionality.
 */
export interface UserContextType {
  /** Current authenticated user, or null if not logged in */
  user: User | null;
  /** Loading state for async operations */
  loading: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Logs in a user with provided credentials */
  login: (userData: User) => void;
  /** Logs out the current user */
  logout: () => void;
  /** Updates the current user's data */
  updateUser: (updatedUserData: Partial<User>) => void;
  /** Adds a new kid to the user's account */
  addKid: (kidData: Omit<Kid, 'id' | 'kanbanColumnConfigs' | 'totalFunds'> & { totalFunds?: number }) => string | undefined;
  /** Updates an existing kid's data */
  updateKid: (updatedKidData: Kid) => void;
  /** Deletes a kid from the user's account */
  deleteKid: (kidId: string) => void;
  /** Gets Kanban column configurations for a specific kid */
  getKanbanColumnConfigs: (kidId: string) => KanbanColumnConfig[];
  /** Adds a new Kanban column configuration for a kid */
  addKanbanColumnConfig: (kidId: string, title: string, color?: string) => Promise<void>;
  /** Updates an existing Kanban column configuration */
  updateKanbanColumnConfig: (updatedConfig: KanbanColumnConfig) => Promise<void>;
  /** Deletes a Kanban column configuration for a kid */
  deleteKanbanColumnConfig: (kidId: string, configId: string) => Promise<void>;
  /** Reorders Kanban column configurations for a kid */
  reorderKanbanColumnConfigs: (kidId: string, orderedConfigs: KanbanColumnConfig[]) => Promise<void>;
}

/**
 * Props for the UserProvider component.
 */
export interface UserProviderProps {
  /** Child components that will have access to the User context */
  children: ReactNode;
}

/**
 * Defines the shape of the Financial context value.
 * Provides financial transaction and balance management functionality.
 */
export interface FinancialContextType {
  /** Current financial data including balance and transactions */
  financialData: FinancialData;
  /** Adds funds to the account */
  addFunds: (amount: number, description?: string, kidId?: string) => void;
  /** Adds a new transaction to the ledger */
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  /** Adds a reward transaction for a kid completing a chore */
  addKidReward: (kidId: string, rewardAmount: number, choreTitle: string) => void;
}

/**
 * Represents financial data structure.
 */
export interface FinancialData {
  /** Current account balance */
  currentBalance: number;
  /** List of all financial transactions */
  transactions: Transaction[];
}

/**
 * Props for the FinancialProvider component.
 */
export interface FinancialProviderProps {
  /** Child components that will have access to the Financial context */
  children: ReactNode;
}

/**
 * Defines custom Kanban chore order storage structure.
 * Used for storing user-defined chore ordering preferences.
 */
export type KanbanChoreOrders = Record<string, string[]>;

/**
 * Defines the shape of the Chores context value.
 * Provides comprehensive chore management functionality including definitions,
 * instances, and Matrix Kanban operations.
 */
export interface ChoresContextType {
  /** Array of all defined chore templates */
  choreDefinitions: ChoreDefinition[];
  /** Array of all generated chore instances for various periods */
  choreInstances: ChoreInstance[];
  /** Adds a new chore definition to the system */
  addChoreDefinition: (choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete'>) => void;
  /** Toggles the overall completion status of a specific chore instance */
  toggleChoreInstanceComplete: (instanceId: string) => void;
  /** Retrieves all chore definitions assigned to a specific kid */
  getChoreDefinitionsForKid: (kidId: string) => ChoreDefinition[];
  /**
   * Generates chore instances for all definitions within a given date range.
   * @param startDate - The start date of the period (YYYY-MM-DD)
   * @param endDate - The end date of the period (YYYY-MM-DD)
   * @param defaultCategory - Optional default MatrixKanbanCategory for new instances
   */
  generateInstancesForPeriod: (startDate: string, endDate: string, defaultCategory?: MatrixKanbanCategory) => void;
  /** Toggles subtask completion on a specific chore instance */
  toggleSubtaskCompletionOnInstance: (instanceId: string, subtaskId: string) => void;
  /** Toggles the active state of a chore definition */
  toggleChoreDefinitionActiveState: (definitionId: string) => void;
  /** Updates the category status of a chore instance */
  updateChoreInstanceCategory: (
    instanceId: string,
    newCategory: MatrixKanbanCategory,
  ) => void;
  /** Updates specified fields of a chore definition */
  updateChoreDefinition: (definitionId: string, updates: Partial<ChoreDefinition>) => Promise<void>;
  /** Updates a specific field of a chore instance */
  updateChoreInstanceField: (
    instanceId: string,
    fieldName: keyof ChoreInstance,
    value: string | number | boolean | MatrixKanbanCategory | Record<string, boolean> | undefined
  ) => Promise<void>;
  /** Batch marks chore instances as complete or incomplete */
  batchToggleCompleteChoreInstances: (instanceIds: string[], markAsComplete: boolean) => Promise<void>;
  /** Batch updates the category for multiple chore instances */
  batchUpdateChoreInstancesCategory: (instanceIds: string[], newCategory: MatrixKanbanCategory) => Promise<void>;
  /** Batch assigns chore definitions to a new kid */
  batchAssignChoreDefinitionsToKid: (definitionIds: string[], newKidId: string | null) => Promise<void>;
  /** Updates a chore definition and its future instances from a given date */
  updateChoreSeries: (
    definitionId: string,
    updates: Partial<Pick<ChoreDefinition, 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'timeOfDay'>>,
    fromDate: string,
    fieldName: 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'timeOfDay'
  ) => Promise<void>;
}

/**
 * Props for the ChoresProvider component.
 */
export interface ChoresProviderProps {
  /** Child components that will have access to the Chores context */
  children: ReactNode;
}

// Import types from other modules to avoid circular dependencies
import type { ChoreDefinition, ChoreInstance } from './chore';
import type { MatrixKanbanCategory } from '../types';

/**
 * Defines the shape of the Notification context value.
 * Provides application-wide notification functionality.
 */
export interface NotificationContextType {
  /** Shows a notification to the user */
  showNotification: (message: string, type?: NotificationType) => void;
  /** Dismisses a specific notification by ID */
  dismissNotification: (notificationId: string) => void;
  /** Clears all notifications */
  clearAllNotifications: () => void;
}

/**
 * Props for the NotificationProvider component.
 */
export interface NotificationProviderProps {
  /** Child components that will have access to the Notification context */
  children: ReactNode;
}

/**
 * Type of notification that can be shown.
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Defines the shape of the App Notification context value.
 * Provides enhanced notification functionality with persistence.
 */
export interface AppNotificationContextType {
  /** Shows a persistent notification */
  showAppNotification: (notification: AppNotification) => void;
  /** Dismisses a specific app notification */
  dismissAppNotification: (notificationId: string) => void;
  /** Marks a notification as read */
  markAsRead: (notificationId: string) => void;
  /** Marks all notifications as read */
  markAllAsRead: () => void;
  /** Gets unread notification count */
  unreadCount: number;
}

/**
 * Props for the AppNotificationProvider component.
 */
export interface AppNotificationProviderProps {
  /** Child components that will have access to the AppNotification context */
  children: ReactNode;
}

// Re-export notification types from notification module
export type { AppNotification, NotificationMessage } from './notification';
