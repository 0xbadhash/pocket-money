import React, { useState } from 'react';
import type { Kid } from '../../types';

interface KidAssignmentModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (targetKidId: string | null) => void;
  kids: Kid[];
}

// Basic styling
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
  marginTop: '10px',
};
const selectStyle: React.CSSProperties = {
  padding: '8px',
  marginBottom: '10px',
  width: '100%',
  border: '1px solid #ccc',
  borderRadius: '4px',
};


const KidAssignmentModal: React.FC<KidAssignmentModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
  kids,
}) => {
  const [selectedKid, setSelectedKid] = useState<string>(""); // Store ID or "UNASSIGNED"

  if (!isVisible) {
    return null;
  }

  const handleConfirm = () => {
    if (selectedKid === "") { // No selection made
        onClose(); // Or show an alert: "Please select an option"
        return;
    }
    onConfirm(selectedKid === "UNASSIGNED" ? null : selectedKid);
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="kid-assignment-modal-title">
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <h4 id="kid-assignment-modal-title">Assign to Kid</h4>
        <select
          value={selectedKid}
          onChange={(e) => setSelectedKid(e.target.value)}
          style={selectStyle}
        >
          <option value="" disabled>Select a Kid or Unassign</option>
          {kids.map(kid => (
            <option key={kid.id} value={kid.id}>{kid.name}</option>
          ))}
          <option value="UNASSIGNED">Unassign</option>
        </select>
        <div>
            <button onClick={handleConfirm} style={{...buttonStyle, marginRight: '5px', backgroundColor: '#007bff', color: 'white'}}>
            Confirm
            </button>
            <button onClick={onClose} style={{...buttonStyle, backgroundColor: '#eee'}}>
            Cancel
            </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(KidAssignmentModal);
