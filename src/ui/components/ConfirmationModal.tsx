import React, { useEffect, useRef } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Escape key press for closing the modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus trapping and initial focus
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Set initial focus to the cancel button or confirm button
      cancelButtonRef.current?.focus();

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const handleTabKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          if (event.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
              lastElement.focus();
              event.preventDefault();
            }
          } else { // Tab
            if (document.activeElement === lastElement) {
              firstElement.focus();
              event.preventDefault();
            }
          }
        }
      };

      modalRef.current.addEventListener('keydown', handleTabKeyPress);
      return () => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        modalRef.current?.removeEventListener('keydown', handleTabKeyPress);
      };
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const titleId = 'confirmation-modal-title';
  const messageId = 'confirmation-modal-message';

  return (
    <div
      className="confirmation-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000, // Ensure it's on top
      }}
      onClick={onClose} // Close on overlay click
    >
      <div
        ref={modalRef}
        className="confirmation-modal-content"
        style={{
          background: 'var(--background-color, #fff)',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
          maxWidth: '500px',
          width: '90%',
          color: 'var(--text-color, #333)',
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
      >
        <div className="confirmation-modal-header" style={{ marginBottom: '15px' }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: '1.5em' }}>{title}</h2>
        </div>
        <div id={messageId} className="confirmation-modal-body" style={{ marginBottom: '20px', fontSize: '1em', lineHeight: 1.5 }}>
          {typeof message === 'string' ? <p style={{margin: 0}}>{message}</p> : message}
        </div>
        <div className="confirmation-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            style={{
              padding: '10px 15px',
              borderRadius: '5px',
              border: '1px solid var(--border-color, #ccc)',
              background: 'var(--button-secondary-bg, #f0f0f0)',
              color: 'var(--button-secondary-text, #333)',
              cursor: 'pointer',
            }}
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            style={{
              padding: '10px 15px',
              borderRadius: '5px',
              border: 'none',
              background: 'var(--primary-color, #007bff)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

/*
// Basic Example Usage:
import { useState } from 'react';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);
  const handleConfirm = () => {
    console.log('Action confirmed!');
    setIsModalOpen(false);
  };

  return (
    <div>
      <button onClick={handleOpenModal}>Open Confirmation Modal</button>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirm}
        title="Confirm Deletion"
        message={
          <>
            Are you sure you want to delete this item?
            <br />
            <strong>This action cannot be undone.</strong>
          </>
        }
        confirmText="Yes, Delete"
        cancelText="No, Keep it"
      />
    </div>
  );
}
*/
