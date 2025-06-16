// src/contexts/NotificationContext.tsx
import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import type { NotificationMessage } from '../types'; // Assuming NotificationMessage is in types.ts

interface NotificationContextType {
  notifications: NotificationMessage[];
  addNotification: (notification: Omit<NotificationMessage, 'id'>) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const addNotification = useCallback((notification: Omit<NotificationMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const fullNotification = { ...notification, id };
    setNotifications(prev => [fullNotification, ...prev.slice(0, 4)]); // Keep max 5 notifications

    const duration = notification.duration || (notification.type === 'success' || notification.type === 'info' ? 5000 : undefined);

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
