import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react';
import type { AppNotification, ChoreInstance, ChoreDefinition } from '../types';
import { useChoresContext } from './ChoresContext'; // To access chore data
import { getTodayDateString } from '../utils/dateUtils'; // For date comparisons

interface AppNotificationContextType {
  appNotifications: AppNotification[];
  fetchAppNotifications: () => void;
  markAsRead: (notificationId: string) => void; // Stubbed for now
  unreadCount: number;
}

const AppNotificationContext = createContext<AppNotificationContextType | undefined>(undefined);

export const AppNotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { choreInstances, choreDefinitions } = useChoresContext();

  const fetchAppNotifications = useCallback(() => {
    const todayStr = getTodayDateString();
    const newNotifications: AppNotification[] = [];

    choreInstances.forEach((instance: ChoreInstance) => {
      if (instance.isComplete) {
        return; // Skip completed chores
      }

      const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
      if (!definition) {
        return; // Skip if definition not found
      }

      const choreName = definition.title || 'Unnamed Chore';
      let notificationType: AppNotification['type'] | null = null;
      let message = "";

      // Check for overdue
      if (instance.instanceDate < todayStr) {
        notificationType = 'overdue';
        message = `Overdue: '${choreName}' was due on ${instance.instanceDate}.`;
      }
      // Check for due today
      else if (instance.instanceDate === todayStr) {
        notificationType = 'due_today';
        message = `Due Today: '${choreName}' is due today.`;
      }

      if (notificationType) {
        // Avoid duplicates: check if a notification for this instance & type already exists
        const existingNotification = appNotifications.find(
          (n) => n.choreInstanceId === instance.id && n.type === notificationType
        );
        // Also avoid creating new if an *unread* notification of same type for same instance already exists
        // from a previous fetch (if appNotifications isn't cleared between fetches)
        const alreadyExistsUnread = newNotifications.some(
            (n) => n.choreInstanceId === instance.id && n.type === notificationType
        ) || appNotifications.some(
            (n) => n.choreInstanceId === instance.id && n.type === notificationType && !n.isRead
        );


        if (!alreadyExistsUnread) {
          newNotifications.push({
            id: `${notificationType}-${instance.id}-${Date.now()}`, // More unique ID
            message,
            choreInstanceId: instance.id,
            choreDefinitionId: definition.id,
            type: notificationType,
            date: todayStr, // Date notification was generated/identified
            isRead: false, // New notifications are unread
          });
        }
      }
    });

    // Combine with existing unread notifications of other types, then add new ones
    // This simple merge might create duplicates if fetch is called multiple times without clearing old ones.
    // A more robust approach would be to intelligently merge or replace.
    // For now, let's assume we only want to add new, unique (by instanceId and type) notifications.

    setAppNotifications(prev => {
        const existingUnread = prev.filter(n => n.isRead === false);
        const trulyNewNotifications = newNotifications.filter(nn =>
            !existingUnread.some(en => en.choreInstanceId === nn.choreInstanceId && en.type === nn.type)
        );
        return [...existingUnread, ...trulyNewNotifications];
    });

  }, [choreInstances, choreDefinitions, appNotifications]); // appNotifications in deps for duplicate check

  const markAsRead = useCallback((notificationId: string) => {
    setAppNotifications(prevNotifications =>
      prevNotifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
  }, []);

  useEffect(() => {
    // Update unread count whenever appNotifications change
    setUnreadCount(appNotifications.filter(n => !n.isRead).length);
  }, [appNotifications]);

  // Initial fetch on mount - might need to be more strategic if choreInstances load async
  // This relies on ChoresContext already having its data when this provider mounts or updates.
  useEffect(() => {
    if(choreInstances.length > 0 && choreDefinitions.length > 0) { // Only fetch if data is available
        fetchAppNotifications();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choreInstances, choreDefinitions]); // Re-fetch if core data changes. `fetchAppNotifications` itself is memoized.

  return (
    <AppNotificationContext.Provider value={{ appNotifications, fetchAppNotifications, markAsRead, unreadCount }}>
      {children}
    </AppNotificationContext.Provider>
  );
};

export const useAppNotification = (): AppNotificationContextType => {
  const context = useContext(AppNotificationContext);
  if (context === undefined) {
    throw new Error('useAppNotification must be used within an AppNotificationProvider');
  }
  return context;
};
