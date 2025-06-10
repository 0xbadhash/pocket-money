// src/ui/kanban_components/KanbanCard.tsx
import React from 'react';
import type { ChoreInstance, ChoreDefinition } from '../../types'; // Updated import
import { useChoresContext } from '../../contexts/ChoresContext';

interface KanbanCardProps { // Updated props
  instance: ChoreInstance;
  definition: ChoreDefinition;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ instance, definition }) => { // Updated destructuring
  // Destructure the correct function name from context
  const { toggleChoreInstanceComplete } = useChoresContext();

  // This function still operates on definition as recurrence is defined there
  const formatRecurrenceInfoShort = (def: ChoreDefinition): string | null => {
    if (!def.recurrenceType || def.recurrenceType === null) { // 'none' represented by null
      return null;
    }
    let info = `Repeats ${def.recurrenceType}`;
    if (def.recurrenceEndDate) {
      // Just date part, and ensure recurrenceEndDate is a valid date string
      try {
        info += ` until ${new Date(def.recurrenceEndDate).toISOString().split('T')[0]}`;
      } catch (e) {
        console.warn(`Invalid recurrenceEndDate format for chore definition ${def.id}: ${def.recurrenceEndDate}`);
        info += ` until (invalid date)`;
      }
    }
    return info;
  };

  const recurrenceInfo = formatRecurrenceInfoShort(definition);

  return (
    <div className={`kanban-card ${instance.isComplete ? 'complete' : ''}`}
         style={{
           border: '1px solid #ddd',
           padding: '10px',
           marginBottom: '10px',
           borderRadius: '4px',
           backgroundColor: instance.isComplete ? '#e6ffe6' : '#fff'
         }}>
      <h4>{definition.title}</h4>
      {definition.description && <p style={{ fontSize: '0.9em', color: '#555' }}>{definition.description}</p>}

      {/* Display instanceDate as the effective due date for this instance */}
      <p style={{ fontSize: '0.9em' }}>Due: {instance.instanceDate}</p>

      {definition.rewardAmount && definition.rewardAmount > 0 && <p style={{ fontSize: '0.9em' }}>Reward: ${definition.rewardAmount.toFixed(2)}</p>}

      {recurrenceInfo && <p style={{ fontStyle: 'italic', fontSize: '0.8em', color: '#777' }}>{recurrenceInfo}</p>}

      <p style={{ fontSize: '0.9em' }}>Status: {instance.isComplete ? 'Complete' : 'Incomplete'}</p>
      <button
        onClick={() => toggleChoreInstanceComplete(instance.id)} // Use instance.id
        style={{ padding: '5px 10px', fontSize: '0.9em', cursor: 'pointer' }}>
        {instance.isComplete ? 'Mark Incomplete' : 'Mark Complete'}
      </button>
    </div>
  );
};

export default KanbanCard;
