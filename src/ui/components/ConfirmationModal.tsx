import React, { useEffect, useRef } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Confirm',
  cancelButtonText = 'Cancel',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null); // Ref for cancel button

  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusableElements = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => el.offsetParent !== null); // Filter for visible elements

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);


  // Old Escape key handler - replaced by the one in the effect above
  // useEffect(() => {
  //   const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    onConfirm();
    onClose(); // Typically, confirmation also closes the modal
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-message"
      className="confirmation-modal-overlay"
      onClick={onClose} // Close on overlay click
      style={overlayStyles}
    >
      <div
        ref={modalRef}
        className="confirmation-modal-content"
        onClick={(e) => e.stopPropagation()} // Prevent overlay click when clicking content
        style={contentStyles}
      >
        <h2 id="confirmation-modal-title" style={titleStyles}>{title}</h2>
        <p id="confirmation-modal-message" style={messageStyles}>{message}</p>
        <div className="confirmation-modal-actions" style={actionsStyles}>
          <button
            ref={cancelButtonRef} // Assign ref
            onClick={onClose}
            style={{ ...buttonBaseStyles, ...cancelButtonStyles }}
            className="button-secondary"
          >
            {cancelButtonText}
          </button>
          <button
            ref={confirmButtonRef} // Ref already assigned
            onClick={handleConfirm}
            style={{ ...buttonBaseStyles, ...confirmButtonStyles }}
            className="button-primary"
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Basic styling - consider moving to a CSS file for larger applications
// Using CSS variables where appropriate (assuming they are defined in :root or a theme)
const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000, // Ensure it's above other content
  padding: '1rem',
};

const contentStyles: React.CSSProperties = {
  backgroundColor: 'var(--background-color, #fff)',
  padding: '2rem', // Increased padding
  borderRadius: 'var(--border-radius-lg, 8px)', // Larger border radius
  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
  minWidth: '300px',
  maxWidth: '500px',
  textAlign: 'center', // Center align text
};

const titleStyles: React.CSSProperties = {
  marginTop: 0,
  marginBottom: '1rem',
  fontSize: '1.5rem', // Larger title
  color: 'var(--text-color-primary, #333)',
};

const messageStyles: React.CSSProperties = {
  marginBottom: '1.5rem', // Increased margin
  fontSize: '1rem',
  color: 'var(--text-color-secondary, #555)',
  lineHeight: 1.6,
};

const actionsStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end', // Align buttons to the right
  gap: '1rem', // Space between buttons
};

const buttonBaseStyles: React.CSSProperties = {
  padding: '0.75rem 1.5rem', // Larger padding for buttons
  border: 'none',
  borderRadius: 'var(--border-radius-md, 6px)',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: 'bold',
  transition: 'background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
};

const cancelButtonStyles: React.CSSProperties = {
  backgroundColor: 'var(--surface-color-hover, #e9ecef)',
  color: 'var(--text-color-primary, #333)',
};

const confirmButtonStyles: React.CSSProperties = {
  backgroundColor: 'var(--primary-color, #007bff)',
  color: '#fff',
};


export default ConfirmationModal;
