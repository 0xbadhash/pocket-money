import React from 'react';

interface BatchActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onOpenCategoryModal: () => void;
  onOpenKidAssignmentModal: () => void;
  onMarkComplete: () => void;
  onMarkIncomplete: () => void;
}

// Basic styling for the batch actions toolbar (can be moved to a CSS file)
const toolbarStyle: React.CSSProperties = {
  padding: '10px',
  margin: '10px 0',
  backgroundColor: '#f0f0f0',
  border: '1px solid #ccc',
  borderRadius: '4px',
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
  flexWrap: 'wrap', // Allow wrapping on smaller screens
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #bbb',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: '#fff', // Default background for buttons
};


const BatchActionsToolbar: React.FC<BatchActionsToolbarProps> = ({
  selectedCount,
  onClearSelection,
  onOpenCategoryModal,
  onOpenKidAssignmentModal,
  onMarkComplete,
  onMarkIncomplete,
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div style={toolbarStyle} role="toolbar" aria-label="Batch actions">
      <span style={{ marginRight: '10px', fontWeight: 'bold' }}>
        {selectedCount} selected
      </span>
      <button style={buttonStyle} onClick={onOpenKidAssignmentModal}>
        Assign to Kid
      </button>
      <button style={buttonStyle} onClick={onMarkComplete}>
        Mark as Complete
      </button>
      <button style={buttonStyle} onClick={onMarkIncomplete}>
        Mark as Incomplete
      </button>
      <button style={buttonStyle} onClick={onOpenCategoryModal}>
        Change Swimlane
      </button>
      <button style={{...buttonStyle, marginLeft: 'auto' }} onClick={onClearSelection}>
        Clear Selection
      </button>
    </div>
  );
};

export default React.memo(BatchActionsToolbar);
