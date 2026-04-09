// src/ui/kanban_components/subcomponents/SubtaskList.tsx
import React from 'react';
import type { ChoreDefinition, ChoreInstance } from '../../../types';

interface SubtaskListProps {
  instance: ChoreInstance;
  definition: ChoreDefinition;
  onToggleSubtask: (subtaskId: string) => void;
  disabled?: boolean;
}

/**
 * Renders a list of subtasks with checkboxes for completion.
 */
export const SubtaskList: React.FC<SubtaskListProps> = ({
  instance,
  definition,
  onToggleSubtask,
  disabled = false,
}) => {
  if (!definition.subTasks || definition.subTasks.length === 0) {
    return null;
  }

  return (
    <ul className="subtask-list">
      {definition.subTasks.map((subtask) => {
        const isComplete = !!instance.subtaskCompletions?.[subtask.id];
        return (
          <li 
            key={subtask.id} 
            className={`subtask-item ${isComplete ? 'complete' : 'incomplete'}`}
          >
            <label className="subtask-label">
              <input
                type="checkbox"
                checked={isComplete}
                onChange={() => onToggleSubtask(subtask.id)}
                disabled={disabled}
                onClick={(e) => e.stopPropagation()}
              />
              <span className={`subtask-title ${isComplete ? 'completed' : ''}`}>
                {subtask.title}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
};

export default SubtaskList;
