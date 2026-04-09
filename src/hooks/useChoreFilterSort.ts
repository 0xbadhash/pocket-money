// src/hooks/useChoreFilterSort.ts
import { useMemo } from 'react';
import type { ChoreDefinition, ChoreInstance } from '../types';

export type RewardFilterOption = 'any' | 'has_reward' | 'no_reward';
export type SortByOption = 'instanceDate' | 'title' | 'rewardAmount' | 'priority';
export type SortDirectionOption = 'asc' | 'desc';

interface UseChoreFilterSortProps {
  choreInstances: ChoreInstance[];
  choreDefinitions: ChoreDefinition[];
  kidId: string;
  rewardFilter?: RewardFilterOption;
  sortBy?: SortByOption;
  sortDirection?: SortDirectionOption;
  priorityFilter?: 'all' | 'Low' | 'Medium' | 'High';
  completionFilter?: 'all' | 'complete' | 'incomplete';
}

/**
 * Custom hook for filtering and sorting chore instances.
 * Extracts filtering/sorting logic from KidKanbanBoard for better composability.
 */
export function useChoreFilterSort({
  choreInstances,
  choreDefinitions,
  kidId,
  rewardFilter = 'any',
  sortBy = 'instanceDate',
  sortDirection = 'asc',
  priorityFilter = 'all',
  completionFilter = 'all',
}: UseChoreFilterSortProps) {
  /**
   * Get the definition for an instance
   */
  const getDefinitionForInstance = (instance: ChoreInstance): ChoreDefinition | undefined => {
    return choreDefinitions.find(def => def.id === instance.choreDefinitionId);
  };

  /**
   * Filtered and sorted instances for the given kid
   */
  const filteredInstances = useMemo(() => {
    // First filter by kid
    const kidInstances = choreInstances.filter(instance => {
      const definition = getDefinitionForInstance(instance);
      return definition?.assignedKidId === kidId;
    });

    // Apply reward filter
    const rewardFiltered = kidInstances.filter(instance => {
      const definition = getDefinitionForInstance(instance);
      if (!definition) return true;
      
      if (rewardFilter === 'has_reward') {
        return definition.rewardAmount !== undefined && definition.rewardAmount > 0;
      }
      if (rewardFilter === 'no_reward') {
        return !definition.rewardAmount || definition.rewardAmount === 0;
      }
      return true;
    });

    // Apply priority filter
    const priorityFiltered = rewardFiltered.filter(instance => {
      if (priorityFilter === 'all') return true;
      const effectivePriority = instance.priority || 
        choreDefinitions.find(d => d.id === instance.choreDefinitionId)?.priority;
      return effectivePriority === priorityFilter;
    });

    // Apply completion filter
    const completionFiltered = priorityFiltered.filter(instance => {
      if (completionFilter === 'all') return true;
      if (completionFilter === 'complete') return instance.isComplete;
      if (completionFilter === 'incomplete') return !instance.isComplete;
      return true;
    });

    // Apply sorting
    const sorted = [...completionFiltered].sort((a, b) => {
      const defA = getDefinitionForInstance(a);
      const defB = getDefinitionForInstance(b);
      
      if (!defA || !defB) return 0;

      let comparison = 0;

      switch (sortBy) {
        case 'instanceDate':
          comparison = new Date(a.instanceDate).getTime() - new Date(b.instanceDate).getTime();
          break;
        case 'title':
          comparison = defA.title.localeCompare(defB.title);
          break;
        case 'rewardAmount':
          comparison = (defA.rewardAmount || 0) - (defB.rewardAmount || 0);
          break;
        case 'priority': {
          const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
          const priorityA = a.priority || defA.priority || '';
          const priorityB = b.priority || defB.priority || '';
          comparison = (priorityOrder[priorityA as keyof typeof priorityOrder] || 0) - 
                       (priorityOrder[priorityB as keyof typeof priorityOrder] || 0);
          break;
        }
        default:
          return 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [choreInstances, choreDefinitions, kidId, rewardFilter, sortBy, sortDirection, priorityFilter, completionFilter]);

  /**
   * Get instances grouped by their category status
   */
  const instancesByCategory = useMemo(() => {
    const grouped: Record<string, ChoreInstance[]> = {};
    filteredInstances.forEach(instance => {
      const key = instance.categoryStatus || 'unassigned';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(instance);
    });
    return grouped;
  }, [filteredInstances]);

  /**
   * Get count of filtered instances
   */
  const totalCount = filteredInstances.length;

  /**
   * Get count by completion status
   */
  const counts = useMemo(() => {
    return {
      total: totalCount,
      complete: filteredInstances.filter(i => i.isComplete).length,
      incomplete: filteredInstances.filter(i => !i.isComplete).length,
      overdue: filteredInstances.filter(i => {
        const today = new Date().toISOString().split('T')[0];
        return i.instanceDate < today && !i.isComplete && !i.isSkipped;
      }).length,
    };
  }, [filteredInstances, totalCount]);

  return {
    filteredInstances,
    instancesByCategory,
    getDefinitionForInstance,
    counts,
    totalCount,
  };
}
