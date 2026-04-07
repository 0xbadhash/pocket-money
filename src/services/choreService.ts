/**
 * @file choreService.ts
 * Pure business logic for chore operations, separated from React context.
 * This service handles all chore-related computations and state transformations
 * without any React-specific dependencies.
 */

import type {
  ChoreDefinition,
  ChoreInstance,
  MatrixKanbanCategory,
} from '../types';
import { generateChoreInstances } from '../utils/choreUtils';

/**
 * Result of a batch operation on chore instances
 */
export interface BatchActionResult {
  succeededCount: number;
  failedCount: number;
  succeededIds: string[];
  failedIds: string[];
}

/**
 * Service class for chore-related business logic.
 * All methods are pure functions that operate on data without side effects.
 * Side effects (like localStorage, API calls, rewards) should be handled by the caller.
 */
export class ChoreService {
  /**
   * Generates chore instances for active definitions within a date range.
   * @param choreDefinitions - Array of all chore definitions
   * @param periodStartDate - Start date in YYYY-MM-DD format
   * @param periodEndDate - End date in YYYY-MM-DD format
   * @param existingInstances - Current instances to preserve data from
   * @param defaultCategory - Default category for new instances
   * @returns New array of chore instances
   */
  static generateInstancesForPeriod(
    choreDefinitions: ChoreDefinition[],
    periodStartDate: string,
    periodEndDate: string,
    existingInstances: ChoreInstance[],
    defaultCategory: MatrixKanbanCategory = 'TO_DO'
  ): ChoreInstance[] {
    // Only generate instances for active (not archived) definitions
    const activeDefinitions = choreDefinitions.filter((def) => !def.isComplete);

    // Apply early start date logic
    const definitionsForGeneration = activeDefinitions.map((def) => {
      if (def.earlyStartDate && def.dueDate) {
        const earlyStartDateObj = new Date(def.earlyStartDate);
        const dueDateObj = new Date(def.dueDate);
        if (earlyStartDateObj < dueDateObj) {
          return { ...def, dueDate: def.earlyStartDate };
        }
      }
      return def;
    });

    // Generate raw instances
    const rawNewInstances = generateChoreInstances(
      definitionsForGeneration,
      periodStartDate,
      periodEndDate
    );

    // Add Matrix Kanban fields to new instances
    const newInstancesWithMatrixFields = rawNewInstances.map((rawInstance) => {
      const definition = choreDefinitions.find(
        (def) => def.id === rawInstance.choreDefinitionId
      );
      const initialSubtaskCompletions: Record<string, boolean> = {};
      if (definition && definition.subTasks) {
        definition.subTasks.forEach((st) => {
          initialSubtaskCompletions[st.id] = st.isComplete || false;
        });
      }
      return {
        ...rawInstance,
        isComplete: false,
        categoryStatus: defaultCategory,
        subtaskCompletions: initialSubtaskCompletions,
        previousSubtaskCompletions: undefined,
      };
    });

    // Filter out old instances outside the period
    const periodStartNorm = new Date(periodStartDate);
    periodStartNorm.setUTCHours(0, 0, 0, 0);
    const periodEndNorm = new Date(periodEndDate);
    periodEndNorm.setUTCHours(0, 0, 0, 0);

    const outsideOfPeriod = existingInstances.filter((inst) => {
      const instDate = new Date(inst.instanceDate);
      instDate.setUTCHours(0, 0, 0, 0);
      return instDate < periodStartNorm || instDate > periodEndNorm;
    });

    // Preserve existing data for instances that already exist
    const updatedGeneratedForPeriod = newInstancesWithMatrixFields.map(
      (newInstance) => {
        const oldMatchingInstance = existingInstances.find(
          (oldInst) => oldInst.id === newInstance.id
        );
        if (oldMatchingInstance) {
          // Prioritize all fields from oldMatchingInstance
          return {
            ...newInstance,
            ...oldMatchingInstance,
          };
        }
        return newInstance;
      }
    );

    return [...outsideOfPeriod, ...updatedGeneratedForPeriod];
  }

