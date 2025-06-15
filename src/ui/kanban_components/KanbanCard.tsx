/**
 * @file KanbanCard.tsx
 * Represents a single chore card within a Kanban column.
 * Displays chore details, sub-tasks, recurrence info, and provides interaction
 * for marking chores/sub-tasks as complete. It's also a draggable item via dnd-kit.
 */
import React, { useState, useEffect, useRef } from 'react';
import type { ChoreInstance, ChoreDefinition } from '../../types';
import { useChoresContext } from '../../contexts/ChoresContext';
import EditScopeModal from './EditScopeModal'; // Moved import to the top
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
  // onSubtaskClick?: (subtaskId: string) => void; // This prop was not used in the provided code. Removing if not needed.
  isSelected?: boolean;
  onToggleSelection?: (instanceId: string, isSelected: boolean) => void;
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
  isSelected = false,
  onToggleSelection,
}) => {
  const {
    toggleChoreInstanceComplete,
    toggleSubtaskCompletionOnInstance,
    updateChoreDefinition,
    updateChoreInstanceField,
    updateChoreSeries, // Added for series edits
  } = useChoresContext();

  const [isEditingReward, setIsEditingReward] = useState(false);
  const [editingRewardValue, setEditingRewardValue] = useState<string | number>('');
  const rewardInputRef = useRef<HTMLInputElement>(null);

  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editingDateValue, setEditingDateValue] = useState<string>('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  // State for EditScopeModal
  const [isEditScopeModalVisible, setIsEditScopeModalVisible] = useState(false);
  const closeEditScopeModal = () => {
    setIsEditScopeModalVisible(false);
    setPendingEdit(undefined);
  };
  const [pendingEdit, setPendingEdit] = useState<{
    fieldName: 'instanceDate' | 'rewardAmount',
    value: any,
    definitionId: string,
    instanceId: string,
    fromDateForSeries: string // This is the instanceDate of the edited instance
  } | undefined>(undefined);

  const handleConfirmEditScope = async (scope: 'instance' | 'series') => {
    if (!pendingEdit) return;

    const { fieldName, value, definitionId, instanceId, fromDateForSeries } = pendingEdit;

    if (scope === 'instance') {
      if (fieldName === 'instanceDate') {
        await updateChoreInstanceField(instanceId, 'instanceDate', value);
      } else if (fieldName === 'rewardAmount') {
        await updateChoreInstanceField(instanceId, 'overriddenRewardAmount', value);
      }
    } else if (scope === 'series') {
      if (fieldName === 'instanceDate') {
        await updateChoreSeries(definitionId, { dueDate: value }, fromDateForSeries, 'dueDate');
      } else if (fieldName === 'rewardAmount') {
        // For series reward edit, we also clear any instance-specific override on the current instance
        // to ensure it reflects the new series value.
        await updateChoreInstanceField(instanceId, 'overriddenRewardAmount', undefined);
        await updateChoreSeries(definitionId, { rewardAmount: value }, fromDateForSeries, 'rewardAmount');
      }
    }
    // Add any user feedback (e.g., toast notification) here if desired
    closeEditScopeModal();
  };


  // Focus input when editing starts
  useEffect(() => {
    if (isEditingReward && rewardInputRef.current) {
      rewardInputRef.current.focus();
      rewardInputRef.current.select();
    }
  }, [isEditingReward]);

  useEffect(() => {
    if (isEditingDate && dateInputRef.current) {
      dateInputRef.current.focus();
    }
  }, [isEditingDate]);

  const handleEditReward = () => {
    const currentReward = instance.overriddenRewardAmount !== undefined
      ? instance.overriddenRewardAmount
      : definition.rewardAmount;
    setEditingRewardValue(currentReward?.toString() || '0');
    setIsEditingReward(true);
  };

  const handleSaveReward = async () => {
    setIsEditingReward(false);
    const newAmount = parseFloat(editingRewardValue as string);

    if (isNaN(newAmount) || newAmount < 0) {
      console.warn("Invalid reward amount entered.");
      return;
    }

    const currentBaseReward = definition.rewardAmount;
    const currentInstanceOverride = instance.overriddenRewardAmount;

    // If there's an override, compare to that. Otherwise, compare to definition.
    const effectiveCurrentReward = currentInstanceOverride !== undefined ? currentInstanceOverride : currentBaseReward;

    if (effectiveCurrentReward === newAmount) {
        return; // No change from the currently displayed/effective reward
    }

    if (definition.recurrenceType && definition.recurrenceType !== null) {
      setPendingEdit({
        fieldName: 'rewardAmount',
        value: newAmount,
        definitionId: definition.id,
        instanceId: instance.id,
        fromDateForSeries: instance.instanceDate
      });
      setIsEditScopeModalVisible(true);
    } else {
      // Not recurring: update definition's reward (no instance override for non-recurring)
      await updateChoreDefinition(definition.id, { rewardAmount: newAmount });
    }
  };

  const handleRewardInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSaveReward();
    } else if (event.key === 'Escape') {
      setIsEditingReward(false);
      // Optionally reset editingRewardValue to original if desired
    }
  };

  const handleEditDate = () => {
    setEditingDateValue(instance.instanceDate);
    setIsEditingDate(true);
  };

  const handleSaveDate = async () => {
    setIsEditingDate(false); // Close input immediately
    // Basic validation for date format can be added if necessary,
    // but type="date" input usually handles format.
    if (!editingDateValue || instance.instanceDate === editingDateValue) {
      return; // No change or empty value
    }

    if (definition.recurrenceType && definition.recurrenceType !== null) {
      setPendingEdit({
        fieldName: 'instanceDate',
        value: editingDateValue,
        definitionId: definition.id,
        instanceId: instance.id,
        fromDateForSeries: instance.instanceDate
      });
      setIsEditScopeModalVisible(true);
    } else {
      // Not recurring, update instance directly
      await updateChoreInstanceField(instance.id, 'instanceDate', editingDateValue);
    }
  };

  const handleDateInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSaveDate();
    } else if (event.key === 'Escape') {
      setIsEditingDate(false);
    }
  };

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

  // Fix: Quick action menu state and handler
  const [showMenu, setShowMenu] = useState(false);

  // Close menu when clicking outside
  React.useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      // Only close if click is outside the menu
      const menu = document.getElementById(`quick-action-menu-${instance.id}`);
      if (menu && !menu.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu, instance.id]);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        border: isSelected ? '2px solid var(--primary-color, #007bff)' : '1px solid #ccc', // Example selected style
        boxShadow: isSelected ? '0 0 5px var(--primary-color-light, #7bceff)' : style.boxShadow,
      }}
      {...attributes}
      // Remove {...listeners} from here if the checkbox should be interactive without starting a drag
      // Or, ensure the checkbox click stops propagation if it's part of the draggable area.
      // For now, assuming the whole card is draggable, so checkbox interaction might be tricky.
      // A common pattern is to have a drag handle and make other parts non-draggable.
      // Let's keep listeners for now and address if checkbox interaction is an issue.
      {...listeners}
      className={`kanban-card ${instance.isComplete ? 'complete' : ''} ${isDragging && !isOverlay ? 'dragging' : ''} ${isOverlay ? 'is-overlay' : ''} ${isSelected ? 'selected' : ''}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4 style={{ margin: 0, flexGrow: 1 }}>{definition.title}</h4>
        {!isOverlay && onToggleSelection && ( // Do not show checkbox on overlay card
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation(); // Prevent drag from starting on checkbox click
              onToggleSelection(instance.id, e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()} // Also stop propagation here for good measure
            aria-label={`Select chore ${definition.title}`}
            style={{ marginLeft: '8px', cursor: 'pointer' }}
          />
        )}
      </div>


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

      <div style={{ fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span>Due:</span>
        {isEditingDate ? (
          <input
            ref={dateInputRef}
            type="date"
            value={editingDateValue}
            onChange={(e) => setEditingDateValue(e.target.value)}
            onBlur={handleSaveDate}
            onKeyDown={handleDateInputKeyDown}
            style={{ fontSize: 'inherit', padding: '2px', width: '130px' }}
          />
        ) : (
          <>
            <span>{instance.instanceDate}</span>
            <button onClick={handleEditDate} className="edit-icon-button" aria-label="Edit due date">✏️</button>
          </>
        )}
      </div>

      {definition.rewardAmount !== undefined && ( // Show reward even if 0, to allow editing to a non-zero value
        <div style={{ fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>Reward:</span>
          {isEditingReward ? (
            <input
              ref={rewardInputRef}
              type="number"
              value={editingRewardValue}
              onChange={(e) => setEditingRewardValue(e.target.value)}
              onBlur={handleSaveReward}
              onKeyDown={handleRewardInputKeyDown}
              min="0"
              step="0.01"
              style={{ fontSize: 'inherit', padding: '2px', width: '60px' }}
            />
          ) : (
            <>
              <span>
                ${(instance.overriddenRewardAmount != null // Check for both undefined and null
                    ? instance.overriddenRewardAmount
                    : definition.rewardAmount
                  )?.toFixed(2) || '0.00'}
              </span>
              {instance.overriddenRewardAmount != null && ( // Check for both undefined and null
                <span title={`Base: $${definition.rewardAmount?.toFixed(2) || '0.00'}`} style={{color: 'var(--text-color-secondary)', fontSize: '0.8em', marginLeft: '4px'}}>(edited)</span>
              )}
              <button onClick={handleEditReward} className="edit-icon-button" aria-label="Edit reward amount">✏️</button>
            </>
          )}
        </div>
      )}

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

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          aria-label="Quick actions"
          onClick={e => {
            e.stopPropagation();
            setShowMenu(v => !v);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.2em',
            padding: 0,
            marginLeft: 4,
            color: '#888'
          }}
        >
          ⋮
        </button>
        {showMenu && (
          <div
            id={`quick-action-menu-${instance.id}`}
            style={{
              position: 'absolute',
              top: 24,
              right: 0,
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 100,
              minWidth: 120
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              style={{
                display: 'block',
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '8px 12px',
                textAlign: 'left',
                cursor: 'pointer'
              }}
              onClick={() => {
                setShowMenu(false);
                if (onEditChore) onEditChore(definition);
              }}
            >
              Edit Chore
            </button>
            {/* Add more quick actions here as needed */}
          </div>
        )}
      </div>

      {isEditScopeModalVisible && pendingEdit && (
        <EditScopeModal
          isVisible={isEditScopeModalVisible}
          onClose={closeEditScopeModal}
          onConfirmScope={handleConfirmEditScope}
          fieldName={pendingEdit.fieldName}
          newValue={pendingEdit.value}
        />
      )}
    </div>
  );
};

export default React.memo(KanbanCard);

// If you have a progress bar SVG or similar, make sure viewBox uses only numbers, not percentages.
// Example fix for a progress bar SVG:
// <svg width="100%" height="4" viewBox="0 0 100% 4"> ... </svg>
// With:
// <svg width="100%" height="4" viewBox="0 0 100 4">
//  {/* ...existing SVG content... */}
// </svg>

// Basic styling for edit icon buttons (ensure this doesn't cause issues with React.memo)
// If globalStyles were dynamic or complex, it might affect memoization, but as a static string, it's fine.
// import EditScopeModal from './EditScopeModal'; // Removed from here
const globalStyles = `
.edit-icon-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 4px;
  font-size: 0.9em;
  color: var(--text-color-secondary, #555);
}
.edit-icon-button:hover {
  color: var(--text-color-primary, #000);
}
`;

// Inject styles once
if (typeof window !== 'undefined' && !document.getElementById('kanban-card-dynamic-styles')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "kanban-card-dynamic-styles";
  styleSheet.innerText = globalStyles;
  document.head.appendChild(styleSheet);
}
