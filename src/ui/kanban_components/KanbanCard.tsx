/**
 * @file KanbanCard.tsx
 * Represents a single chore card within a Kanban column.
 * Displays chore details, sub-tasks, recurrence info, and provides interaction
 * for marking chores/sub-tasks as complete. It's also a draggable item via dnd-kit.
 */
import React, { useState, useEffect, useRef } from 'react';
import type { ChoreInstance, ChoreDefinition } from '../../types';
import { useChoresContext } from '../../contexts/ChoresContext';
import { useUserContext } from '../../contexts/UserContext'; // Added for user info
import { useNotification } from '../../contexts/NotificationContext';
import EditScopeModal from './EditScopeModal';
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
    updateChoreSeries,
    addCommentToInstance, // Added for comments
    toggleSkipInstance, // Added for skip functionality
  } = useChoresContext();
  const { user } = useUserContext(); // Added for user info
  const { addNotification } = useNotification(); // Destructure addNotification

  const [isEditingReward, setIsEditingReward] = useState(false);
  const [editingRewardValue, setEditingRewardValue] = useState<string | number>('');
  const rewardInputRef = useRef<HTMLInputElement>(null);

  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editingDateValue, setEditingDateValue] = useState<string>('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [editingPriorityValue, setEditingPriorityValue] = useState<'Low' | 'Medium' | 'High' | ''>('');

  const [newCommentText, setNewCommentText] = useState('');
  const [showActivityLog, setShowActivityLog] = useState(false);

  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editingTagsValue, setEditingTagsValue] = useState('');


  // Ensure loadingStates includes 'title' and other relevant fields
  const [loadingStates, setLoadingStates] = useState({
    title: false,
    tags: false, // Assuming tags editing might exist or be added
    reward: false, // Assuming reward editing exists
    date: false,   // Assuming date editing exists
  });

  // State for EditScopeModal
  const [isEditScopeModalVisible, setIsEditScopeModalVisible] = useState(false);
  const closeEditScopeModal = () => {
    setIsEditScopeModalVisible(false);
    setPendingEdit(undefined);
  };
  const [pendingEdit, setPendingEdit] = useState<{
    fieldName: 'instanceDate' | 'rewardAmount' | 'priority', // Added 'priority'
    value: any,
    definitionId: string,
    instanceId: string,
    fromDateForSeries: string
  } | undefined>(undefined);

  const handleConfirmEditScope = async (scope: 'instance' | 'series') => {
    if (!pendingEdit) return;

    const { fieldName, value, definitionId, instanceId, fromDateForSeries } = pendingEdit;

    if (scope === 'instance') {
      if (fieldName === 'instanceDate') {
        await updateChoreInstanceField(instanceId, 'instanceDate', value);
      } else if (fieldName === 'rewardAmount') {
        await updateChoreInstanceField(instanceId, 'overriddenRewardAmount', value);
      } else if (fieldName === 'priority') {
        await updateChoreInstanceField(instanceId, 'priority', value);
      }
    } else if (scope === 'series') {
      if (fieldName === 'instanceDate') {
        await updateChoreSeries(definitionId, { dueDate: value }, fromDateForSeries, 'dueDate');
      } else if (fieldName === 'rewardAmount') {
        await updateChoreInstanceField(instanceId, 'overriddenRewardAmount', undefined);
        await updateChoreSeries(definitionId, { rewardAmount: value }, fromDateForSeries, 'rewardAmount');
      } else if (fieldName === 'priority') {
        await updateChoreInstanceField(instanceId, 'priority', undefined); // Clear instance override
        await updateChoreSeries(definitionId, { priority: value }, fromDateForSeries, 'priority');
      }
    }
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

  // useEffect for focusing title input (Restoring this)
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

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

  // Handlers for Title Editing (Restoring these)
  const handleEditTitle = () => {
    // if (loadingStates.title) return; // Assuming loadingStates exists
    setEditingTitleValue(definition.title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    const newTitle = editingTitleValue.trim();
    setLoadingStates(prev => ({ ...prev, title: true }));
    setIsEditingTitle(false);
    if (newTitle && newTitle !== definition.title) {
      try {
        await updateChoreDefinition(definition.id, { title: newTitle });
        addNotification({ message: 'Title updated successfully!', type: 'success', duration: 3000 });
      } catch (error) {
        console.error("Failed to save title:", error);
        addNotification({ message: 'Failed to update title.', type: 'error' });
      } finally {
        setLoadingStates(prev => ({ ...prev, title: false }));
      }
    } else {
      // If title hasn't changed or is empty, just ensure loading state is reset if it was set.
      // This case might not strictly need setLoadingStates if not set before this check,
      // but added for completeness if logic changes.
      setLoadingStates(prev => ({ ...prev, title: false }));
    }
  };

  const handleTitleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSaveTitle();
    } else if (event.key === 'Escape') {
      setIsEditingTitle(false);
      setEditingTitleValue(definition.title); // Reset to original on escape
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
    opacity: (isDragging && !isOverlay) || instance.isSkipped ? 0.4 : 1,
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
  const effectivePriority = instance.priority || definition.priority;
  const assignedKid = definition.assignedKidId && user?.kids
    ? user.kids.find(k => k.id === definition.assignedKidId)
    : undefined;

  // Fix: Quick action menu state and handler
  const [showMenu, setShowMenu] = useState(false);

  // Close menu when clicking outside
  React.useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      const menu = document.getElementById(`quick-action-menu-${instance.id}`);
      if (menu && !menu.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu, instance.id]);

  const handleEditPriority = () => {
    setEditingPriorityValue(effectivePriority || '');
    setIsEditingPriority(true);
  };

  const handleSavePriority = async () => {
    setIsEditingPriority(false);
    const newPriority = editingPriorityValue || undefined; // Convert '' to undefined
    const currentPriority = instance.priority || definition.priority;


    if (newPriority === currentPriority) {
      return; // No change
    }

    if (definition.recurrenceType && definition.recurrenceType !== null) {
      setPendingEdit({
        fieldName: 'priority',
        value: newPriority, // Pass undefined if it was cleared, or the new value
        definitionId: definition.id,
        instanceId: instance.id,
        fromDateForSeries: instance.instanceDate,
      });
      setIsEditScopeModalVisible(true);
    } else {
      // Not recurring or no actual change in value that needs series edit
      await updateChoreInstanceField(instance.id, 'priority', newPriority);
      addNotification({ message: 'Priority updated for this instance!', type: 'success', duration: 2000 });
    }
  };

  const handlePrioritySelectKeyDown = (event: React.KeyboardEvent<HTMLSelectElement>) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      handleSavePriority();
      (event.target as HTMLSelectElement).blur(); // Remove focus
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;
    const currentUserId = user?.id || 'mockUserId';
    const currentUserName = user?.username || 'Mock User';
    try {
      await addCommentToInstance(instance.id, newCommentText.trim(), currentUserId, currentUserName);
      setNewCommentText('');
      addNotification({ message: 'Comment added!', type: 'success', duration: 2000 });
    } catch (error) {
      console.error("Failed to add comment:", error);
      addNotification({ message: 'Failed to add comment.', type: 'error' });
    }
  };

  const getPriorityStyle = (priorityVal?: 'Low' | 'Medium' | 'High') => {
    switch (priorityVal) {
      case 'High': return { color: 'red', fontWeight: 'bold' };
      case 'Medium': return { color: 'orange' };
      case 'Low': return { color: 'green' };
      default: return {};
    }
  };


  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        border: isSelected ? '2px solid var(--primary-color, #007bff)' : '1px solid #ccc',
        boxShadow: isSelected ? '0 0 5px var(--primary-color-light, #7bceff)' : style.boxShadow,
        // textDecoration: instance.isSkipped ? 'line-through' : 'none', // Strikethrough whole card might be too much
      }}
      {...attributes}
      {...(instance.isSkipped ? {} : listeners)} // Make card non-draggable if skipped
      className={`kanban-card ${instance.isComplete ? 'complete' : ''} ${instance.isSkipped ? 'skipped' : ''} ${isDragging && !isOverlay ? 'dragging' : ''} ${isOverlay ? 'is-overlay' : ''} ${isSelected ? 'selected' : ''}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editingTitleValue}
            onChange={(e) => setEditingTitleValue(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={handleTitleInputKeyDown}
            style={{ flexGrow: 1, marginRight: '8px', fontSize: '1em', padding: '2px', border: '1px solid #ccc' }}
            aria-label="Edit chore title"
            disabled={loadingStates.title}
          />
        ) : (
          <>
            <h4
              style={{
                margin: 0,
                flexGrow: 1,
                cursor: (loadingStates.title || instance.isSkipped) ? 'default' : 'text',
                textDecoration: instance.isSkipped && !instance.isComplete ? 'line-through' : 'none',
              }}
              onClick={!loadingStates.title && !instance.isSkipped ? handleEditTitle : undefined}
            >
              {definition.title} {instance.isSkipped && <span style={{fontSize: '0.8em', color: 'grey'}}>(Skipped)</span>}
            </h4>
            {loadingStates.title && <span role="status" aria-live="polite" style={{ fontSize: '0.8em', marginLeft: '8px', color: 'var(--text-color-secondary)' }}>Saving...</span>}
            {!isEditingTitle && !loadingStates.title && !instance.isSkipped && (
              <button
                onClick={handleEditTitle}
                className="edit-icon-button"
                aria-label="Edit title"
                style={{ marginLeft: '4px', alignSelf: 'center' }}
                disabled={loadingStates.title}
              >
                ✏️
              </button>
            )}
          </>
        )}

        {!isOverlay && typeof onToggleSelection === 'function' && !isEditingTitle && !instance.isSkipped && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelection(instance.id, e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select chore ${definition.title}`}
            style={{ marginLeft: '8px', cursor: 'pointer' }}
            disabled={instance.isSkipped}
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

      {/* Assigned Kid Info */}
      {assignedKid ? (
        <div className="assigned-kid-info" style={{ marginTop: '8px', fontSize: '0.9em' }}>
          <strong>Assigned to:</strong> {assignedKid.name}
          {/* Optional: Avatar display logic
          {assignedKid.avatarFilename && (
            <img
              src={`/avatars/${assignedKid.avatarFilename}`} // Assuming a path like public/avatars/
              alt={`${assignedKid.name}'s avatar`}
              style={{ width: '24px', height: '24px', borderRadius: '50%', marginLeft: '8px', verticalAlign: 'middle' }}
            />
          )}
          */}
        </div>
      ) : (
        <div className="assigned-kid-info" style={{ marginTop: '8px', fontSize: '0.9em', color: '#777' }}>
          Unassigned
        </div>
      )}

      {/* Priority Display and Edit */}
      <div style={{ fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
        <span>Priority:</span>
        {isEditingPriority ? (
          <select
            value={editingPriorityValue}
            onChange={(e) => setEditingPriorityValue(e.target.value as 'Low' | 'Medium' | 'High' | '')}
            onBlur={handleSavePriority}
            onKeyDown={handlePrioritySelectKeyDown}
            style={{ fontSize: 'inherit', padding: '2px' }}
            autoFocus
            disabled={instance.isSkipped}
          >
            <option value="">Default</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        ) : (
          <>
            <span style={getPriorityStyle(effectivePriority)}>{effectivePriority || 'Default'}</span>
            {!instance.isSkipped && <button onClick={handleEditPriority} className="edit-icon-button" aria-label="Edit priority">✏️</button>}
          </>
        )}
      </div>

      <div style={{ fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
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
            {!instance.isSkipped && <button onClick={handleEditDate} className="edit-icon-button" aria-label="Edit due date">✏️</button>}
          </>
        )}
      </div>

      {definition.rewardAmount !== undefined && (
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
              {instance.overriddenRewardAmount != null && (
                <span title={`Base: $${definition.rewardAmount?.toFixed(2) || '0.00'}`} style={{color: 'var(--text-color-secondary)', fontSize: '0.8em', marginLeft: '4px'}}>(edited)</span>
              )}
              {!instance.isSkipped && <button onClick={handleEditReward} className="edit-icon-button" aria-label="Edit reward amount">✏️</button>}
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
          {!instance.isSkipped && !isEditingTags && (
            <button
              onClick={() => {
                setEditingTagsValue(definition.tags?.join(', ') || '');
                setIsEditingTags(true);
              }}
              className="edit-icon-button"
              aria-label="Edit tags"
              style={{marginLeft: '8px'}}
              disabled={loadingStates.tags} // Disable if tags are currently being saved (optional)
            >
              ✏️
            </button>
          )}
        </div>
      )}
      {isEditingTags && !instance.isSkipped && (
        <div style={{ marginTop: '8px', marginBottom: '8px' }}>
          <input
            type="text"
            value={editingTagsValue}
            onChange={(e) => setEditingTagsValue(e.target.value)}
            placeholder="Enter tags, comma-separated"
            style={{ width: 'calc(100% - 120px)', marginRight: '8px', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
            autoFocus
          />
          <button
            onClick={async () => {
              setLoadingStates(prev => ({ ...prev, tags: true }));
              const newTagsArray = editingTagsValue.split(',').map(tag => tag.trim()).filter(tag => tag);
              try {
                await updateChoreDefinition(definition.id, { tags: newTagsArray });
                addNotification({ message: 'Tags updated!', type: 'success' });
              } catch (error) {
                addNotification({ message: 'Failed to update tags.', type: 'error' });
                console.error("Failed to update tags:", error);
              } finally {
                setLoadingStates(prev => ({ ...prev, tags: false }));
                setIsEditingTags(false);
              }
            }}
            className="button-primary"
            disabled={loadingStates.tags}
          >
            Save
          </button>
          <button
            onClick={() => setIsEditingTags(false)}
            style={{marginLeft: '4px'}}
            className="button-secondary"
            disabled={loadingStates.tags}
          >
            Cancel
          </button>
        </div>
      )}
      {/* Fallback display if tags are empty and not editing, or if card is skipped and was editing */}
      { !isEditingTags && (!definition.tags || definition.tags.length === 0) && (
          <div className="chore-tags-container" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
            <span style={{fontSize: '0.8em', color: '#777'}}>No tags.</span>
            {!instance.isSkipped && (
               <button
                onClick={() => {
                  setEditingTagsValue('');
                  setIsEditingTags(true);
                }}
                className="edit-icon-button"
                aria-label="Add tags"
                style={{marginLeft: '8px'}}
              >
                ✏️
              </button>
            )}
          </div>
        )
      }


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
                  id={`subtask-${instance.id}-${subTask.id}`}
                  checked={isChecked}
                  onChange={() => !instance.isSkipped && toggleSubtaskCompletionOnInstance(instance.id, subTask.id)}
                  style={{ marginRight: '8px', cursor: instance.isSkipped ? 'default' : 'pointer' }}
                  disabled={instance.isSkipped}
                />
                <label
                  htmlFor={`subtask-${instance.id}-${subTask.id}`}
                  style={{
                    fontSize: '0.85em',
                    textDecoration: isChecked ? 'line-through' : 'none',
                    color: isChecked ? 'var(--text-color-secondary, #555)' : 'var(--text-color-primary, #333)',
                    cursor: instance.isSkipped ? 'default' : 'pointer'
                  }}
                >
                  {subTask.title}
                </label>
              </div>
            );
          })}
        </div>
      )}

      {recurrenceInfo && <p style={{ fontStyle: 'italic', fontSize: '0.8em', color: 'var(--text-color-secondary)' }}>{recurrenceInfo}</p>}
      <p style={{ fontSize: '0.9em' }}>Status: {instance.isComplete ? 'Complete' : 'Incomplete'}</p>

      {/* Comments Section */}
      {instance.instanceComments && instance.instanceComments.length > 0 && (
        <div className="comments-section" style={{ marginTop: '10px', borderTop: '1px solid var(--border-color, #eee)', paddingTop: '8px' }}>
          <h5 style={{ fontSize: '0.9em', marginBottom: '5px', color: 'var(--text-color-secondary, #666)', marginTop: '0' }}>Comments:</h5>
          {instance.instanceComments.map(comment => (
            <div key={comment.id} className="comment-item" style={{ marginBottom: '4px', fontSize: '0.85em' }}>
              <strong>{comment.userName}</strong> ({new Date(comment.createdAt).toLocaleDateString()}): {comment.text}
            </div>
          ))}
        </div>
      )}

      {/* Add Comment Form */}
      <div className="add-comment-form" style={{ marginTop: '10px' }}>
        <textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: '4px', padding: '4px', border: '1px solid #ccc', borderRadius: '3px' }}
          disabled={instance.isSkipped}
        />
        <button onClick={handleAddComment} disabled={!newCommentText.trim() || instance.isSkipped} className="button-primary" style={{ fontSize: '0.9em' }}>
          Add Comment
        </button>
      </div>

      {!instance.isSkipped && (
        <button
          onClick={() => toggleChoreInstanceComplete(instance.id)}
          style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', fontSize: '0.9em', cursor: 'pointer', marginTop: '10px' }}
          className="button-secondary"
          disabled={instance.isSkipped}
        >
          {instance.isComplete ? 'Mark Incomplete' : 'Mark Complete'}
        </button>
      )}

      {instance.isSkipped ? (
        <button onClick={() => toggleSkipInstance(instance.id)} style={{ marginTop: '10px' }} className="button-tertiary">Unskip</button>
      ) : (
        !instance.isComplete && <button onClick={() => toggleSkipInstance(instance.id)} style={{ marginTop: '10px', marginLeft: '8px' }} className="button-tertiary">Skip</button>
      )}


      {onEditChore && !instance.isSkipped && (
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
                if (onEditChore && !instance.isSkipped) onEditChore(definition);
              }}
              disabled={instance.isSkipped}
            >
              Edit Chore
            </button>
            {/* Add more quick actions here as needed, ensure they respect isSkipped */}
          </div>
        )}
      </div>

      <div style={{ marginTop: '10px' }}>
        <button onClick={() => setShowActivityLog(!showActivityLog)} className="button-link">
          {showActivityLog ? 'Hide Activity' : 'View Activity'} ({instance.activityLog?.length || 0})
        </button>
        {showActivityLog && instance.activityLog && instance.activityLog.length > 0 && (
          <div className="activity-log-section" style={{ marginTop: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', padding: '8px', fontSize: '0.8em', backgroundColor: '#f9f9f9' }}>
            {instance.activityLog.map(log => (
              <div key={log.timestamp + log.action} className="activity-log-entry" style={{ marginBottom: '4px', borderBottom: '1px dotted #ddd', paddingBottom: '4px' }}>
                <span style={{ fontWeight: 'bold' }}>{new Date(log.timestamp).toLocaleString()}</span> -
                <span style={{ color: '#555', marginLeft: '4px' }}>{log.userName || log.userId || 'System'}</span>:
                <span style={{ marginLeft: '4px', fontWeight: '500' }}>{log.action}</span>
                {log.details && <span style={{ marginLeft: '4px', color: '#777' }}>({log.details})</span>}
              </div>
            ))}
          </div>
        )}
         {showActivityLog && (!instance.activityLog || instance.activityLog.length === 0) && (
            <p style={{fontSize: '0.8em', color: '#777', marginTop: '4px'}}>No activity yet.</p>
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
