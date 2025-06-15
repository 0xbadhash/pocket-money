// src/contexts/ChoresContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { ChoreDefinition, ChoreInstance, MatrixKanbanCategory } from '../types';
import { useFinancialContext } from '../contexts/FinancialContext';
import { generateChoreInstances } from '../utils/choreUtils';

/**
 * @typedef KanbanChoreOrders
 * Defines the structure for storing custom Kanban chore orders.
 * The key is a string identifier, typically combining a kid's ID and a column identifier
 * (e.g., "kid1-daily_active" or "kid1-weekly_completed").
 * The value is an array of chore instance IDs, representing the desired order for that specific column.
 */
export type KanbanChoreOrders = Record<string, string[]>;

/**
 * @interface ChoresContextType
 * Defines the shape of the context value provided by ChoresProvider.
 * Includes state for chore definitions, instances, custom Kanban orders,
 * and functions to manage them.
 */
interface ChoresContextType {
  /** Array of all defined chore templates. */
  choreDefinitions: ChoreDefinition[];
  /** Array of all generated chore instances for various periods. */
  choreInstances: ChoreInstance[];
  // kanbanChoreOrders: KanbanChoreOrders; // Removed for Matrix Kanban
  /** Adds a new chore definition to the system. */
  addChoreDefinition: (choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete'>) => void;
  /** Toggles the overall completion status of a specific chore instance. Also handles reward logic. */
  toggleChoreInstanceComplete: (instanceId: string) => void;
  /** Retrieves all chore definitions assigned to a specific kid. */
  getChoreDefinitionsForKid: (kidId: string) => ChoreDefinition[];
  /**
   * Generates chore instances for all definitions within a given date range.
   * Optionally assigns a default Kanban column ID to newly generated instances.
   * If an instance for a specific definition and date already exists, its completion status and any existing `kanbanColumnId` are preserved.
   * New instances will receive the `defaultKanbanColumnId` if provided and they don't have one already.
   * @param {string} startDate - The start date of the period (YYYY-MM-DD) for instance generation.
   * @param {string} endDate - The end date of the period (YYYY-MM-DD) for instance generation.
   * @param {string} [defaultKanbanColumnId] - Optional: intended to be a MatrixKanbanCategory for new instances.
   */
  generateInstancesForPeriod: (startDate: string, endDate: string, defaultCategory?: MatrixKanbanCategory) => void;
  // toggleSubTaskComplete: (choreDefinitionId: string, subTaskId: string) => void; // Removed, operates on instance now
  toggleSubtaskCompletionOnInstance: (instanceId: string, subtaskId: string) => void; // New function
  // updateKanbanChoreOrder: (kidId: string, columnIdentifier: string, orderedChoreIds: string[]) => void; // Removed for Matrix Kanban
  // updateChoreInstanceColumn: (instanceId: string, newKanbanColumnId: string) => void; // Removed, categoryStatus handled differently
  /** Toggles the active state of a chore definition (isComplete field). */
  toggleChoreDefinitionActiveState: (definitionId: string) => void;
  /** Updates the category status of a chore instance and handles related subtask logic. */
  updateChoreInstanceCategory: (
    instanceId: string,
    newCategory: MatrixKanbanCategory,
    // currentSubtaskCompletions is not strictly needed if we fetch from instance state prior to update
  ) => void;
  /** Updates specified fields of a chore definition. */
  updateChoreDefinition: (definitionId: string, updates: Partial<ChoreDefinition>) => Promise<void>;
  /** Updates a specific field of a chore instance. */
  updateChoreInstanceField: (instanceId: string, fieldName: keyof ChoreInstance, value: any) => Promise<void>;
  /** Batch marks chore instances as complete or incomplete. */
  batchToggleCompleteChoreInstances: (instanceIds: string[], markAsComplete: boolean) => Promise<void>;
  /** Batch updates the category for multiple chore instances. */
  batchUpdateChoreInstancesCategory: (instanceIds: string[], newCategory: MatrixKanbanCategory) => Promise<void>;
  /** Batch assigns chore definitions to a new kid. */
  batchAssignChoreDefinitionsToKid: (definitionIds: string[], newKidId: string | null) => Promise<void>;
}

// Create the context
export const ChoresContext = createContext<ChoresContextType | undefined>(undefined);

// Custom hook for easier context consumption - Ensure return type matches new ChoresContextType
export const useChoresContext = (): ChoresContextType => {
  const context = useContext(ChoresContext);
  if (context === undefined) {
    throw new Error('useChoresContext must be used within a ChoresProvider');
  }
  return context;
};

// Create a ChoresProvider component
interface ChoresProviderProps {
  children: ReactNode;
}

export const ChoresProvider: React.FC<ChoresProviderProps> = ({ children }) => {
  // MODIFIED: State for chore definitions
  const [choreDefinitions, setChoreDefinitions] = useState<ChoreDefinition[]>([
    {
      id: 'cd1', title: 'Clean Room (Daily)', assignedKidId: 'kid_a', dueDate: '2023-12-01',
      rewardAmount: 1, isComplete: false, recurrenceType: 'daily', recurrenceEndDate: '2023-12-05',
      tags: ['cleaning', 'indoor'],
      subTasks: [
        { id: 'st1_1', title: 'Make bed', isComplete: false },
        { id: 'st1_2', title: 'Tidy desk', isComplete: false },
        { id: 'st1_3', title: 'Vacuum floor', isComplete: false }
      ]
    },
    {
      id: 'cd2', title: 'Walk the Dog (Weekly Sat)', assignedKidId: 'kid_b', dueDate: '2023-12-02',
      rewardAmount: 3, isComplete: false, recurrenceType: 'weekly', recurrenceDay: 6, // Saturday
      recurrenceEndDate: '2023-12-31',
      tags: ['outdoor', 'pet care', 'morning'],
      subTasks: [
        { id: 'st2_1', title: 'Leash and harness', isComplete: false },
        { id: 'st2_2', title: 'Walk for 30 mins', isComplete: false },
      ]
    },
    {
      id: 'cd3', title: 'Do Homework (One-off)', assignedKidId: 'kid_a', dueDate: '2023-12-15',
      rewardAmount: 2, isComplete: false, recurrenceType: null
      // No tags or subtasks for this one
    },
    {
      id: 'cd4', title: 'Take out trash (Monthly 15th)', description: 'Before evening', rewardAmount: 1.5,
      assignedKidId: 'kid_a', dueDate: '2023-12-01', isComplete: false, recurrenceType: 'monthly', recurrenceDay: 15,
      recurrenceEndDate: '2024-02-01',
      tags: ['household', 'evening']
      // No subtasks
    },
    {
      id: 'cd5', title: 'Feed Cat (Daily)', assignedKidId: 'kid_a', dueDate: '2023-12-01',
      rewardAmount: 0.5, isComplete: false, recurrenceType: 'daily', recurrenceEndDate: null,
      subTasks: [
        { id: 'st5_1', title: 'Clean bowl', isComplete: false },
        { id: 'st5_2', title: 'Fill with food', isComplete: false },
        { id: 'st5_3', title: 'Check water', isComplete: true }, // Example pre-completed
      ]
    }
  ]);

  // NEW: State for chore instances
  const [choreInstances, setChoreInstances] = useState<ChoreInstance[]>([]);

  // const [kanbanChoreOrders, setKanbanChoreOrders] = useState<KanbanChoreOrders>(() => { // Removed
  //   try {
  //     const savedOrders = localStorage.getItem('kanbanChoreOrders');
  //     return savedOrders ? JSON.parse(savedOrders) : {};
  //   } catch (error) {
  //     console.error("Error parsing kanbanChoreOrders from localStorage:", error);
  //     return {}; // Return default value in case of error
  //   }
  // });

  const { addKidReward } = useFinancialContext();

  // useEffect(() => { // Removed for kanbanChoreOrders
  //   try {
  //     localStorage.setItem('kanbanChoreOrders', JSON.stringify(kanbanChoreOrders));
  //   } catch (error) {
  //     console.error("Error saving kanbanChoreOrders to localStorage:", error);
  //   }
  // }, [kanbanChoreOrders]);

  // Effect to save choreDefinitions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('choreDefinitions', JSON.stringify(choreDefinitions));
    } catch (error) {
      console.error("Failed to save chore definitions to localStorage:", error);
    }
  }, [choreDefinitions]);

  // Effect to save choreInstances to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('choreInstances', JSON.stringify(choreInstances));
    } catch (error) {
      console.error("Failed to save chore instances to localStorage:", error);
    }
  }, [choreInstances]);

  const addChoreDefinition = useCallback((choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete'>) => {
    const newChoreDef: ChoreDefinition = {
      id: `cd${Date.now()}`, // Simple unique ID
      isComplete: false, // New definitions are active by default
      ...choreDefData,
    };
    setChoreDefinitions(prevDefs => [newChoreDef, ...prevDefs]);
  }, [setChoreDefinitions]);

  const toggleChoreInstanceComplete = useCallback((instanceId: string) => {
    const instance = choreInstances.find(inst => inst.id === instanceId);
    if (!instance) {
      console.warn(`Chore instance with ID ${instanceId} not found.`);
      return;
    }

    const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
    if (!definition) {
      console.warn(`Chore definition for instance ID ${instanceId} (def ID: ${instance.choreDefinitionId}) not found.`);
      return;
    }

    // If marking as complete, and it has a reward, and kid is assigned
    if (!instance.isComplete && definition.assignedKidId && definition.rewardAmount && definition.rewardAmount > 0) {
      addKidReward(definition.assignedKidId, definition.rewardAmount, `${definition.title} (${instance.instanceDate})`);
    }

    setChoreInstances(prevInstances =>
      prevInstances.map(inst =>
        inst.id === instanceId ? { ...inst, isComplete: !inst.isComplete } : inst
      )
    );
  }, [choreInstances, choreDefinitions, addKidReward, setChoreInstances]);

  const getChoreDefinitionsForKid = useCallback((kidId: string): ChoreDefinition[] => {
    return choreDefinitions.filter(def => def.assignedKidId === kidId);
  }, [choreDefinitions]);

  const generateInstancesForPeriod = useCallback((
    periodStartDate: string,
    periodEndDate: string,
    defaultCategory?: MatrixKanbanCategory // Updated parameter for Matrix Kanban
  ) => {
    console.log(`Generating instances for period: ${periodStartDate} to ${periodEndDate}. Default category: ${defaultCategory}`);

    // Generate raw instances based on definitions and date range
    // Only generate instances for active (not archived) definitions
    const activeDefinitions = choreDefinitions.filter(def => !def.isComplete);

    const definitionsForGeneration = activeDefinitions.map(def => {
      if (def.earlyStartDate && def.dueDate) {
        const earlyStartDateObj = new Date(def.earlyStartDate);
        const dueDateObj = new Date(def.dueDate);
        if (earlyStartDateObj < dueDateObj) {
          // Use earlyStartDate as the effective start for generation logic
          // by temporarily overriding dueDate for generateChoreInstances.
          // The original ChoreDefinition in state remains unchanged.
          return { ...def, dueDate: def.earlyStartDate };
        }
      }
      return def;
    });

    const rawNewInstances = generateChoreInstances(
      definitionsForGeneration,
      periodStartDate,
      periodEndDate
    );

    const newInstancesWithMatrixFields = rawNewInstances.map(rawInstance => {
      const definition = choreDefinitions.find(def => def.id === rawInstance.choreDefinitionId);
      let initialSubtaskCompletions: Record<string, boolean> = {};
      if (definition && definition.subTasks) {
        definition.subTasks.forEach(st => {
          initialSubtaskCompletions[st.id] = st.isComplete || false;
        });
      }
      return {
        ...rawInstance,
        isComplete: false,
        categoryStatus: defaultCategory || "TO_DO",
        subtaskCompletions: initialSubtaskCompletions,
        previousSubtaskCompletions: undefined,
      };
    });

    setChoreInstances(prevInstances => {
      // Remove old instances for the period, for all kids
      const outsideOfPeriod = prevInstances.filter(inst => {
        const instDate = new Date(inst.instanceDate);
        instDate.setUTCHours(0,0,0,0);
        const periodStartNorm = new Date(periodStartDate);
        periodStartNorm.setUTCHours(0,0,0,0);
        const periodEndNorm = new Date(periodEndDate);
        periodEndNorm.setUTCHours(0,0,0,0);
        return instDate < periodStartNorm || instDate > periodEndNorm;
      });

      // Preserve existing data for instances that already exist
      const updatedGeneratedForPeriod = newInstancesWithMatrixFields.map(newInstance => {
        const oldMatchingInstance = prevInstances.find(oldInst => oldInst.id === newInstance.id);
        if (oldMatchingInstance) {
          return {
            ...newInstance,
            isComplete: oldMatchingInstance.isComplete,
            categoryStatus: oldMatchingInstance.categoryStatus,
            subtaskCompletions: oldMatchingInstance.subtaskCompletions,
            previousSubtaskCompletions: oldMatchingInstance.previousSubtaskCompletions,
          };
        }
        return newInstance;
      });

      return [...outsideOfPeriod, ...updatedGeneratedForPeriod];
    });
  }, [choreDefinitions, setChoreInstances]);

  // toggleSubTaskComplete (old version operating on definitions) has been removed.
  // updateKanbanChoreOrder has been removed.
  // updateChoreInstanceColumn has been removed.

  const toggleSubtaskCompletionOnInstance = useCallback((instanceId: string, subtaskId: string) => {
    setChoreInstances(prevInstances => {
      const instanceIndex = prevInstances.findIndex(inst => inst.id === instanceId);
      if (instanceIndex === -1) return prevInstances;

      const currentInstance = prevInstances[instanceIndex];
      const definition = choreDefinitions.find(def => def.id === currentInstance.choreDefinitionId);

      // Should not happen if data is consistent, but good to check.
      if (!definition) return prevInstances;

      // 1. Toggle the subtask
      const newSubtaskCompletions = {
        ...currentInstance.subtaskCompletions,
        [subtaskId]: !currentInstance.subtaskCompletions?.[subtaskId],
      };

      let updatedInstance = {
        ...currentInstance,
        subtaskCompletions: newSubtaskCompletions
      };
      let newCategoryForAutoMove: MatrixKanbanCategory | null = null;

      // Determine if all subtasks are complete
      // Handles case with no subtasks (allSubtasksComplete will be true)
      const allSubtasksComplete = definition.subTasks && definition.subTasks.length > 0
        ? definition.subTasks.every(st => !!updatedInstance.subtaskCompletions[st.id])
        : true;

      // 2. Determine if automated category change is needed
      if (updatedInstance.categoryStatus === "TO_DO") {
        // If any subtask is now complete (and not all of them, which is handled next)
        const anySubtaskComplete = definition.subTasks && definition.subTasks.length > 0
          ? definition.subTasks.some(st => !!updatedInstance.subtaskCompletions[st.id])
          : false; // No subtasks means none are "partially" complete for this rule.

        if (anySubtaskComplete && !allSubtasksComplete) {
          newCategoryForAutoMove = "IN_PROGRESS";
        }
      }

      // This check can override the TO_DO -> IN_PROGRESS if checking the last subtask makes all complete.
      // Also handles moving from IN_PROGRESS -> COMPLETED.
      if (allSubtasksComplete && updatedInstance.categoryStatus !== "COMPLETED") {
        newCategoryForAutoMove = "COMPLETED";
      }

      // 3. If an automated move is determined, apply category change logic (from updateChoreInstanceCategory)
      if (newCategoryForAutoMove) {
        let finalSubtaskCompletions = { ...updatedInstance.subtaskCompletions };
        let finalPreviousSubtaskCompletions = updatedInstance.previousSubtaskCompletions;
        let finalOverallInstanceComplete = updatedInstance.isComplete; // Start with current

        const oldCategoryForAutoMove = updatedInstance.categoryStatus; // Category before this auto-move

        if (newCategoryForAutoMove === "COMPLETED") {
          finalPreviousSubtaskCompletions = { ...updatedInstance.subtaskCompletions };
          if (definition.subTasks && definition.subTasks.length > 0) {
            definition.subTasks.forEach(st => finalSubtaskCompletions[st.id] = true);
          } else {
            finalSubtaskCompletions = {};
          }
          finalOverallInstanceComplete = true;
        } else if (oldCategoryForAutoMove === "COMPLETED" && newCategoryForAutoMove === "IN_PROGRESS") {
          // This specific auto-move (COMPLETED -> IN_PROGRESS) is not typically triggered by subtask toggle,
          // but by direct drag. Included for completeness if a subtask uncheck could trigger it.
          if (updatedInstance.previousSubtaskCompletions) {
            finalSubtaskCompletions = { ...updatedInstance.previousSubtaskCompletions };
          }
          finalPreviousSubtaskCompletions = undefined;
          if (definition.subTasks && definition.subTasks.length > 0) {
            finalOverallInstanceComplete = definition.subTasks.every(st => !!finalSubtaskCompletions[st.id]);
          } else {
            finalOverallInstanceComplete = false;
          }
        } else if (newCategoryForAutoMove === "TO_DO") { // Should not happen from subtask toggle if already in TO_DO or IN_PROGRESS
            // This case is mostly for direct moves, but if logic leads here:
            if (definition.subTasks && definition.subTasks.length > 0) {
                definition.subTasks.forEach(st => finalSubtaskCompletions[st.id] = false);
            } else {
                finalSubtaskCompletions = {};
            }
            finalPreviousSubtaskCompletions = undefined;
            finalOverallInstanceComplete = false;
        } else if (newCategoryForAutoMove === "IN_PROGRESS") { // Moving from TO_DO
            if (definition.subTasks && definition.subTasks.length > 0) {
                finalOverallInstanceComplete = definition.subTasks.every(st => !!finalSubtaskCompletions[st.id]);
            } else { // No subtasks, cannot be "complete by subtasks"
                finalOverallInstanceComplete = false;
            }
        }

        updatedInstance = {
          ...updatedInstance,
          categoryStatus: newCategoryForAutoMove,
          subtaskCompletions: finalSubtaskCompletions,
          previousSubtaskCompletions: finalPreviousSubtaskCompletions,
          isComplete: finalOverallInstanceComplete,
        };
      } else { // No category change, but update isComplete if in IN_PROGRESS or TO_DO
        if (updatedInstance.categoryStatus === "IN_PROGRESS") {
          if (definition.subTasks && definition.subTasks.length > 0) {
            updatedInstance.isComplete = definition.subTasks.every(st => !!updatedInstance.subtaskCompletions[st.id]);
          } else { // No subtasks
            updatedInstance.isComplete = false; // Not in COMPLETED category, so not "complete"
          }
        } else if (updatedInstance.categoryStatus === "TO_DO") {
          updatedInstance.isComplete = false; // Always false in TO_DO
        }
        // If category is COMPLETED, isComplete is true and handled by direct moves or the allSubtasksComplete logic above.
      }

      const finalInstances = [...prevInstances];
      finalInstances[instanceIndex] = updatedInstance;
      return finalInstances;
    });
  }, [choreDefinitions, setChoreInstances]);

  /**
   * Toggles the active state of a chore definition.
   * The `isComplete` field on a ChoreDefinition is used to signify if the definition
   * is "active" (false, meaning new instances can be generated) or "archived/inactive" (true).
   * This does not affect the completion status of existing chore instances.
   * @param {string} definitionId - The ID of the chore definition to toggle.
   */
  const toggleChoreDefinitionActiveState = useCallback((definitionId: string) => {
    setChoreDefinitions(prevDefs =>
      prevDefs.map(def =>
        def.id === definitionId ? { ...def, isComplete: !def.isComplete } : def
      )
    );
    // Note: isComplete on ChoreDefinition might mean "archived" or "inactive for new instances".
    // This won't affect existing chore instances' completion status.
  }, [setChoreDefinitions]);

  const updateChoreInstanceCategory = useCallback((
    instanceId: string,
    newCategory: MatrixKanbanCategory,
  ) => {
    setChoreInstances(prevInstances =>
      prevInstances.map(instance => {
        if (instance.id === instanceId) {
          const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
          if (!definition) {
            console.warn(`Definition not found for instance ${instanceId} during category update.`);
            return instance;
          }
          let updatedSubtaskCompletions = { ...instance.subtaskCompletions };
          let updatedPreviousSubtaskCompletions = instance.previousSubtaskCompletions;
          let overallInstanceComplete = instance.isComplete;

          const oldCategory = instance.categoryStatus;

          if (newCategory === "COMPLETED") {
            updatedPreviousSubtaskCompletions = { ...instance.subtaskCompletions }; // Store current state
            if (definition && definition.subTasks && definition.subTasks.length > 0) {
              definition.subTasks.forEach(st => updatedSubtaskCompletions[st.id] = true);
            } else { // No subtasks, chore is complete by moving to COMPLETED
              updatedSubtaskCompletions = {}; // Ensure it's an object
            }
            overallInstanceComplete = true;
          } else if (oldCategory === "COMPLETED" && newCategory === "IN_PROGRESS") {
            if (instance.previousSubtaskCompletions) {
              updatedSubtaskCompletions = { ...instance.previousSubtaskCompletions };
            }
            updatedPreviousSubtaskCompletions = undefined;
            // Recalculate completion based on restored subtasks
            if (definition && definition.subTasks && definition.subTasks.length > 0) {
              overallInstanceComplete = definition.subTasks.every(st => !!updatedSubtaskCompletions[st.id]);
            } else { // No subtasks
              overallInstanceComplete = false; // Cannot be "complete" by subtask logic if not in COMPLETED category
            }
          } else if (newCategory === "TO_DO") {
            if (definition && definition.subTasks && definition.subTasks.length > 0) {
              definition.subTasks.forEach(st => updatedSubtaskCompletions[st.id] = false);
            } else {
              updatedSubtaskCompletions = {};
            }
            updatedPreviousSubtaskCompletions = undefined;
            overallInstanceComplete = false;
          } else if (newCategory === "IN_PROGRESS") {
              // If moving to IN_PROGRESS (not from COMPLETED), isComplete depends on subtasks
              if (definition && definition.subTasks && definition.subTasks.length > 0) {
                  overallInstanceComplete = definition.subTasks.every(st => !!updatedSubtaskCompletions[st.id]);
              } else { // No subtasks
                  overallInstanceComplete = false; // Not in COMPLETED, and no subtasks to make it complete by that rule
              }
          }
          // If it's none of the above specific category transitions,
          // isComplete should ideally be re-evaluated based on subtasks for IN_PROGRESS,
          // or remain as is if subtasks aren't the sole determinant.
          // For now, the above conditions cover primary cases.
          // An instance moved to IN_PROGRESS without subtasks is not 'isComplete'.
          // An instance moved to TO_DO is not 'isComplete'.

          return {
            ...instance,
            categoryStatus: newCategory,
            subtaskCompletions: updatedSubtaskCompletions,
            previousSubtaskCompletions: updatedPreviousSubtaskCompletions,
            isComplete: overallInstanceComplete,
          };
        }
        return instance;
      })
    );
  }, [choreDefinitions, setChoreInstances]);

  // Helper function for single instance category update logic (extracted and adapted from existing updateChoreInstanceCategory)
  const applyCategoryUpdateToInstance = (
    instance: ChoreInstance,
    newCategory: MatrixKanbanCategory,
    definition?: ChoreDefinition
  ): ChoreInstance => {
    if (!definition) return instance; // Should not happen if called correctly

    let updatedSubtaskCompletions = { ...instance.subtaskCompletions };
    let updatedPreviousSubtaskCompletions = instance.previousSubtaskCompletions;
    let overallInstanceComplete = instance.isComplete;
    const oldCategory = instance.categoryStatus;

    if (newCategory === "COMPLETED") {
      updatedPreviousSubtaskCompletions = { ...instance.subtaskCompletions };
      if (definition.subTasks && definition.subTasks.length > 0) {
        definition.subTasks.forEach(st => updatedSubtaskCompletions[st.id] = true);
      } else {
        updatedSubtaskCompletions = {};
      }
      overallInstanceComplete = true;
    } else if (oldCategory === "COMPLETED" && newCategory === "IN_PROGRESS") {
      if (instance.previousSubtaskCompletions) {
        updatedSubtaskCompletions = { ...instance.previousSubtaskCompletions };
      }
      updatedPreviousSubtaskCompletions = undefined;
      if (definition.subTasks && definition.subTasks.length > 0) {
        overallInstanceComplete = definition.subTasks.every(st => !!updatedSubtaskCompletions[st.id]);
      } else {
        overallInstanceComplete = false;
      }
    } else if (newCategory === "TO_DO") {
      if (definition.subTasks && definition.subTasks.length > 0) {
        definition.subTasks.forEach(st => updatedSubtaskCompletions[st.id] = false);
      } else {
        updatedSubtaskCompletions = {};
      }
      updatedPreviousSubtaskCompletions = undefined;
      overallInstanceComplete = false;
    } else if (newCategory === "IN_PROGRESS") {
      if (definition.subTasks && definition.subTasks.length > 0) {
        overallInstanceComplete = definition.subTasks.every(st => !!updatedSubtaskCompletions[st.id]);
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
  };


  const updateChoreDefinition = useCallback(async (definitionId: string, updates: Partial<ChoreDefinition>) => {
    setChoreDefinitions(prevDefs =>
      prevDefs.map(def =>
        def.id === definitionId
          ? { ...def, ...updates, updatedAt: new Date().toISOString() } // Assuming ChoreDefinition has updatedAt
          : def
      )
    );
  }, [setChoreDefinitions]);

  const updateChoreInstanceField = useCallback(async (instanceId: string, fieldName: keyof ChoreInstance, value: any) => {
    setChoreInstances(prevInstances =>
      prevInstances.map(inst => {
        if (inst.id === instanceId) {
          // Consider adding 'updatedAt' to ChoreInstance type if it's desired for tracking instance updates
          const updatedInst = { ...inst, [fieldName]: value };
          return updatedInst;
        }
        return inst;
      })
    );
  }, [setChoreInstances]);

  const batchToggleCompleteChoreInstances = useCallback(async (instanceIds: string[], markAsComplete: boolean) => {
    setChoreInstances(prevInstances => {
      return prevInstances.map(instance => {
        if (instanceIds.includes(instance.id)) {
          if (instance.isComplete === markAsComplete) return instance; // No change needed

          const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
          if (!definition) {
            console.warn(`Definition not found for instance ${instance.id} during batch toggle complete.`);
            return instance;
          }

          // Handle reward only when marking as complete and not already complete
          if (markAsComplete && !instance.isComplete && definition.assignedKidId && definition.rewardAmount && definition.rewardAmount > 0) {
            addKidReward(definition.assignedKidId, definition.rewardAmount, `${definition.title} (${instance.instanceDate})`);
          }
          // This should ideally also update categoryStatus and subtasks like updateChoreInstanceCategory
          // For simplicity now, just toggling 'isComplete'.
          // A more robust solution would use applyCategoryUpdateToInstance if marking complete moves to 'COMPLETED' category.
          if (markAsComplete) {
             // If marking complete, and category is not 'COMPLETED', move to 'COMPLETED'
            if (instance.categoryStatus !== 'COMPLETED') {
                return applyCategoryUpdateToInstance(instance, 'COMPLETED', definition);
            } else { // Already in COMPLETED, ensure isComplete is true
                return { ...instance, isComplete: true };
            }
          } else { // Marking incomplete
            // If marking incomplete, and category is 'COMPLETED', move to 'IN_PROGRESS' (or 'TO_DO')
            if (instance.categoryStatus === 'COMPLETED') {
                return applyCategoryUpdateToInstance(instance, 'IN_PROGRESS', definition); // Default to IN_PROGRESS
            } else { // Already in TO_DO or IN_PROGRESS, ensure isComplete is false
                 return { ...instance, isComplete: false };
            }
          }
        }
        return instance;
      });
    });
  }, [choreDefinitions, addKidReward, setChoreInstances]);

  const batchUpdateChoreInstancesCategory = useCallback(async (instanceIds: string[], newCategory: MatrixKanbanCategory) => {
    setChoreInstances(prevInstances =>
      prevInstances.map(instance => {
        if (instanceIds.includes(instance.id)) {
          const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
          if (!definition) {
            console.warn(`Definition not found for instance ${instance.id} during batch category update.`);
            return instance;
          }
          return applyCategoryUpdateToInstance(instance, newCategory, definition);
        }
        return instance;
      })
    );
  }, [choreDefinitions, setChoreInstances]);

  const batchAssignChoreDefinitionsToKid = useCallback(async (definitionIds: string[], newKidId: string | null) => {
    setChoreDefinitions(prevDefs =>
      prevDefs.map(def => {
        if (definitionIds.includes(def.id)) {
          return { ...def, assignedKidId: newKidId || undefined, updatedAt: new Date().toISOString() };
        }
        return def;
      })
    );
  }, [setChoreDefinitions]);


  const contextValue = useMemo(() => ({
    choreDefinitions,
    choreInstances,
    // kanbanChoreOrders, // Removed
    addChoreDefinition,
    toggleChoreInstanceComplete,
    getChoreDefinitionsForKid,
    generateInstancesForPeriod,
    // toggleSubTaskComplete, // Removed
    // updateKanbanChoreOrder, // Removed
    // updateChoreInstanceColumn, // Removed
    toggleChoreDefinitionActiveState,
    toggleSubtaskCompletionOnInstance,
    updateChoreInstanceCategory, // Added new function
    updateChoreDefinition, // Added
    updateChoreInstanceField, // Added
    batchToggleCompleteChoreInstances, // Added
    batchUpdateChoreInstancesCategory, // Added
    batchAssignChoreDefinitionsToKid, // Added
  }), [
    choreDefinitions,
    choreInstances,
    // kanbanChoreOrders, // Removed
    addChoreDefinition,
    toggleChoreInstanceComplete,
    getChoreDefinitionsForKid,
    generateInstancesForPeriod,
    // toggleSubTaskComplete, // Removed
    // updateKanbanChoreOrder, // Removed
    // updateChoreInstanceColumn, // Removed
    toggleChoreDefinitionActiveState,
    toggleSubtaskCompletionOnInstance,
    updateChoreInstanceCategory, // Added new function
    updateChoreDefinition, // Added
    updateChoreInstanceField, // Added
    batchToggleCompleteChoreInstances, // Added
    batchUpdateChoreInstancesCategory, // Added
    batchAssignChoreDefinitionsToKid, // Added
  ]);
  // Note on useCallback/useMemo: All functions (like addChoreDefinition, toggleChoreInstanceComplete)
  // are wrapped in useCallback to stabilize their references. The entire contextValue object
  // is memoized with useMemo. This strategy is crucial for performance optimization,
  // preventing unnecessary re-renders in consumer components, especially those that
  // rely on these functions in useEffect dependency arrays or pass them to memoized children.

  return (
    <ChoresContext.Provider value={contextValue}>
      {children}
    </ChoresContext.Provider>
  );
};