  /**
   * Applies category update logic to a single chore instance.
   * Handles subtask completion states and overall completion status.
   * @param instance - The chore instance to update
   * @param newCategory - The new category to apply
   * @param definition - The associated chore definition
   * @returns Updated chore instance
   */
  static applyCategoryUpdateToInstance(
    instance: ChoreInstance,
    newCategory: MatrixKanbanCategory,
    definition?: ChoreDefinition
  ): ChoreInstance {
    if (!definition) return instance;

    let updatedSubtaskCompletions = { ...instance.subtaskCompletions };
    let updatedPreviousSubtaskCompletions = instance.previousSubtaskCompletions;
    let overallInstanceComplete = instance.isComplete;
    const oldCategory = instance.categoryStatus;

    if (newCategory === 'COMPLETED') {
      updatedPreviousSubtaskCompletions = { ...instance.subtaskCompletions };
      if (definition.subTasks && definition.subTasks.length > 0) {
        definition.subTasks.forEach(
          (st) => (updatedSubtaskCompletions[st.id] = true)
        );
      } else {
        updatedSubtaskCompletions = {};
      }
      overallInstanceComplete = true;
    } else if (
      oldCategory === 'COMPLETED' &&
      newCategory === 'IN_PROGRESS'
    ) {
      if (instance.previousSubtaskCompletions) {
        updatedSubtaskCompletions = { ...instance.previousSubtaskCompletions };
      }
      updatedPreviousSubtaskCompletions = undefined;
      if (definition.subTasks && definition.subTasks.length > 0) {
        overallInstanceComplete = definition.subTasks.every(
          (st) => !!updatedSubtaskCompletions[st.id]
        );
      } else {
        overallInstanceComplete = false;
      }
    } else if (newCategory === 'TO_DO') {
      if (definition.subTasks && definition.subTasks.length > 0) {
        definition.subTasks.forEach(
          (st) => (updatedSubtaskCompletions[st.id] = false)
        );
      } else {
        updatedSubtaskCompletions = {};
      }
      updatedPreviousSubtaskCompletions = undefined;
      overallInstanceComplete = false;
    } else if (newCategory === 'IN_PROGRESS') {
      if (definition.subTasks && definition.subTasks.length > 0) {
        overallInstanceComplete = definition.subTasks.every(
          (st) => !!updatedSubtaskCompletions[st.id]
        );
      } else {
        overallInstanceComplete = false;
      }
    }

    return {
      ...instance,
      categoryStatus: newCategory,
      subtaskCompletions: updatedSubtaskCompletions,
      previousSubtaskCompletions: updatedPreviousSubtaskCompletions,
      isComplete: overallInstanceComplete,
    };
  }

  /**
   * Toggles subtask completion on an instance with automatic category management.
   * @param instance - The chore instance to update
   * @param subtaskId - ID of the subtask to toggle
   * @param choreDefinitions - All chore definitions to find the associated definition
   * @returns Updated chore instance or null if not found
   */
  static toggleSubtaskCompletionOnInstance(
    instance: ChoreInstance,
    subtaskId: string,
    choreDefinitions: ChoreDefinition[]
  ): ChoreInstance | null {
    const definition = choreDefinitions.find(
      (def) => def.id === instance.choreDefinitionId
    );
    if (!definition) return null;

    // Toggle the subtask
    const newSubtaskCompletions = {
      ...instance.subtaskCompletions,
      [subtaskId]: !instance.subtaskCompletions?.[subtaskId],
    };

    let updatedInstance: ChoreInstance = {
      ...instance,
      subtaskCompletions: newSubtaskCompletions,
    };
    let newCategoryForAutoMove: MatrixKanbanCategory | null = null;

    // Determine if all subtasks are complete
    const allSubtasksComplete =
      definition.subTasks && definition.subTasks.length > 0
        ? definition.subTasks.every(
            (st) => !!updatedInstance.subtaskCompletions[st.id]
          )
        : true;

    // Check for TO_DO -> IN_PROGRESS transition
    if (updatedInstance.categoryStatus === 'TO_DO') {
      const anySubtaskComplete =
        definition.subTasks && definition.subTasks.length > 0
          ? definition.subTasks.some(
              (st) => !!updatedInstance.subtaskCompletions[st.id]
            )
          : false;

      if (anySubtaskComplete && !allSubtasksComplete) {
        newCategoryForAutoMove = 'IN_PROGRESS';
      }
    }

    // Check for auto-move to COMPLETED
    if (
      allSubtasksComplete &&
      updatedInstance.categoryStatus !== 'COMPLETED'
    ) {
      newCategoryForAutoMove = 'COMPLETED';
    }

    // Apply category change logic if needed
    if (newCategoryForAutoMove) {
      updatedInstance = this.applyCategoryUpdateToInstance(
        updatedInstance,
        newCategoryForAutoMove,
        definition
      );
    } else {
      // No category change, but update isComplete based on current category
      if (updatedInstance.categoryStatus === 'IN_PROGRESS') {
        if (definition.subTasks && definition.subTasks.length > 0) {
          updatedInstance.isComplete = definition.subTasks.every(
            (st) => !!updatedInstance.subtaskCompletions[st.id]
          );
        } else {
          updatedInstance.isComplete = false;
        }
      } else if (updatedInstance.categoryStatus === 'TO_DO') {
        updatedInstance.isComplete = false;
      }
    }

    return updatedInstance;
  }

