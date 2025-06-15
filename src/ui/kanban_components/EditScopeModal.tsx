import React, { useEffect, useRef } from 'react'; // Import useEffect and useRef

export type EditScope = 'instance' | 'series';

interface EditScopeModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirmScope: (scope: EditScope) => void;
  fieldName?: string;
  newValue?: any;
}

// Consistent styling based on ConfirmationModal
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker overlay
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1050, // Standardized z-index (adjust if conflicts)
  padding: '1rem', // Added padding for smaller screens
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--background-color, #fff)',
  padding: '2rem',
  borderRadius: 'var(--border-radius-lg, 8px)',
  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
  minWidth: '300px',
  maxWidth: '500px', // Consistent max width
  width: 'auto', // Allow shrinking
  textAlign: 'center',
};

const titleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: '1rem',
  fontSize: '1.5rem',
  color: 'var(--text-color-primary, #333)',
  fontWeight: 'bold', // Ensure title is bold
};

const messageStyle: React.CSSProperties = {
  marginBottom: '1.5rem',
  fontSize: '1rem',
  color: 'var(--text-color-secondary, #555)',
  lineHeight: 1.6,
};

const actionsContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column', // Stack main action buttons and cancel
  gap: '0.75rem', // Space between button groups/buttons
  marginTop: '1.5rem', // Space above action buttons
};

const mainActionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between', // Keep original layout for these two
  gap: '1rem',
};

const buttonBaseStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  border: 'none',
  borderRadius: 'var(--border-radius-md, 6px)',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: 'bold',
  transition: 'background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  flex: 1, // Allow buttons in mainActionsStyle to take equal width
};

const confirmInstanceButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: 'var(--primary-color, #007bff)', // Primary button style
  color: 'var(--button-text-color, #fff)',
};

const confirmSeriesButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: 'var(--secondary-color, #6c757d)', // Secondary button style (example)
  color: 'var(--button-text-color, #fff)',
};

const cancelButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: 'var(--surface-color-hover, #e9ecef)',
  color: 'var(--text-color-primary, #333)',
  width: '100%', // Make cancel button full width of its column container
  marginTop: '0.5rem', // A bit of space if needed above cancel row
};

const EditScopeModal: React.FC<EditScopeModalProps> = ({
  isVisible,
  onClose,
  onConfirmScope,
  fieldName,
  newValue,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const instanceButtonRef = useRef<HTMLButtonElement>(null); // Ref for the first interactive element

  useEffect(() => {
    if (isVisible && instanceButtonRef.current) {
      instanceButtonRef.current.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Tab' && modalRef.current && isVisible) {
        const focusableElements = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => el.offsetParent !== null);

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);

  if (!isVisible) {
    return null;
  }

  const fieldDisplay = fieldName ? fieldName.replace(/([A-Z])/g, ' $1').toLowerCase() : 'the field';
  const valueDisplay = newValue !== undefined && newValue !== null ? `"${String(newValue)}"` : 'the new value';

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="edit-scope-modal-title" aria-describedby="edit-scope-modal-message">
      <div ref={modalRef} style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <h2 id="edit-scope-modal-title" style={titleStyle}>Confirm Edit Scope</h2>
        <p id="edit-scope-modal-message" style={messageStyle}>
          You've edited {fieldDisplay} to {valueDisplay}.<br />Apply this change to:
        </p>
        <div style={actionsContainerStyle}>
          <div style={mainActionsStyle}>
            <button
              ref={instanceButtonRef} // Assign ref
              onClick={() => onConfirmScope('instance')}
              style={confirmInstanceButtonStyle}
              className="button-primary"
            >
              This instance only
            </button>
            <button
              onClick={() => onConfirmScope('series')}
              style={confirmSeriesButtonStyle}
              className="button-secondary"
            >
              This and all future instances
            </button>
          </div>
          <button
            onClick={onClose}
            style={cancelButtonStyle}
            className="button-tertiary" // Example class
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(EditScopeModal);
