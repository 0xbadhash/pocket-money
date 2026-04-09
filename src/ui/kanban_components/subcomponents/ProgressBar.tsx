// src/ui/kanban_components/subcomponents/ProgressBar.tsx
import React from 'react';
import type { ChoreDefinition, ChoreInstance } from '../../../types';

interface ProgressBarProps {
  instance: ChoreInstance;
  definition: ChoreDefinition;
}

/**
 * Renders a progress bar showing subtask completion status.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ instance, definition }) => {
  if (!definition.subTasks || definition.subTasks.length === 0) {
    return null;
  }

  const completedCount = definition.subTasks.filter(
    st => !!instance.subtaskCompletions?.[st.id]
  ).length;
  const totalCount = definition.subTasks.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-track">
        <div 
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${completedCount} of ${totalCount} subtasks complete`}
        />
      </div>
      <span className="progress-bar-text">{completedCount}/{totalCount}</span>
    </div>
  );
};

export default ProgressBar;
