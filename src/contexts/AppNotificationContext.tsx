// src/contexts/AppNotificationContext.tsx
import React, { createContext, useState, useContext, useCallback, useEffect, ReactNode } from 'react';
import type { AppNotification } from '../types'; // Assuming AppNotification is in types.ts
import { useChoresContext } from './ChoresContext'; // Dependency
import { ChoreInstance, ChoreDefinition } from '../types';

interface AppNotificationContextType {
  appNotifications: AppNotification[];
  fetchAppNotifications: () => void;
  markAsRead: (notificationId: string) => void;
  unreadCount: number;
}

const AppNotificationContext = createContext<AppNotificationContextType | undefined>(undefined);

export const AppNotificationProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { choreInstances, choreDefinitions } = useChoresContext();

  const markAsRead = useCallback((notificationId: string) => {
    setAppNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  }, []);

  const fetchAppNotifications = useCallback(() => {
    // More robust guard clause
    if (!choreInstances || !choreDefinitions || !Array.isArray(choreInstances) || !Array.isArray(choreDefinitions)) {
      // console.warn('AppNotificationContext: choreInstances or choreDefinitions not available or not arrays yet.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of today

    const newNotifications: AppNotification[] = [];

    choreInstances.forEach((instance: ChoreInstance) => {
      if (instance.isComplete) return;

      const definition = choreDefinitions.find((def: ChoreDefinition) => def.id === instance.choreDefinitionId);
      if (!definition) return;

      const instanceDueDate = new Date(instance.instanceDate + 'T00:00:00'); // Ensure local timezone interpretation
      instanceDueDate.setHours(0,0,0,0); // Normalize

      let notificationType: AppNotification['type'] | null = null;
      let message = '';

      if (instanceDueDate.getTime() === today.getTime()) {
        notificationType = 'due_today';
        message = `Due Today: '${definition.title}' is due today.`;
      } else if (instanceDueDate.getTime() < today.getTime()) {
        notificationType = 'overdue';
        message = `Overdue: '${definition.title}' was due on ${instance.instanceDate}.`;
      }

      if (notificationType) {
        const existingNotification = appNotifications.find(
          n => n.choreInstanceId === instance.id && n.type === notificationType && !n.isRead
        );
        if (!existingNotification) {
          newNotifications.push({
            id: `${notificationType}-${instance.id}-${Date.now()}`,
            message,
            choreInstanceId: instance.id,
            choreDefinitionId: definition.id,
            type: notificationType,
            date: new Date().toISOString(),
            isRead: false,
          });
        }
      }
    });
    if (newNotifications.length > 0) {
      setAppNotifications(prev => {
        const currentUnreadIds = new Set(prev.filter(n => !n.isRead).map(n => `${n.type}-${n.choreInstanceId}`));
        const trulyNew = newNotifications.filter(nn => !currentUnreadIds.has(`${nn.type}-${nn.choreInstanceId}`));
        if (trulyNew.length > 0) {
          return [...prev.filter(n => n.isRead), ...prev.filter(n => !n.isRead && !trulyNew.some(tn => tn.choreInstanceId === n.choreInstanceId && tn.type === n.type)), ...trulyNew];
        }
        return prev;
      });
    }
  // Reduce re-runs by being specific about dependencies.
  // choreInstances and choreDefinitions are primary. appNotifications is for deduping against current non-new ones.
  }, [choreInstances, choreDefinitions, appNotifications, setAppNotifications]);

  useEffect(() => {
    // Initial fetch and re-fetch when chore data changes
    if (choreInstances && choreDefinitions) { // Check if core data is loaded
        fetchAppNotifications();
    }
  }, [choreInstances, choreDefinitions, fetchAppNotifications]);

  useEffect(() => {
    setUnreadCount(appNotifications.filter(n => !n.isRead).length);
  }, [appNotifications]);

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
