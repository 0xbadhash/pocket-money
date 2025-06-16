import React, { useState } from 'react';
import type { MatrixKanbanCategory } from '../../types';
import { useChoresContext } from '../../contexts/ChoresContext';

interface CategoryChangeModalProps {
  isVisible: boolean;
  onClose: () => void;
  selectedInstanceIds: string[];
  onActionSuccess: () => void; // Renamed from onConfirm, signals successful action attempt
  // Typically, categories would be the fixed MatrixKanbanCategory values
  categories?: MatrixKanbanCategory[];
}

// Basic styling (can be moved to a CSS file or use a global modal style)
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1050,
};
const modalContentStyle: React.CSSProperties = {
  background: 'white', padding: '20px', borderRadius: '5px',
  minWidth: '300px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
};
const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #bbb',
  borderRadius: '4px',
  cursor: 'pointer',
  marginRight: '5px',
  marginBottom: '5px',
};

const CategoryChangeModal: React.FC<CategoryChangeModalProps> = ({
  isVisible,
  onClose,
  selectedInstanceIds,
  onActionSuccess,
  categories = ['TO_DO', 'IN_PROGRESS', 'COMPLETED'], // Default to standard categories
}) => {
  const [selectedCategoryInternal, setSelectedCategoryInternal] = useState<MatrixKanbanCategory | null>(null);
  const { batchUpdateChoreInstancesCategory } = useChoresContext();

  if (!isVisible) {
    return null;
  }

  const handleConfirmClick = async () => {
    if (!selectedCategoryInternal) {
      alert('Please select a category.'); // Or disable confirm button
      return;
    }
    if (selectedInstanceIds.length === 0) {
      alert('No chores selected.'); // Should ideally not happen if modal is opened correctly
      onClose(); // Close modal if no items
      return;
    }
    try {
      await batchUpdateChoreInstancesCategory(selectedInstanceIds, selectedCategoryInternal);
      onActionSuccess(); // Signal success to parent for feedback/clearing selection
    } catch (error) {
      console.error("Failed to batch update chore categories:", error);
      alert("Failed to update categories. Please try again.");
      // Optionally, don't call onActionSuccess or onClose if there's an error,
      // or pass error details back. For now, keeping it simple.
    }
    onClose(); // Close the modal
  };

  const handleCategorySelect = (category: MatrixKanbanCategory) => {
    setSelectedCategoryInternal(category);
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="category-change-modal-title">
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <h4 id="category-change-modal-title">Select New Swimlane/Category</h4>
        <div style={{ marginBottom: '15px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              style={{
                ...buttonStyle,
                backgroundColor: selectedCategoryInternal === cat ? '#4CAF50' : '#f0f0f0',
                color: selectedCategoryInternal === cat ? 'white' : 'black',
              }}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button
            onClick={onClose}
            style={{ ...buttonStyle, backgroundColor: '#eee' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmClick}
            style={{ ...buttonStyle, backgroundColor: '#2196F3', color: 'white' }}
            disabled={!selectedCategoryInternal || selectedInstanceIds.length === 0}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CategoryChangeModal);
