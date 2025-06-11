/**
 * @file KanbanCard.tsx
 * Represents a single chore card within a Kanban column.
 * Displays chore details, sub-tasks, recurrence info, and provides interaction
 * for marking chores/sub-tasks as complete. It's also a draggable item via dnd-kit.
 */
import React from 'react';
import type { ChoreInstance, ChoreDefinition } from '../../types';
import { useChoresContext } from '../../contexts/ChoresContext';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * @interface KanbanCardProps
 * Props for the KanbanCard component.
 */
interface KanbanCardProps {
  /** The specific instance of the chore to display. */
  instance: ChoreInstance;
  /** The definition (template) of the chore. */
  definition: ChoreDefinition;
  // isOverlay?: boolean; // Optional prop if card needs different style in DragOverlay
}

/**
 * KanbanCard component.
 * Renders the visual representation of a chore instance.
 * It displays details such as title, description, reward, tags, sub-tasks, and recurrence.
 * Provides controls to mark the chore or its sub-tasks as complete.
 * Integrated with dnd-kit to be a sortable (draggable) item.
 * @param {KanbanCardProps} props - The component props.
 * @returns {JSX.Element} The KanbanCard UI.
 */
const KanbanCard: React.FC<KanbanCardProps> = ({ instance, definition /*, isOverlay = false */ }) => {
  const { toggleChoreInstanceComplete, toggleSubTaskComplete } = useChoresContext();

  /**
   * Props from `useSortable` hook (dnd-kit) to make the card draggable.
   * Includes attributes for ARIA, listeners for drag events, and refs.
   */
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: instance.id });

  /**
   * Dynamic style object for the card, primarily for dnd-kit transformations.
   * Applies CSS transform for movement, transition for animation, and opacity change during drag.
   */
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    // zIndex: isDragging ? 100 : (isOverlay ? 100 : 'auto'), // Example for overlay z-index
    // cursor: isDragging ? 'grabbing' : 'grab',
    // Add other styles if needed, e.g., enhanced shadow if isOverlay
    // boxShadow: isOverlay ? '0 8px 16px rgba(0,0,0,0.2)' : undefined,
  };

  /**
   * Formats recurrence information for display on the card.
   * @param {ChoreDefinition} def - The chore definition containing recurrence rules.
   * @returns {string | null} A formatted string describing the recurrence, or null if not recurrent.
   */
  const formatRecurrenceInfoShort = (def: ChoreDefinition): string | null => {
    if (!def.recurrenceType || def.recurrenceType === null) {
      return null; // 'none' or not set
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
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`kanban-card ${instance.isComplete ? 'complete' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      {/* Original inline styles like border, padding, marginBottom, borderRadius, backgroundColor are now handled by src/styles.css */}
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

      {definition.description && <p style={{ fontSize: '0.9em', color: 'var(--text-color-secondary)' }}>{definition.description}</p>}

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

      {recurrenceInfo && <p style={{ fontStyle: 'italic', fontSize: '0.8em', color: 'var(--text-color-secondary)' }}>{recurrenceInfo}</p>}

      <p style={{ fontSize: '0.9em' }}>Status: {instance.isComplete ? 'Complete' : 'Incomplete'}</p>
      <button
        onClick={() => toggleChoreInstanceComplete(instance.id)} // Use instance.id
        style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', fontSize: '0.9em', cursor: 'pointer' }}
        className="button-secondary" // Example: Assuming a secondary button style might exist or be added
      >
        {instance.isComplete ? 'Mark Incomplete' : 'Mark Complete'}
      </button>
    </div>
  );
};

export default KanbanCard;
