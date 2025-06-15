import React from 'react';

export type EditScope = 'instance' | 'series';

interface EditScopeModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirmScope: (scope: EditScope) => void;
  fieldName?: string;
  newValue?: any;
}

// Basic styling (can be moved to a CSS file or use a global modal style)
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1060, // Higher z-index if other modals exist
};
const modalContentStyle: React.CSSProperties = {
  background: 'white', padding: '20px', borderRadius: '8px',
  minWidth: '350px', maxWidth: '500px', boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
  textAlign: 'center',
};
const buttonContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-around', // Distribute buttons evenly
  marginTop: '20px',
  gap: '10px', // Add some space between buttons
};
const buttonStyle: React.CSSProperties = {
  padding: '10px 15px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  cursor: 'pointer',
  flex: 1, // Allow buttons to grow and share space
};

const EditScopeModal: React.FC<EditScopeModalProps> = ({
  isVisible,
  onClose,
  onConfirmScope,
  fieldName,
  newValue,
}) => {
  if (!isVisible) {
    return null;
  }

  const fieldDisplay = fieldName ? fieldName.replace(/([A-Z])/g, ' $1').toLowerCase() : 'the field';
  const valueDisplay = newValue !== undefined && newValue !== null ? `"${String(newValue)}"` : 'the new value';

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="edit-scope-modal-title">
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <h3 id="edit-scope-modal-title" style={{ marginTop: 0, marginBottom: '15px' }}>Confirm Edit Scope</h3>
        <p>
          You've edited {fieldDisplay} to {valueDisplay}. Apply this change to:
        </p>
        <div style={buttonContainerStyle}>
          <button
            onClick={() => onConfirmScope('instance')}
            style={{ ...buttonStyle, backgroundColor: '#4CAF50', color: 'white' }}
          >
            This instance only
          </button>
          <button
            onClick={() => onConfirmScope('series')}
            style={{ ...buttonStyle, backgroundColor: '#2196F3', color: 'white' }}
          >
            This and all future instances
          </button>
        </div>
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={onClose}
            style={{ ...buttonStyle, backgroundColor: '#f0f0f0', width: 'calc(50% - 5px)' }} // Make cancel button take half width approx
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(EditScopeModal);
