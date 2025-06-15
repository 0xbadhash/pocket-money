import React from 'react';
import type { MatrixKanbanCategory } from '../../types';

interface CategoryChangeModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (targetCategory: MatrixKanbanCategory) => void;
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
  onConfirm,
  categories = ['TO_DO', 'IN_PROGRESS', 'COMPLETED'], // Default to standard categories
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="category-change-modal-title">
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <h4 id="category-change-modal-title">Select New Swimlane/Category</h4>
        <div>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onConfirm(cat)}
              style={buttonStyle}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{ ...buttonStyle, marginTop: '10px', backgroundColor: '#eee' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default React.memo(CategoryChangeModal);
