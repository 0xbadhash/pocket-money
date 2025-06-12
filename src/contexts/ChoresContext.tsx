// src/contexts/ChoresContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ChoreDefinition, ChoreInstance } from '../types';
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
  /**
   * Object storing custom sort orders for Kanban columns.
   * Keys are typically `${kidId}-${period}_${status}` (e.g., "kid1-daily_active").
   * Values are arrays of chore instance IDs in their custom order.
   */
  kanbanChoreOrders: KanbanChoreOrders;
  /** Adds a new chore definition to the system. */
  addChoreDefinition: (choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete'>) => void;
  /** Toggles the completion status of a specific chore instance. Also handles reward logic. */
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
   * @param {string} [defaultKanbanColumnId] - Optional ID of the default Kanban column to assign to new instances
   *                                           if they don't already have a `kanbanColumnId` (e.g., from a previous generation).
   */
  generateInstancesForPeriod: (startDate: string, endDate: string, defaultKanbanColumnId?: string) => void;
  /** Toggles the completion status of a sub-task within a chore definition. */
  toggleSubTaskComplete: (choreDefinitionId: string, subTaskId: string) => void;
  /**
   * Updates or clears the custom display order for chores in a specific Kanban column for a kid.
   * @param {string} kidId - The ID of the kid.
   * @param {string} columnIdentifier - A unique string identifying the column (e.g., "daily_active").
   * @param {string[]} orderedChoreIds - An array of chore instance IDs in the desired order.
   *                                     Pass an empty array to clear the custom order for the column.
   */
  updateKanbanChoreOrder: (kidId: string, columnIdentifier: string, orderedChoreIds: string[]) => void;
  /**
   * Updates the `kanbanColumnId` of a specific chore instance.
   * @param {string} instanceId - The ID of the chore instance to update.
   * @param {string} newKanbanColumnId - The ID of the new Kanban column for this instance.
   */
  updateChoreInstanceColumn: (instanceId: string, newKanbanColumnId: string) => void;
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

  /**
   * State for managing custom Kanban chore orders.
   * Persisted in localStorage. The key for an order is typically `${kidId}-${columnIdentifier}`,
   * e.g., "kid1-daily_active", and the value is an array of chore instance IDs.
   * @type {[KanbanChoreOrders, React.Dispatch<React.SetStateAction<KanbanChoreOrders>>]}
   */
  const [kanbanChoreOrders, setKanbanChoreOrders] = useState<KanbanChoreOrders>(() => {
    try {
      const savedOrders = localStorage.getItem('kanbanChoreOrders');
      return savedOrders ? JSON.parse(savedOrders) : {};
    } catch (error) {
      console.error("Error parsing kanbanChoreOrders from localStorage:", error);
      return {}; // Return default value in case of error
    }
  });

  const { addKidReward } = useFinancialContext();

  // Effect to save kanbanChoreOrders to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('kanbanChoreOrders', JSON.stringify(kanbanChoreOrders));
    } catch (error) {
      console.error("Error saving kanbanChoreOrders to localStorage:", error);
    }
  }, [kanbanChoreOrders]);

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

  // MODIFIED: Renamed and updated logic
  const addChoreDefinition = (choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete'>) => {
    const newChoreDef: ChoreDefinition = {
      id: `cd${Date.now()}`, // Simple unique ID
      isComplete: false, // New definitions are active by default
      ...choreDefData,
    };
    setChoreDefinitions(prevDefs => [newChoreDef, ...prevDefs]);
  };

  // MODIFIED: Renamed and updated logic for instances
  const toggleChoreInstanceComplete = (instanceId: string) => {
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
  };

  // MODIFIED: Renamed and filters definitions
  const getChoreDefinitionsForKid = (kidId: string): ChoreDefinition[] => {
    return choreDefinitions.filter(def => def.assignedKidId === kidId);
  };

  // MODIFIED: Instance generation logic using utility function
  const generateInstancesForPeriod = (
    periodStartDate: string,
    periodEndDate: string,
    defaultKanbanColumnId?: string // Optional default column ID for new instances
  ) => {
    console.log(`Generating instances for period: ${periodStartDate} to ${periodEndDate}. Default column ID: ${defaultKanbanColumnId}`);
    let newInstances = generateChoreInstances(choreDefinitions, periodStartDate, periodEndDate);

    // Assign defaultKanbanColumnId to newly generated instances if provided,
    // but only if they don't already have one (e.g., from a previous generation if definition didn't change but period did)
    if (defaultKanbanColumnId) {
      newInstances = newInstances.map(instance => ({
        ...instance,
        kanbanColumnId: instance.kanbanColumnId || defaultKanbanColumnId
      }));
    }

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

      // For the newly generated instances, try to preserve completion status and an existing kanbanColumnId
      // if they existed before (e.g. from a previous generation for the same day if definitions changed).
      const updatedGeneratedForPeriod = newInstances.map(newInstance => {
        const oldMatchingInstance = prevInstances.find(oldInst => oldInst.id === newInstance.id);
        if (oldMatchingInstance) {
          return {
            ...newInstance,
            isComplete: oldMatchingInstance.isComplete,
            // Preserve existing kanbanColumnId if it was already set, otherwise use the new default (already set on newInstance if defaultKanbanColumnId was provided)
            kanbanColumnId: oldMatchingInstance.kanbanColumnId || newInstance.kanbanColumnId
          };
        }
        // If it's a truly new instance (not found in prevInstances), it already has defaultKanbanColumnId (if provided) from the step above.
        return newInstance;
      });

      return [...outsideOfPeriod, ...updatedGeneratedForPeriod];
    });
  };

  const toggleSubTaskComplete = (choreDefinitionId: string, subTaskId: string) => {
    setChoreDefinitions(prevDefs =>
      prevDefs.map(def => {
        // Ensure subTasks array exists before mapping
        if (def.id === choreDefinitionId && def.subTasks) {
          const updatedSubTasks = def.subTasks.map(st => {
            if (st.id === subTaskId) {
              return { ...st, isComplete: !st.isComplete };
            }
            return st;
          });
          // Check if all subtasks are now complete to potentially mark main chore def (optional logic)
          // const allSubTasksComplete = updatedSubTasks.every(st => st.isComplete);
          // if (allSubTasksComplete) { /* Logic to update parent chore's isComplete if needed */ }
          return { ...def, subTasks: updatedSubTasks };
        }
        return def;
      })
    );
  };

  /**
   * Updates the custom order of chores for a specific kid and a specific Kanban column identifier.
   * This order is persisted to localStorage. If an empty array is provided for `orderedChoreIds`,
   * the custom order for that specific key is removed, reverting to default sorting for that column.
   *
   * The `columnIdentifier` is typically a string like "daily_active", "weekly_completed", etc.
   * The key stored in `kanbanChoreOrders` and localStorage will be `${kidId}-${columnIdentifier}`.
   *
   * @param {string} kidId - The ID of the kid for whom the order is being set.
   * @param {string} columnIdentifier - A string that uniquely identifies the column context (e.g., "daily_active").
   * @param {string[]} orderedChoreIds - An array of chore instance IDs representing the new custom order.
   *                                     Pass an empty array to clear the custom order for this specific key.
   */
  const updateKanbanChoreOrder = (kidId: string, columnIdentifier: string, orderedChoreIds: string[]): void => {
    const key = `${kidId}-${columnIdentifier}`;
    setKanbanChoreOrders(prevOrders => {
      const newOrders = { ...prevOrders };
      if (orderedChoreIds && orderedChoreIds.length > 0) {
        newOrders[key] = orderedChoreIds;
      } else {
        // If the new order is empty, undefined, or an empty array, remove the key to clear the custom order.
        delete newOrders[key];
      }
      return newOrders;
    });
  };

  /**
   * Updates the `kanbanColumnId` for a specific chore instance, effectively moving it to a new Kanban column.
   * This function is typically called after a drag-and-drop operation moves a chore to a different column.
   * The change is persisted to localStorage via the `useEffect` hook that watches `choreInstances`.
   * @param {string} instanceId - The ID of the chore instance to update.
   * @param {string} newKanbanColumnId - The ID of the new Kanban column this instance should now belong to.
   */
  const updateChoreInstanceColumn = (instanceId: string, newKanbanColumnId: string): void => {
    setChoreInstances(prevInstances =>
      prevInstances.map(instance =>
        instance.id === instanceId
          // Consider adding an 'updatedAt' field to ChoreInstance for more detailed tracking of changes.
          ? { ...instance, kanbanColumnId: newKanbanColumnId }
          : instance
      )
    );
  };

  // MODIFIED: Update provider value
  return (
    <ChoresContext.Provider value={{
      choreDefinitions,
      choreInstances,
      kanbanChoreOrders,
      addChoreDefinition,
      toggleChoreInstanceComplete,
      getChoreDefinitionsForKid,
      generateInstancesForPeriod,
      toggleSubTaskComplete,
      updateKanbanChoreOrder,
      updateChoreInstanceColumn, // Add new function
    }}>
      {children}
    </ChoresContext.Provider>
  );
};
