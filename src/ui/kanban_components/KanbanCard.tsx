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
  /** Optional flag indicating if the card is being rendered in a DragOverlay. Defaults to false. */
  isOverlay?: boolean;
  /** Optional callback for editing the chore. */
  onEditChore?: (chore: ChoreDefinition) => void;
  /** Optional callback for subtask click events. */
  onSubtaskClick?: (subtaskId: string) => void;
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
const KanbanCard: React.FC<KanbanCardProps> = ({
  instance,
  definition,
  isOverlay = false,
  onEditChore,
  onSubtaskClick,
}) => {
  const { toggleChoreInstanceComplete, toggleSubtaskCompletionOnInstance } = useChoresContext();

  /**
   * Props from `useSortable` hook (dnd-kit) to make the card draggable.
   * Includes attributes for ARIA, listeners for drag events, and refs.
   * The `isDragging` property indicates if this specific sortable item is currently being dragged.
   * Note: When using `DragOverlay`, the original item remains in place but `isDragging` will be true.
   * The `DragOverlay` renders a separate instance of the card (often with `isOverlay={true}`).
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
   * Applies CSS transform for movement, transition for animation.
   * Opacity is reduced for the original item when it's being dragged and an overlay is shown.
   * The `isOverlay` prop can be used to apply distinct styles to the card when rendered in `DragOverlay`.
   */
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.4 : 1, // Make original item more transparent if not the overlay itself
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
      className={`kanban-card ${instance.isComplete ? 'complete' : ''} ${isDragging && !isOverlay ? 'dragging' : ''} ${isOverlay ? 'is-overlay' : ''}`}
    >
      <h4>{definition.title}</h4>

      {definition.subTasks && definition.subTasks.length > 0 && (() => {
        // Calculate progress based on instance.subtaskCompletions
        const completedCount = definition.subTasks.filter(st => !!instance.subtaskCompletions?.[st.id]).length;
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
                height: '12px',
                boxSizing: 'border-box'
              }}
            >
              {/**
               * The visual fill of the progress bar.
               * Includes ARIA attributes for accessibility:
               * - `role="progressbar"`: Semantically identifies the element as a progress bar.
               * - `aria-valuenow`: Current percentage of progress.
               * - `aria-valuemin`/`aria-valuemax`: Defines the range of the progress bar.
               * - `aria-label`: Provides an accessible name for the progress bar state.
               * The `title` attribute on the parent `progress-bar-outline` also provides this info on hover.
               */}
              <div
                className="progress-bar-fill"
                role="progressbar"
                aria-valuenow={Math.round(progressPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progress: ${Math.round(progressPercent)}%`} // Or use aria-labelledby with a hidden element
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  backgroundColor: 'var(--secondary-color-positive, #28a745)', // Using positive color
                  borderRadius: '2px',
                  transition: 'width 0.3s ease-in-out'
                }}
              />
            </div>
          </div>
        );
      })()}

      {definition.description && <p style={{ fontSize: '0.9em', color: 'var(--text-color-secondary)' }}>{definition.description}</p>}
      <p style={{ fontSize: '0.9em' }}>Due: {instance.instanceDate}</p>
      {definition.rewardAmount && definition.rewardAmount > 0 && <p style={{ fontSize: '0.9em' }}>Reward: ${definition.rewardAmount.toFixed(2)}</p>}

      {definition.tags && definition.tags.length > 0 && (
        <div className="chore-tags-container" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {definition.tags.map(tag => (
            <span key={tag} className="chore-tag" style={{ backgroundColor: 'var(--primary-color-light, #e0e0e0)', color: 'var(--text-color-primary, #333)', padding: '2px 6px', borderRadius: '3px', fontSize: '0.8em' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {definition.subTasks && definition.subTasks.length > 0 && (
        <div
          className="sub-tasks-list"
          // Keyed with instance-specific subtask completion states to ensure this section re-renders
          // when any subtask's 'isComplete' status changes for this particular instance.
          key={definition.subTasks.map(st => `${st.id}:${!!instance.subtaskCompletions?.[st.id]}`).join(',')}
          style={{ marginTop: '10px', borderTop: '1px solid var(--border-color, #eee)', paddingTop: '8px' }}
        >
          <h5 style={{ fontSize: '0.9em', marginBottom: '5px', color: 'var(--text-color-secondary, #666)', marginTop: '0' }}>Sub-tasks:</h5>
          {definition.subTasks.map(subTask => {
            const isChecked = !!instance.subtaskCompletions?.[subTask.id];
            return (
              <div key={subTask.id} className="sub-task" style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                <input
                  type="checkbox"
                  id={`subtask-${instance.id}-${subTask.id}`} // Ensure unique ID using instance.id
                  checked={isChecked}
                  onChange={() => toggleSubtaskCompletionOnInstance(instance.id, subTask.id)}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                <label htmlFor={`subtask-${instance.id}-${subTask.id}`} style={{ fontSize: '0.85em', textDecoration: isChecked ? 'line-through' : 'none', color: isChecked ? 'var(--text-color-secondary, #555)' : 'var(--text-color-primary, #333)', cursor: 'pointer' }}>
                  {subTask.title}
                </label>
              </div>
            );
          })}
        </div>
      )}

      {recurrenceInfo && <p style={{ fontStyle: 'italic', fontSize: '0.8em', color: 'var(--text-color-secondary)' }}>{recurrenceInfo}</p>}
      <p style={{ fontSize: '0.9em' }}>Status: {instance.isComplete ? 'Complete' : 'Incomplete'}</p>
      <button onClick={() => toggleChoreInstanceComplete(instance.id)} style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', fontSize: '0.9em', cursor: 'pointer' }} className="button-secondary">
        {instance.isComplete ? 'Mark Incomplete' : 'Mark Complete'}
      </button>

      {onEditChore && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onEditChore(definition);
          }}
          style={{ marginTop: 6, fontSize: '0.9em' }}
          className="button-edit"
        >
          Edit
        </button>
      )}
    </div>
  );
};

export default KanbanCard;
