// src/hooks/useChoreCompletion.ts
import { useCallback } from 'react';
import type { ChoreDefinition, ChoreInstance, KanbanColumnConfig } from '../types';
import { useFinancialContext } from '../contexts/FinancialContext';
import { useChoreActivityLog } from './useChoreActivityLog';

interface UseChoreCompletionProps {
  choreDefinitions: ChoreDefinition[];
  getKanbanColumnConfigs: (kidId: string) => KanbanColumnConfig[];
}

/**
 * Custom hook for managing chore completion logic.
 * Extracts completion toggle logic from ChoresContext for better composability.
 */
export function useChoreCompletion({ 
  choreDefinitions, 
  getKanbanColumnConfigs 
}: UseChoreCompletionProps) {
  const { addKidReward } = useFinancialContext();
  const activityLog = useChoreActivityLog();

  /**
   * Toggle completion status for a chore instance
   * Handles reward distribution and automatic column movement
   */
  const toggleComplete = useCallback((
    instance: ChoreInstance,
    currentUserId?: string,
    currentUserName?: string
  ): ChoreInstance => {
    if (instance.isSkipped) return instance;

    const def = choreDefinitions.find(d => d.id === instance.choreDefinitionId);
    if (!def || !def.assignedKidId) return instance;

    const cols = getKanbanColumnConfigs(def.assignedKidId);
    let updated: ChoreInstance = { ...instance, isComplete: !instance.isComplete };

    if (updated.isComplete) {
      // Distribute reward if applicable
      if (def.rewardAmount && def.rewardAmount > 0) {
        addKidReward(def.assignedKidId, def.rewardAmount, `${def.title} (${instance.instanceDate})`);
      }

      // Auto-move to completed column
      const doneCol = cols.find(c => c.isCompletedColumn);
      if (doneCol && updated.categoryStatus !== doneCol.id) {
        updated.previousSubtaskCompletions = { ...updated.subtaskCompletions };
        const allTrue: Record<string, boolean> = {};
        def.subTasks?.forEach(st => { allTrue[st.id] = true; });
        updated.subtaskCompletions = allTrue;
        updated.categoryStatus = doneCol.id;
        updated = activityLog.logStatusChange(updated, doneCol.title, currentUserId, currentUserName);
      } else if (updated.categoryStatus === doneCol?.id) {
        // Already in done column, just mark subtasks complete
        const allTrue: Record<string, boolean> = {};
        def.subTasks?.forEach(st => { allTrue[st.id] = true; });
        updated.subtaskCompletions = allTrue;
      }
    } else {
      // Marking as incomplete
      const curColCfg = cols.find(c => c.id === updated.categoryStatus);
      if (curColCfg?.isCompletedColumn) {
        const nonDoneCol = cols.find(c => !c.isCompletedColumn) || cols[0];
        if (nonDoneCol) {
          updated.categoryStatus = nonDoneCol.id;
          if (updated.previousSubtaskCompletions) {
            updated.subtaskCompletions = { ...updated.previousSubtaskCompletions };
            updated.previousSubtaskCompletions = undefined;
          }
          updated = activityLog.logStatusChange(updated, nonDoneCol.title, currentUserId, currentUserName);
        }
      }
    }

    updated = activityLog.logCompletionToggle(updated, updated.isComplete, currentUserId, currentUserName);
    return updated;
  }, [choreDefinitions, getKanbanColumnConfigs, addKidReward, activityLog]);

  /**
   * Check if all subtasks are complete for an instance
   */
  const areAllSubtasksComplete = useCallback((
    instance: ChoreInstance,
    definition: ChoreDefinition
  ): boolean => {
    if (!definition.subTasks || definition.subTasks.length === 0) return true;
    return definition.subTasks.every(st => !!instance.subtaskCompletions?.[st.id]);
  }, []);

  return {
    toggleComplete,
    areAllSubtasksComplete,
  };
}
