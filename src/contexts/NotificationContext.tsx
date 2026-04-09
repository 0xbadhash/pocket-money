// src/contexts/NotificationContext.tsx
import { createContext, useState, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { NotificationMessage } from '../types';

interface NotificationContextType {
  notifications: NotificationMessage[];
  addNotification: (notification: Omit<NotificationMessage, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

const MAX_NOTIFICATIONS = 5;
const DEFAULT_SUCCESS_INFO_DURATION = 5000;

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((notification: Omit<NotificationMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const fullNotification = { ...notification, id };
    setNotifications(prev => [fullNotification, ...prev.slice(0, MAX_NOTIFICATIONS - 1)]);

    const duration = notification.duration ?? (
      notification.type === 'success' || notification.type === 'info'
        ? DEFAULT_SUCCESS_INFO_DURATION
        : undefined
    );

    if (duration) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, [removeNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