  /**
   * Prepares future instances for a chore series update.
   * @param updatedDefinition - The updated chore definition
   * @param fromDate - Start date for regeneration (YYYY-MM-DD)
   * @param existingInstances - Current instances to filter
   * @returns Array of new future instances
   */
  static prepareSeriesUpdateInstances(
    updatedDefinition: ChoreDefinition,
    fromDate: string,
    existingInstances: ChoreInstance[]
  ): ChoreInstance[] {
    // Keep instances from other definitions or before the from date
    const instancesToKeep = existingInstances.filter(
      (inst) =>
        inst.choreDefinitionId !== updatedDefinition.id ||
        inst.instanceDate < fromDate
    );

    // Determine regeneration end date
    let regenerationEndDate = updatedDefinition.recurrenceEndDate;
    if (!regenerationEndDate) {
      const fromDateObj = new Date(fromDate);
      fromDateObj.setFullYear(fromDateObj.getFullYear() + 1);
      regenerationEndDate = fromDateObj.toISOString().split('T')[0];
    }

    let newFutureInstances: ChoreInstance[] = [];
    if (
      updatedDefinition.recurrenceType &&
      !updatedDefinition.isComplete
    ) {
      const rawNewFutureInstances = generateChoreInstances(
        [updatedDefinition],
        fromDate,
        regenerationEndDate
      );

      newFutureInstances = rawNewFutureInstances.map((rawInstance) => {
        const initialSubtaskCompletions: Record<string, boolean> = {};
        if (updatedDefinition.subTasks) {
          updatedDefinition.subTasks.forEach((st) => {
            initialSubtaskCompletions[st.id] = st.isComplete || false;
          });
        }
        return {
          ...rawInstance,
          isComplete: false,
          categoryStatus: 'TO_DO',
          subtaskCompletions: initialSubtaskCompletions,
          previousSubtaskCompletions: undefined,
        };
      });
    }

    return [...instancesToKeep, ...newFutureInstances];
  }

  /**
   * Filters chore instances for a specific kid and date range.
   * @param instances - All chore instances
   * @param definitions - All chore definitions
   * @param kidId - The kid ID to filter by
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns Filtered array of chore instances
   */
  static filterInstancesForKidAndPeriod(
    instances: ChoreInstance[],
    definitions: ChoreDefinition[],
    kidId: string,
    startDate: string,
    endDate: string
  ): ChoreInstance[] {
    const kidDefinitionIds = new Set(
      definitions.filter((def) => def.assignedKidId === kidId).map((def) => def.id)
    );

    return instances.filter(
      (inst) =>
        kidDefinitionIds.has(inst.choreDefinitionId) &&
        inst.instanceDate >= startDate &&
        inst.instanceDate <= endDate
    );
  }

  /**
   * Groups chore instances by date and category for Matrix Kanban display.
   * @param instances - Array of chore instances to group
   * @param definitions - All chore definitions for lookup
   * @param dates - Array of dates to create columns for
   * @returns Map of date strings to maps of categories to instances
   */
  static groupInstancesByDateAndCategory(
    instances: ChoreInstance[],
    _definitions: ChoreDefinition[],
    dates: Date[]
  ): Map<string, Map<MatrixKanbanCategory, ChoreInstance[]>> {
    const result = new Map<string, Map<MatrixKanbanCategory, ChoreInstance[]>>();

    // Initialize structure for all dates
    dates.forEach((date) => {
      const dateStr = date.toISOString().split('T')[0];
      const categoryMap = new Map<MatrixKanbanCategory, ChoreInstance[]>();
      categoryMap.set('TO_DO', []);
      categoryMap.set('IN_PROGRESS', []);
      categoryMap.set('COMPLETED', []);
      result.set(dateStr, categoryMap);
    });

    // Group instances
    instances.forEach((instance) => {
      const dateStr = instance.instanceDate;
      const categoryMap = result.get(dateStr);
      if (categoryMap) {
        const categoryList = categoryMap.get(instance.categoryStatus);
        if (categoryList) {
          categoryList.push(instance);
        }
      }
    });

    return result;
  }

  /**
   * Assigns IDs to new subtasks while preserving existing ones.
   * @param subTasks - Array of subtasks that may need IDs
   * @returns Subtasks with guaranteed IDs
   */
  static ensureSubTaskIds(subTasks?: Array<{ id?: string; title: string; isComplete: boolean }>) {
    if (!subTasks) return undefined;
    return subTasks.map((st, index) => ({
      id: st.id || `st_${Date.now()}_${index}`,
      ...st,
    }));
  }
}
