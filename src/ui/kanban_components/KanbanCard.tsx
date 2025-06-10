// src/ui/kanban_components/KanbanCard.tsx
import React from 'react';
import type { ChoreInstance, ChoreDefinition } from '../../types'; // Updated import
import { useChoresContext } from '../../contexts/ChoresContext';

interface KanbanCardProps { // Updated props
  instance: ChoreInstance;
  definition: ChoreDefinition;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ instance, definition }) => {
  // Destructure the correct function name from context
  const { toggleChoreInstanceComplete, toggleSubTaskComplete } = useChoresContext(); // Added toggleSubTaskComplete

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

      {/* Progress Indicator */}
      {definition.subTasks && definition.subTasks.length > 0 && (() => {
        const completedCount = definition.subTasks.filter(st => st.isComplete).length;
        const progressPercent = (definition.subTasks.length > 0) ? (completedCount / definition.subTasks.length) * 100 : 0;

        return (
          <div className="progress-indicator-container" style={{ margin: '8px 0' }}>
            <div
              className="progress-bar-outline"
              title={`Progress: ${Math.round(progressPercent)}% (${completedCount}/${definition.subTasks.length})`}
              style={{
                backgroundColor: 'var(--surface-color-hover, #e9ecef)',
                borderRadius: '4px',
                padding: '2px',
                height: '12px', // Height of the outline includes padding
                boxSizing: 'border-box'
              }}
            >
              <div
                className="progress-bar-fill"
                style={{
                  width: `${progressPercent}%`,
                  height: '100%', // Fill the padded height of outline
                  backgroundColor: 'var(--success-color, #28a745)',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease-in-out' // Smooth transition for width change
                }}
              />
            </div>
            {/* Optional: Text percentage - can be added if desired */}
            {/* <span style={{ fontSize: '0.75em', marginLeft: '5px', color: 'var(--text-color-secondary)' }}>
              {Math.round(progressPercent)}%
            </span> */}
          </div>
        );
      })()}

      {definition.description && <p style={{ fontSize: '0.9em', color: '#555' }}>{definition.description}</p>}

      {/* Display instanceDate as the effective due date for this instance */}
      <p style={{ fontSize: '0.9em' }}>Due: {instance.instanceDate}</p>

      {definition.rewardAmount && definition.rewardAmount > 0 && <p style={{ fontSize: '0.9em' }}>Reward: ${definition.rewardAmount.toFixed(2)}</p>}

      {/* Display Tags */}
      {definition.tags && definition.tags.length > 0 && (
        <div className="chore-tags-container" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {definition.tags.map(tag => (
            <span
              key={tag}
              className="chore-tag"
              // Basic inline styles for now, will be enhanced by CSS class in next step
              style={{
                backgroundColor: '#e0e0e0',
                color: '#333',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '0.8em'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Display Sub-tasks */}
      {definition.subTasks && definition.subTasks.length > 0 && (
        <div className="sub-tasks-list" style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
          <h5 style={{ fontSize: '0.9em', marginBottom: '5px', color: '#666', marginTop: '0' }}>Sub-tasks:</h5>
          {definition.subTasks.map(subTask => (
            <div
              key={subTask.id}
              className="sub-task"
              style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}
            >
              <input
                type="checkbox"
                id={`subtask-${definition.id}-${subTask.id}`}
                checked={subTask.isComplete}
                onChange={() => toggleSubTaskComplete(definition.id, subTask.id)}
                style={{ marginRight: '8px', cursor: 'pointer' }}
              />
              <label
                htmlFor={`subtask-${definition.id}-${subTask.id}`}
                style={{
                  fontSize: '0.85em',
                  textDecoration: subTask.isComplete ? 'line-through' : 'none',
                  color: subTask.isComplete ? 'var(--text-color-secondary, #555)' : 'var(--text-color, #333)',
                  cursor: 'pointer'
                }}
              >
                {subTask.title}
              </label>
            </div>
          ))}
        </div>
      )}

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
