import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import type { NotificationMessage } from '../types';

interface NotificationContextType {
  notifications: NotificationMessage[];
  addNotification: (notification: Omit<NotificationMessage, 'id'>) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.filter(notification => notification.id !== id)
    );
  }, []);

  const addNotification = useCallback(
    (notification: Omit<NotificationMessage, 'id'>) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9); // More robust ID
      const newNotification = { ...notification, id };

      setNotifications(prevNotifications => [newNotification, ...prevNotifications]);

      if (notification.duration) {
        setTimeout(() => {
          removeNotification(id);
        }, notification.duration);
      } else if (notification.type === 'success' || notification.type === 'info') {
        // Default auto-dismiss for success/info messages after 5 seconds
        setTimeout(() => {
          removeNotification(id);
        }, 5000);
      }
      // Error and warning messages persist by default unless a duration is specified
    },
    [removeNotification]
  );

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
