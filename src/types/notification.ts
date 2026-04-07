/**
 * @file src/types/notification.ts
 * Notification-related type definitions.
 */

/**
 * Types of notifications in the system.
 */
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

/**
 * Represents a UI notification message.
 */
export interface NotificationMessage {
  /** Unique identifier for the notification */
  id: string;
  /** Message content to display */
  message: string;
  /** Type/severity of the notification */
  type: NotificationType;
  /** Optional duration in milliseconds before auto-dismiss */
  duration?: number;
}

/**
 * Types of app notifications related to chores.
 */
export type AppNotificationType = 'due_today' | 'overdue' | 'recently_completed';

/**
 * Represents an app notification about chore status.
 */
export interface AppNotification {
  /** Unique identifier for the notification */
  id: string;
  /** Message content */
  message: string;
  /** ID of the chore instance this notification is about */
  choreInstanceId: string;
  /** ID of the chore definition */
  choreDefinitionId: string;
  /** Type of notification */
  type: AppNotificationType;
  /** Date associated with the notification */
  date: string;
  /** Whether the notification has been read */
  isRead?: boolean;
}

/**
 * Filter options for notifications.
 */
export interface NotificationFilter {
  /** Filter by notification type */
  type?: NotificationType | AppNotificationType;
  /** Filter by read status */
  isRead?: boolean;
  /** Filter by date range */
  startDate?: string;
  endDate?: string;
}

/**
 * Preferences for notification settings.
 */
export interface NotificationPreferences {
  /** Enable/disable due today notifications */
  enableDueTodayNotifications: boolean;
  /** Enable/disable overdue notifications */
  enableOverdueNotifications: boolean;
  /** Enable/disable completion notifications */
  enableCompletionNotifications: boolean;
  /** Default duration for notifications in milliseconds */
  defaultDuration: number;
  /** Maximum number of notifications to display */
  maxNotifications: number;
}
