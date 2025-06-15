import React, { useState, useEffect } from 'react';
import type { Kid } from '../../types';
import { useUserContext } from '../../contexts/UserContext';
import { useChoresContext } from '../../contexts/ChoresContext';

interface KidAssignmentModalProps {
  isVisible: boolean;
  onClose: () => void;
  selectedDefinitionIds: string[];
  onActionSuccess: () => void; // Renamed from onConfirm
  // kids prop removed, will be fetched from UserContext
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
  selectedDefinitionIds,
  onActionSuccess,
}) => {
  const { user } = useUserContext();
  const { batchAssignChoreDefinitionsToKid } = useChoresContext();
  const [selectedKidIdInternal, setSelectedKidIdInternal] = useState<string>(""); // Store ID or "UNASSIGNED"

  const kidsList = user?.kids || [];

  // Reset internal state when modal visibility changes (e.g., when it's opened)
  useEffect(() => {
    if (isVisible) {
      setSelectedKidIdInternal(""); // Reset selection when modal becomes visible
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const handleConfirmClick = async () => {
    if (selectedKidIdInternal === "") {
      alert('Please select an option.'); // Or disable confirm button
      return;
    }
    if (selectedDefinitionIds.length === 0) {
      alert('No chores selected to assign.'); // Should ideally not happen
      onClose();
      return;
    }

    const targetKidId = selectedKidIdInternal === "UNASSIGNED" ? null : selectedKidIdInternal;

    try {
      await batchAssignChoreDefinitionsToKid(selectedDefinitionIds, targetKidId);
      onActionSuccess(); // Signal success to parent
    } catch (error) {
      console.error("Failed to batch assign chore definitions:", error);
      alert("Failed to assign chores. Please try again.");
    }
    onClose(); // Close the modal
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="kid-assignment-modal-title">
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <h4 id="kid-assignment-modal-title">Assign to Kid</h4>
        <select
          value={selectedKidIdInternal}
          onChange={(e) => setSelectedKidIdInternal(e.target.value)}
          style={selectStyle}
        >
          <option value="" disabled>Select a Kid or Unassign</option>
          {kidsList.map(kid => (
            <option key={kid.id} value={kid.id}>{kid.name}</option>
          ))}
          <option value="UNASSIGNED">Unassign</option>
        </select>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={handleConfirmClick} style={{...buttonStyle, backgroundColor: '#007bff', color: 'white'}} disabled={selectedKidIdInternal === "" || selectedDefinitionIds.length === 0}>
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
