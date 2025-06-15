import React, { useState, useEffect, useRef } from 'react';
import type { MatrixKanbanCategory, BatchActionResult } from '../../types'; // Added BatchActionResult
import { useChoresContext } from '../../contexts/ChoresContext';
import { useNotification } from '../../contexts/NotificationContext'; // Import useNotification

interface CategoryChangeModalProps {
  isVisible: boolean;
  onClose: () => void;
  selectedInstanceIds: string[];
  onActionSuccess: () => void; // Renamed from onConfirm, signals successful action attempt
  // Typically, categories would be the fixed MatrixKanbanCategory values
  categories?: MatrixKanbanCategory[];
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
  maxWidth: '500px',
  width: 'auto',
  textAlign: 'left', // Content within this modal might be better left-aligned
};

const titleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: '1.5rem', // More space after title
  fontSize: '1.5rem',
  color: 'var(--text-color-primary, #333)',
  fontWeight: 'bold',
  textAlign: 'center', // Center the title itself
};

const categorySelectionContainerStyle: React.CSSProperties = {
  marginBottom: '1.5rem',
  display: 'flex',
  flexDirection: 'column', // Stack category buttons vertically
  gap: '0.5rem', // Space between category buttons
};

const categoryButtonStyle: React.CSSProperties = {
  padding: '0.75rem 1rem', // Standardized padding
  border: '1px solid var(--border-color, #ccc)', // Use theme border color
  borderRadius: 'var(--border-radius-md, 6px)',
  cursor: 'pointer',
  textAlign: 'center', // Center text within category buttons
  transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
  fontSize: '1rem',
};

const actionsContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '1rem',
  marginTop: '1.5rem',
};

const buttonBaseStyle: React.CSSProperties = { // For Confirm/Cancel
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

const CategoryChangeModal: React.FC<CategoryChangeModalProps> = ({
  isVisible,
  onClose,
  selectedInstanceIds,
  onActionSuccess,
  categories = ['TO_DO', 'IN_PROGRESS', 'COMPLETED'],
}) => {
  const [selectedCategoryInternal, setSelectedCategoryInternal] = useState<MatrixKanbanCategory | null>(null);
  const { batchUpdateChoreInstancesCategory } = useChoresContext();
  const { addNotification } = useNotification(); // Get addNotification
  const modalRef = useRef<HTMLDivElement>(null);
  const firstCategoryButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null); // Fallback focus to cancel button

  useEffect(() => {
    if (isVisible) {
      // Try to focus the first category button, otherwise fallback to cancel button
      if (firstCategoryButtonRef.current) {
        firstCategoryButtonRef.current.focus();
      } else if (cancelButtonRef.current) {
        cancelButtonRef.current.focus();
      }
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
      // Reset selected category when modal becomes visible if it was previously hidden
      setSelectedCategoryInternal(null);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);


  if (!isVisible) {
    return null;
  }

  const handleConfirmClick = async () => {
    if (!selectedCategoryInternal) {
      addNotification({ message: 'Please select a category.', type: 'warning' });
      return;
    }
    if (selectedInstanceIds.length === 0) {
      addNotification({ message: 'No chores selected.', type: 'info' });
      onClose();
      return;
    }
    try {
      const result: BatchActionResult = await batchUpdateChoreInstancesCategory(selectedInstanceIds, selectedCategoryInternal);
      if (result.failedCount > 0) {
        addNotification({
          message: `Successfully changed category for ${result.succeededCount} chore(s). Failed for ${result.failedCount} chore(s).`,
          type: 'warning',
        });
      } else {
        addNotification({ message: `Successfully changed category for ${result.succeededCount} chore(s).`, type: 'success' });
      }
      onActionSuccess(); // This typically clears selection and closes modal in parent
    } catch (error) {
      console.error("Failed to batch update chore categories:", error);
      addNotification({ message: 'Failed to update categories. Please try again.', type: 'error' });
    }
    onClose(); // Ensure modal closes even after notification
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="category-change-modal-title">
      <div ref={modalRef} style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <h2 id="category-change-modal-title" style={titleStyle}>Change Swimlane/Category</h2>
        <div style={categorySelectionContainerStyle}>
          {categories.map((cat, index) => (
            <button
              key={cat}
              ref={index === 0 ? firstCategoryButtonRef : null} // Assign ref to the first category button
              onClick={() => setSelectedCategoryInternal(cat)}
              style={{
                ...categoryButtonStyle,
                backgroundColor: selectedCategoryInternal === cat ? 'var(--primary-color, #007bff)' : 'var(--surface-color, #fff)',
                color: selectedCategoryInternal === cat ? 'var(--button-text-color, #fff)' : 'var(--text-color-primary, #333)',
                borderColor: selectedCategoryInternal === cat ? 'var(--primary-color, #007bff)' : 'var(--border-color, #ccc)',
              }}
              className={selectedCategoryInternal === cat ? "button-primary-active" : "button-outline"}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div style={actionsContainerStyle}>
          <button
            ref={cancelButtonRef} // Assign ref to cancel button
            onClick={onClose}
            style={cancelButtonStyle}
            className="button-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmClick}
            style={confirmButtonStyle}
            disabled={!selectedCategoryInternal || selectedInstanceIds.length === 0}
            className="button-primary"
          >
            Confirm Change
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CategoryChangeModal);
