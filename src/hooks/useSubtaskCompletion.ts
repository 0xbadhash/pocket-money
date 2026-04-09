// src/hooks/useSubtaskCompletion.ts
import { useCallback } from 'react';
import type { ChoreDefinition, ChoreInstance, KanbanColumnConfig } from '../types';
import { useChoreActivityLog } from './useChoreActivityLog';

interface UseSubtaskCompletionProps {
  choreDefinitions: ChoreDefinition[];
  getKanbanColumnConfigs: (kidId: string) => KanbanColumnConfig[];
}

/**
 * Custom hook for managing subtask completion logic.
 * Extracts subtask toggle logic from ChoresContext for better composability.
 */
export function useSubtaskCompletion({ 
  choreDefinitions, 
  getKanbanColumnConfigs 
}: UseSubtaskCompletionProps) {
  const activityLog = useChoreActivityLog();

  /**
   * Toggle a subtask completion status on an instance
   * Automatically handles parent task completion and column movement
   */
  const toggleSubtask = useCallback((
    instance: ChoreInstance,
    subtaskId: string,
    currentUserId?: string,
    currentUserName?: string
  ): ChoreInstance => {
    let current: ChoreInstance = { ...instance };
    const def = choreDefinitions.find(d => d.id === current.choreDefinitionId);
    
    if (!def || !def.assignedKidId) return instance;

    // Toggle the subtask
    current.subtaskCompletions = { 
      ...current.subtaskCompletions, 
      [subtaskId]: !current.subtaskCompletions?.[subtaskId] 
    };

    // Log the subtask toggle
    const subTitle = def.subTasks?.find(st => st.id === subtaskId)?.title || 'Unknown';
    current = activityLog.logSubtaskToggle(
      current, 
      subTitle, 
      current.subtaskCompletions[subtaskId], 
      currentUserId, 
      currentUserName
    );

    // Check if all subtasks are done
    const allDone = def.subTasks?.every(st => !!current.subtaskCompletions[st.id]) ?? true;
    const cols = getKanbanColumnConfigs(def.assignedKidId);
    const curColCfg = cols.find(c => c.id === current.categoryStatus);
    const origStatus = current.categoryStatus;

    // Auto-complete parent task if all subtasks done and not in completed column
    if (allDone && curColCfg && !curColCfg.isCompletedColumn) {
      const doneCol = cols.find(c => c.isCompletedColumn);
      if (doneCol) {
        current.isComplete = true;
        current.previousSubtaskCompletions = { ...current.subtaskCompletions };
        current.categoryStatus = doneCol.id;
      } else {
        current.isComplete = true;
      }
    } 
    // Auto-incomplete parent task if subtask undone and in completed column
    else if (!allDone && curColCfg && curColCfg.isCompletedColumn) {
      const nonDoneCol = cols.find(c => !c.isCompletedColumn) || cols[0];
      if (nonDoneCol) {
        current.isComplete = false;
        if (current.previousSubtaskCompletions) {
          current.subtaskCompletions = { ...current.previousSubtaskCompletions };
          current.previousSubtaskCompletions = undefined;
        }
        current.categoryStatus = nonDoneCol.id;
      }
    } 
    // Update isComplete flag based on subtask state
    else {
      if (!curColCfg?.isCompletedColumn) {
        current.isComplete = allDone;
      } else {
        current.isComplete = true;
      }
    }

    // Log column change if it happened
    if (origStatus !== current.categoryStatus) {
      const newColTitle = cols.find(c => c.id === current.categoryStatus)?.title || current.categoryStatus;
      current = activityLog.logStatusChange(current, newColTitle, currentUserId, currentUserName);
    }

    return current;
  }, [choreDefinitions, getKanbanColumnConfigs, activityLog]);

  /**
   * Get completion percentage for an instance's subtasks
   */
  const getCompletionPercentage = useCallback((
    instance: ChoreInstance,
    definition: ChoreDefinition
  ): number => {
    if (!definition.subTasks || definition.subTasks.length === 0) return 100;
    const completed = definition.subTasks.filter(st => !!instance.subtaskCompletions?.[st.id]).length;
    return Math.round((completed / definition.subTasks.length) * 100);
  }, []);

  return {
    toggleSubtask,
    getCompletionPercentage,
  };
}
