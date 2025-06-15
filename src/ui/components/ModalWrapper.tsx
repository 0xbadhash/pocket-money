import React, { useEffect, useRef, useCallback } from 'react';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null); // Ref for the 'X' close button

  const titleId = `modal-title-${Math.random().toString(36).substring(2, 9)}`;

  // Handle Escape key press
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
      // Set initial focus to the close button or the first focusable element
      closeButtonRef.current?.focus();

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length === 0) return; // No focusable elements

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

  return (
    <div
      className="modal-overlay"
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
        zIndex: 1000, // Standard z-index for modals
      }}
      onClick={onClose} // Close on overlay click
    >
      <div
        ref={modalRef}
        className={`modal-content ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: 'var(--surface-color, #fff)',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh', // Prevent modal from being too tall
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--text-color, #333)',
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <div
          className="modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color, #eee)',
            paddingBottom: '10px',
            marginBottom: '15px',
          }}
        >
          <h3 id={titleId} style={{ margin: 0, fontSize: '1.5em' }}>
            {title}
          </h3>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5em',
              cursor: 'pointer',
              color: 'var(--text-color-secondary, #666)',
              padding: '0 5px',
            }}
          >
            &times;
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            overflowY: 'auto', // Scrollable body if content overflows
            paddingRight: '5px', // For scrollbar spacing if needed
            marginBottom: footer ? '15px' : '0',
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            className="modal-footer"
            style={{
              borderTop: '1px solid var(--border-color, #eee)',
              paddingTop: '15px',
              marginTop: 'auto', // Pushes footer to bottom if body is short
              display: 'flex',
              justifyContent: 'flex-end', // Default alignment for footer buttons
              gap: '10px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalWrapper;

/*
// Example Usage (similar to ConfirmationModal, but more generic):

function MyFeatureComponent() {
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsCustomModalOpen(true)}>Open Custom Modal</button>
      <ModalWrapper
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        title="My Custom Modal"
        footer={
          <>
            <button onClick={() => setIsCustomModalOpen(false)} style={{padding: '8px 12px'}}>Cancel</button>
            <button onClick={() => { alert('Submitted!'); setIsCustomModalOpen(false); }} style={{padding: '8px 12px', background: 'blue', color: 'white'}}>Submit</button>
          </>
        }
      >
        <p>This is the main content of the custom modal.</p>
        <p>You can put any React nodes here, like forms, lists, etc.</p>
        <label htmlFor="myInput">Example input: </label>
        <input type="text" id="myInput" style={{border: '1px solid black', padding: '4px'}}/>
      </ModalWrapper>
    </>
  );
}

*/
