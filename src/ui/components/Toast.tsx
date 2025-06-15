import React, { useEffect } from 'react';
import type { NotificationMessage } from '../../types';

interface ToastProps {
  notification: NotificationMessage;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onDismiss }) => {
  const { id, message, type, duration } = notification;

  useEffect(() => {
    // This effect handles the case where duration might be set externally
    // but NotificationContext also has its own timer.
    // To simplify, NotificationContext's timer is primary.
    // If a Toast component were to manage its own lifecycle independently of context,
    // this is where its timer logic would go.
    // For now, relying on context's timer.
  }, [id, duration, onDismiss]);

  const baseStyle: React.CSSProperties = {
    padding: '1rem',
    margin: '0.5rem',
    borderRadius: 'var(--border-radius-md, 6px)',
    color: 'var(--button-text-color, #fff)',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minWidth: '250px',
    maxWidth: '350px',
    opacity: 0.95,
    transition: 'opacity 0.3s ease-in-out', // For potential future animations
  };

  const typeStyles: Record<NotificationMessage['type'], React.CSSProperties> = {
    success: { backgroundColor: 'var(--success-color, #28a745)' },
    error: { backgroundColor: 'var(--danger-color, #dc3545)' },
    info: { backgroundColor: 'var(--info-color, #17a2b8)' },
    warning: { backgroundColor: 'var(--warning-color, #ffc107)', color: 'var(--text-color-primary, #212529)' }, // Warning often needs dark text
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'inherit', // Inherits color from parent (which is set by type)
    fontSize: '1.2rem',
    cursor: 'pointer',
    marginLeft: '1rem',
    padding: '0.25rem',
    lineHeight: '1',
  };

  return (
    <div style={{ ...baseStyle, ...typeStyles[type] }} role="alert" aria-live={type === 'error' ? 'assertive' : 'polite'}>
      <span>{message}</span>
      <button
        onClick={() => onDismiss(id)}
        style={closeButtonStyle}
        aria-label="Dismiss notification"
      >
        &times;
      </button>
    </div>
  );
};

export default Toast;
