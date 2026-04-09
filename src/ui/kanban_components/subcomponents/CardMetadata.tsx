// src/ui/kanban_components/subcomponents/CardMetadata.tsx
import React from 'react';
import type { ChoreDefinition, ChoreInstance } from '../../../types';

interface CardMetadataProps {
  instance: ChoreInstance;
  definition: ChoreDefinition;
  isEditingDate: boolean;
  editingDateValue: string;
  isEditingReward: boolean;
  editingRewardValue: string | number;
  isEditingPriority: boolean;
  editingPriorityValue: '' | 'Low' | 'Medium' | 'High';
  effectivePriority?: 'Low' | 'Medium' | 'High' | '';
  assignedKidName?: string;
  recurrenceInfo: string | null;
  onEditDate: () => void;
  onSaveDate: () => void;
  onDateChange: (value: string) => void;
  onDateKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  dateInputRef: React.RefObject<HTMLInputElement>;
  onEditReward: () => void;
  onSaveReward: () => void;
  onRewardChange: (value: string) => void;
  onRewardKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  rewardInputRef: React.RefObject<HTMLInputElement>;
  onEditPriority: () => void;
  onSavePriority: () => void;
  onPriorityChange: (value: '' | 'Low' | 'Medium' | 'High') => void;
  onPriorityKeyDown: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
}

/**
 * Renders metadata fields for a Kanban card: due date, reward, priority.
 */
export const CardMetadata: React.FC<CardMetadataProps> = ({
  instance,
  definition,
  isEditingDate,
  editingDateValue,
  isEditingReward,
  editingRewardValue,
  isEditingPriority,
  editingPriorityValue,
  effectivePriority,
  assignedKidName,
  recurrenceInfo,
  onEditDate,
  onSaveDate,
  onDateChange,
  onDateKeyDown,
  dateInputRef,
  onEditReward,
  onSaveReward,
  onRewardChange,
  onRewardKeyDown,
  rewardInputRef,
  onEditPriority,
  onSavePriority,
  onPriorityChange,
  onPriorityKeyDown,
  disabled = false,
}) => {
  const getPriorityStyle = (priorityVal?: 'Low' | 'Medium' | 'High'): React.CSSProperties => {
    switch (priorityVal) {
      case 'High': return { color: 'red', fontWeight: 'bold' };
      case 'Medium': return { color: 'orange' };
      case 'Low': return { color: 'green' };
      default: return {};
    }
  };

  // Ensure effectivePriority is properly typed for getPriorityStyle
  const priorityForStyle: 'Low' | 'Medium' | 'High' | undefined = 
    effectivePriority === '' ? undefined : effectivePriority;

  return (
    <div className="card-metadata">
      {assignedKidName && (
        <div className="metadata-row assignment-info">
          <strong>Assigned to:</strong> {assignedKidName}
        </div>
      )}

      {recurrenceInfo && (
        <div className="metadata-row recurrence-info">{recurrenceInfo}</div>
      )}

      {/* Priority */}
      <div className="metadata-row priority-row">
        <span>Priority:</span>
        {isEditingPriority ? (
          <select
            value={editingPriorityValue}
            onChange={(e) => onPriorityChange(e.target.value as '' | 'Low' | 'Medium' | 'High')}
            onBlur={onSavePriority}
            onKeyDown={onPriorityKeyDown}
            autoFocus
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="">Default</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        ) : (
          <>
            <span style={getPriorityStyle(priorityForStyle)}>
              {effectivePriority || 'Default'}
            </span>
            {!disabled && (
              <button
                onClick={(e) => { e.stopPropagation(); onEditPriority(); }}
                className="edit-icon-button"
                aria-label="Edit priority"
              >
                ✏️
              </button>
            )}
          </>
        )}
      </div>

      {/* Due Date */}
      <div className="metadata-row due-date-row">
        <span>Due:</span>
        {isEditingDate ? (
          <input
            ref={dateInputRef}
            type="date"
            value={editingDateValue}
            onChange={(e) => onDateChange(e.target.value)}
            onBlur={onSaveDate}
            onKeyDown={onDateKeyDown}
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span>{instance.instanceDate}</span>
            {!disabled && (
              <button
                onClick={(e) => { e.stopPropagation(); onEditDate(); }}
                className="edit-icon-button"
                aria-label="Edit date"
              >
                ✏️
              </button>
            )}
          </>
        )}
      </div>

      {/* Reward */}
      {definition.rewardAmount !== undefined && (
        <div className="metadata-row reward-row">
          <span>Reward:</span>
          {isEditingReward ? (
            <input
              ref={rewardInputRef}
              type="number"
              value={editingRewardValue}
              onChange={(e) => onRewardChange(e.target.value)}
              onBlur={onSaveReward}
              onKeyDown={onRewardKeyDown}
              disabled={disabled}
              onClick={(e) => e.stopPropagation()}
              min="0"
              step="0.01"
            />
          ) : (
            <>
              <span>${(instance.overriddenRewardAmount ?? definition.rewardAmount)?.toFixed(2)}</span>
              {!disabled && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEditReward(); }}
                  className="edit-icon-button"
                  aria-label="Edit reward"
                >
                  ✏️
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CardMetadata;
