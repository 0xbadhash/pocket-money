// src/contexts/ChoresContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { ChoreDefinition, ChoreInstance, MatrixKanbanCategory } from '../types'; // Added MatrixKanbanCategory
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
    const rawNewInstances = generateChoreInstances(choreDefinitions, periodStartDate, periodEndDate);

    const newInstancesWithMatrixFields = rawNewInstances.map(rawInstance => {
      const definition = choreDefinitions.find(def => def.id === rawInstance.choreDefinitionId);
      let initialSubtaskCompletions: Record<string, boolean> = {};
      if (definition && definition.subTasks) {
        definition.subTasks.forEach(st => {
          // Initialize based on definition's subTask.isComplete or default to false
          initialSubtaskCompletions[st.id] = st.isComplete || false;
        });
      }

      // This is a ChoreInstance from generateChoreInstances, which might be missing some fields
      // or have fields that need transformation for the new MatrixKanban model.
      // The 'id' and 'instanceDate' from rawInstance are correct.
      // 'choreDefinitionId' is also correct.
      return {
        ...rawInstance, // Includes id, choreDefinitionId, instanceDate
        isComplete: false, // Default for new instances, can be updated by other logic
        categoryStatus: defaultCategory || "TO_DO",
        subtaskCompletions: initialSubtaskCompletions,
        previousSubtaskCompletions: undefined,
        // Ensure kanbanColumnId is not carried over if it existed on rawInstance from an older model
        // However, generateChoreInstances likely doesn't add it anymore.
        // If it did, we'd explicitly unset it here: `kanbanColumnId: undefined,`
      };
    });

    setChoreInstances(prevInstances => {
      // Filter out any old instances that were for the period we are now regenerating
      // This needs to be careful not to remove instances outside the current kid's scope if context becomes multi-kid for instances
      // For now, assuming choreInstances in context are generally for the "active" scope being managed.
      const outsideOfPeriod = prevInstances.filter(inst => {
        const instDate = new Date(inst.instanceDate);
        instDate.setUTCHours(0,0,0,0);
        const periodStartNorm = new Date(periodStartDate);
        periodStartNorm.setUTCHours(0,0,0,0);
        const periodEndNorm = new Date(periodEndDate);
        periodEndNorm.setUTCHours(0,0,0,0);
        return instDate < periodStartNorm || instDate > periodEndNorm;
      });

      // For the newly generated instances (now with Matrix fields),
      // try to preserve existing data if an instance for the same ID (choreDefId + date) already exists.
      const updatedGeneratedForPeriod = newInstancesWithMatrixFields.map(newInstance => {
        const oldMatchingInstance = prevInstances.find(oldInst => oldInst.id === newInstance.id);
        if (oldMatchingInstance) {
          // If old instance exists, preserve its matrix-specific fields and overall completion,
          // but update other details from definition if they changed (already handled by newInstance structure).
          return {
            ...newInstance, // Contains latest from definition (via rawInstance) + default matrix fields
            isComplete: oldMatchingInstance.isComplete,
            categoryStatus: oldMatchingInstance.categoryStatus, // Preserve existing category
            subtaskCompletions: oldMatchingInstance.subtaskCompletions, // Preserve existing subtask completions
            previousSubtaskCompletions: oldMatchingInstance.previousSubtaskCompletions, // Preserve this too
          };
        }
        // If it's a truly new instance (not found in prevInstances), it already has default fields.
        return newInstance;
      });

      return [...outsideOfPeriod, ...updatedGeneratedForPeriod];
    });
  }, [choreDefinitions, setChoreInstances]);

  // toggleSubTaskComplete (old version operating on definitions) has been removed.
  // updateKanbanChoreOrder has been removed.
  // updateChoreInstanceColumn has been removed.

  const toggleSubtaskCompletionOnInstance = useCallback((instanceId: string, subtaskId: string) => {
    setChoreInstances(prevInstances =>
      prevInstances.map(instance => {
        if (instance.id === instanceId) {
          const newSubtaskCompletions = {
            ...instance.subtaskCompletions,
            [subtaskId]: !instance.subtaskCompletions[subtaskId], // Toggle
          };
          // Future: Add logic here to update instance.isComplete or instance.categoryStatus
          // based on all subtasks being completed, if that's a desired behavior.
          return { ...instance, subtaskCompletions: newSubtaskCompletions };
        }
        return instance;
      })
    );
  }, [setChoreInstances]);

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
  }, [choreDefinitions, setChoreInstances]); // Added setChoreInstances, choreDefinitions is correct

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
