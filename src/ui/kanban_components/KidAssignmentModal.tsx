import React, { useState, useEffect, useRef } from 'react';
import type { Kid, BatchActionResult } from '../../types'; // Added BatchActionResult
import { useUserContext } from '../../contexts/UserContext';
import { useChoresContext } from '../../contexts/ChoresContext';
import { useNotification } from '../../contexts/NotificationContext'; // Import useNotification

interface KidAssignmentModalProps {
  isVisible: boolean;
  onClose: () => void;
  selectedDefinitionIds: string[];
  onActionSuccess: () => void; // Renamed from onConfirm
  // kids prop removed, will be fetched from UserContext
}

// Consistent styling based on ConfirmationModal
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1050,
  padding: '1rem',
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--background-color, #fff)',
  padding: '2rem',
  borderRadius: 'var(--border-radius-lg, 8px)',
  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
  minWidth: '300px',
  maxWidth: '400px', // Slightly smaller max-width for this simpler modal
  width: 'auto',
  textAlign: 'left', // Content (select) is better left-aligned
};

const titleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: '1.5rem',
  fontSize: '1.5rem',
  color: 'var(--text-color-primary, #333)',
  fontWeight: 'bold',
  textAlign: 'center', // Center the title
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem', // Consistent padding
  marginBottom: '1.5rem', // Space after select
  border: '1px solid var(--border-color, #ccc)',
  borderRadius: 'var(--border-radius-md, 6px)',
  backgroundColor: 'var(--surface-color, #fff)', // Theme background
  color: 'var(--text-color-primary, #333)', // Theme text color
  fontSize: '1rem',
  boxSizing: 'border-box', // Ensure padding doesn't expand it beyond 100%
};

const actionsContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '1rem',
  marginTop: '1.5rem', // Ensure space if there were elements above
};

const buttonBaseStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  border: 'none',
  borderRadius: 'var(--border-radius-md, 6px)',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: 'bold',
  transition: 'background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
};

const cancelButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: 'var(--surface-color-hover, #e9ecef)',
  color: 'var(--text-color-primary, #333)',
};

const confirmButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: 'var(--primary-color, #007bff)',
  color: 'var(--button-text-color, #fff)',
};


const KidAssignmentModal: React.FC<KidAssignmentModalProps> = ({
  isVisible,
  onClose,
  selectedDefinitionIds,
  onActionSuccess,
}) => {
  const { user } = useUserContext();
  const { batchAssignChoreDefinitionsToKid } = useChoresContext();
  const { addNotification } = useNotification(); // Get addNotification
  const [selectedKidIdInternal, setSelectedKidIdInternal] = useState<string>("");
  const modalRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null); // Ref for the select element

  const kidsList = user?.kids || [];

  useEffect(() => {
    if (isVisible && selectRef.current) {
      selectRef.current.focus();
      setSelectedKidIdInternal(""); // Reset selection when modal becomes visible
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

  const handleConfirmClick = async () => {
    if (selectedKidIdInternal === "") {
      addNotification({ message: 'Please select an option.', type: 'warning' });
      return;
    }
    if (selectedDefinitionIds.length === 0) {
      addNotification({ message: 'No chores selected to assign.', type: 'info' });
      onClose();
      return;
    }
    const targetKidId = selectedKidIdInternal === "UNASSIGNED" ? null : selectedKidIdInternal;
    const kidName = kidsList.find(k => k.id === targetKidId)?.name || (targetKidId === null ? "Unassigned" : "Selected Kid");

    try {
      const result: BatchActionResult = await batchAssignChoreDefinitionsToKid(selectedDefinitionIds, targetKidId);
      if (result.failedCount > 0) {
        addNotification({
          message: `Successfully assigned ${result.succeededCount} chore(s) to ${kidName}. Failed for ${result.failedCount}.`,
          type: 'warning',
        });
      } else {
        addNotification({ message: `Successfully assigned ${result.succeededCount} chore(s) to ${kidName}.`, type: 'success' });
      }
      onActionSuccess();
    } catch (error) {
      console.error("Failed to batch assign chore definitions:", error);
      addNotification({ message: 'Failed to assign chores. Please try again.', type: 'error' });
    }
    onClose();
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="kid-assignment-modal-title">
      <div ref={modalRef} style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <h2 id="kid-assignment-modal-title" style={titleStyle}>Assign Chores to Kid</h2>
        <select
          ref={selectRef} // Assign ref
          value={selectedKidIdInternal}
          onChange={(e) => setSelectedKidIdInternal(e.target.value)}
          style={selectStyle}
          aria-label="Select Kid to assign chores to"
        >
          <option value="" disabled>Select a Kid or Unassign</option>
          {kidsList.map(kid => (
            <option key={kid.id} value={kid.id}>{kid.name}</option>
          ))}
          <option value="UNASSIGNED">Unassign Chores</option>
        </select>
        <div style={actionsContainerStyle}>
          <button
            onClick={onClose}
            style={cancelButtonStyle}
            className="button-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmClick}
            style={confirmButtonStyle}
            disabled={selectedKidIdInternal === "" || selectedDefinitionIds.length === 0}
            className="button-primary"
          >
            Confirm Assignment
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(KidAssignmentModal);
