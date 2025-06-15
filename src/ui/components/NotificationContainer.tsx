import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import Toast from './Toast';

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '1rem', // 16px from top
    right: '1rem', // 16px from right
    zIndex: 2000, // Ensure it's above most other content, including modals (often 1000-1060)
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem', // Space between toasts
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      style={containerStyle}
      aria-live="polite" // Announce changes to screen readers
      aria-atomic="true"   // Announce the entire region when a change occurs
      // aria-relevant="additions text" // Be more specific about what to announce (optional)
    >
      {notifications.map(notification => (
        <Toast
          key={notification.id}
          notification={notification}
          onDismiss={removeNotification}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
