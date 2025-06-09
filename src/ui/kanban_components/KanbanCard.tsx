// src/ui/kanban_components/KanbanCard.tsx
import React from 'react';
import type { Chore } from '../../types';
import { useChoresContext } from '../../contexts/ChoresContext';

interface KanbanCardProps {
  chore: Chore;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ chore }) => {
  const { toggleChoreComplete } = useChoresContext();

  // Simplified recurrence info for card view - can be expanded later
  const formatRecurrenceInfoShort = (c: Chore): string | null => {
    if (!c.recurrenceType || c.recurrenceType === 'none' || c.recurrenceType === null) {
      return null;
    }
    let info = `Repeats ${c.recurrenceType}`;
    if (c.recurrenceEndDate) {
      info += ` until ${c.recurrenceEndDate.split('T')[0]}`; // Just date part
    }
    return info;
  };

  const recurrenceInfo = formatRecurrenceInfoShort(chore);

  return (
    <div className={`kanban-card ${chore.isComplete ? 'complete' : ''}`}
         style={{
           border: '1px solid #ddd',
           padding: '10px',
           marginBottom: '10px',
           borderRadius: '4px',
           backgroundColor: chore.isComplete ? '#e6ffe6' : '#fff'
         }}>
      <h4>{chore.title}</h4>
      {chore.description && <p style={{ fontSize: '0.9em', color: '#555' }}>{chore.description}</p>}
      {/* Assigned to is implicit in the kid's board view */}
      {chore.dueDate && <p style={{ fontSize: '0.9em' }}>Due: {chore.dueDate.split('T')[0]}</p>}
      {chore.rewardAmount && <p style={{ fontSize: '0.9em' }}>Reward: ${chore.rewardAmount.toFixed(2)}</p>}

      {recurrenceInfo && <p style={{ fontStyle: 'italic', fontSize: '0.8em', color: '#777' }}>{recurrenceInfo}</p>}

      <p style={{ fontSize: '0.9em' }}>Status: {chore.isComplete ? 'Complete' : 'Incomplete'}</p>
      <button
        onClick={() => toggleChoreComplete(chore.id)}
        style={{ padding: '5px 10px', fontSize: '0.9em', cursor: 'pointer' }}>
        {chore.isComplete ? 'Mark Incomplete' : 'Mark Complete'}
      </button>
    </div>
  );
};

export default KanbanCard;
