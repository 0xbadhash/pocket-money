// src/contexts/ChoresContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { ChoreDefinition, ChoreInstance, KanbanColumnConfig } from '../types';
import { useFinancialContext } from '../contexts/FinancialContext';
import { useUserContext } from './UserContext';
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
   * @param {string} [defaultKanbanColumnId] - Optional: The ID of a KanbanColumnConfig for new instances.
   */
  generateInstancesForPeriod: (startDate: string, endDate: string, defaultKanbanColumnId?: string) => void;
  // toggleSubTaskComplete: (choreDefinitionId: string, subTaskId: string) => void; // Removed, operates on instance now
  toggleSubtaskCompletionOnInstance: (instanceId: string, subtaskId: string) => void; // New function
  // updateKanbanChoreOrder: (kidId: string, columnIdentifier: string, orderedChoreIds: string[]) => void; // Removed for Matrix Kanban
  // updateChoreInstanceColumn: (instanceId: string, newKanbanColumnId: string) => void; // Removed, categoryStatus handled differently
  /** Toggles the active state of a chore definition (isComplete field). */
  toggleChoreDefinitionActiveState: (definitionId: string) => void;
  /** Updates the category status (Kanban column ID) of a chore instance. */
  updateChoreInstanceCategory: (
    instanceId: string,
    newStatusId: string,
  ) => void;
  /** Updates specified fields of a chore definition. */
  updateChoreDefinition: (definitionId: string, updates: Partial<ChoreDefinition>) => Promise<void>;
  /** Updates a specific field of a chore instance. */
  updateChoreInstanceField: (instanceId: string, fieldName: keyof ChoreInstance, value: any) => Promise<void>;
  /** Batch marks chore instances as complete or incomplete. */
  batchToggleCompleteChoreInstances: (instanceIds: string[], markAsComplete: boolean) => Promise<void>;
  /** Batch updates the category (Kanban column ID) for multiple chore instances. */
  batchUpdateChoreInstancesCategory: (instanceIds: string[], newStatusId: string) => Promise<void>;
  /** Batch assigns chore definitions to a new kid. */
  batchAssignChoreDefinitionsToKid: (definitionIds: string[], newKidId: string | null) => Promise<void>;
  /** Updates a chore definition and its future instances from a given date. */
  updateChoreSeries: (
    definitionId: string,
    updates: Partial<Pick<ChoreDefinition, 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'hour' | 'minute' | 'timeOfDay' | 'priority'>>, // Added priority
    fromDate: string, // YYYY-MM-DD, instanceDate of the item that was edited
    fieldName: 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'timeOfDay' | 'priority' // Added priority
  ) => Promise<void>;
  addCommentToInstance: (instanceId: string, commentText: string, userId: string, userName: string) => Promise<void>;
  toggleSkipInstance: (instanceId: string) => Promise<void>;
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

// Default initial state for development if localStorage is empty
const defaultInitialDefinitions: ChoreDefinition[] = [
  {
    id: 'cd1_default', title: 'Clean Room (Daily) - Default', assignedKidId: 'kid_a_default', dueDate: '2023-12-01',
    rewardAmount: 1, isComplete: false, recurrenceType: 'daily', recurrenceEndDate: '2023-12-05',
    tags: ['cleaning', 'indoor'], subTasks: [ { id: 'st1_1', title: 'Make bed', isComplete: false } ],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
  // Add more default definitions if needed for a baseline usable state
];

export const ChoresProvider: React.FC<ChoresProviderProps> = ({ children }) => {
  const [choreDefinitions, setChoreDefinitions] = useState<ChoreDefinition[]>([]);
  const [choreInstances, setChoreInstances] = useState<ChoreInstance[]>([]);
  const { getKanbanColumnConfigs, user: currentUser } = useUserContext(); // Get column configs and current user

  // Internal helper to log activity
  const logActivity = (
    instance: ChoreInstance,
    action: string,
    userId?: string,
    userName?: string,
    details?: string
  ): ChoreInstance => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId: userId || currentUser?.id || 'system_user',
      userName: userName || currentUser?.username || 'System',
      details,
    };
    // Ensure activityLog exists and is an array, then prepend
    const existingLog = Array.isArray(instance.activityLog) ? instance.activityLog : [];
    return {
      ...instance,
      activityLog: [logEntry, ...existingLog],
    };
  };

  // Load data from localStorage on initial mount
  useEffect(() => {
    try {
      const storedDefinitions = localStorage.getItem('choreDefinitions');
      if (storedDefinitions) {
        setChoreDefinitions(JSON.parse(storedDefinitions));
      } else {
        setChoreDefinitions(defaultInitialDefinitions); // Fallback to defaults if nothing in localStorage
      }
    } catch (error) {
      console.error("Failed to load chore definitions from localStorage:", error);
      setChoreDefinitions(defaultInitialDefinitions); // Fallback on error
    }

    try {
      const storedInstances = localStorage.getItem('choreInstances');
      if (storedInstances) {
        setChoreInstances(JSON.parse(storedInstances));
      } else {
        setChoreInstances([]); // Start with empty instances if nothing in localStorage
      }
    } catch (error) {
      console.error("Failed to load chore instances from localStorage:", error);
      setChoreInstances([]); // Fallback on error
    }
  }, []); // Empty dependency array ensures this runs only on mount

  // The choreDefinitions and choreInstances states are initialized above by useEffect,
  // loading from localStorage or using defaults. The old hardcoded useState initialization
  // has been completely removed to prevent syntax errors and ensure correct data loading.

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
      prevInstances.map(inst => {
        if (inst.id === instanceId) {
          let updatedInst = { ...inst, isComplete: !inst.isComplete };
          updatedInst = logActivity(updatedInst, updatedInst.isComplete ? 'Marked Complete' : 'Marked Incomplete', currentUser?.id, currentUser?.username);
          return updatedInst;
        }
        return inst;
      })
    );
  }, [choreInstances, choreDefinitions, addKidReward, setChoreInstances, currentUser]);

  const getChoreDefinitionsForKid = useCallback((kidId: string): ChoreDefinition[] => {
    return choreDefinitions.filter(def => def.assignedKidId === kidId);
  }, [choreDefinitions]);

  const generateInstancesForPeriod = useCallback((
    periodStartDate: string,
    periodEndDate: string,
    defaultKanbanColumnId?: string
  ) => {
    console.log(`Generating instances for period: ${periodStartDate} to ${periodEndDate}. Default status ID: ${defaultKanbanColumnId}`);

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
        categoryStatus: defaultKanbanColumnId || "", // Use provided ID or empty string
        subtaskCompletions: initialSubtaskCompletions,
        previousSubtaskCompletions: undefined,
        priority: definition?.priority, // Initialize from definition
        instanceComments: [], // Initialize as empty array
        isSkipped: false, // Initialize isSkipped
        activityLog: [], // Initialize activityLog
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
          // Prioritize all fields from oldMatchingInstance, then fill in any gaps with newInstance
          // This ensures that if an old instance existed, its state is fully preserved.
          // newInstance here primarily serves to confirm the instance *should* exist in the period
          // and provides the most basic structure if oldMatchingInstance was somehow incomplete.
          return {
            ...newInstance, // Provides basic structure like ID, choreDefinitionId, instanceDate
            ...oldMatchingInstance, // Overrides with all preserved fields from the actual old instance
          };
        }
        // If it's a truly new instance (no matching old one), return it as is (already has defaults)
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

      let currentInstance = prevInstances[instanceIndex]; // Use let to allow reassignment after logging
      const definition = choreDefinitions.find(def => def.id === currentInstance.choreDefinitionId);

      if (!definition) return prevInstances;

      const newSubtaskCompletions = {
        ...currentInstance.subtaskCompletions,
        [subtaskId]: !currentInstance.subtaskCompletions?.[subtaskId],
      };

      currentInstance = { ...currentInstance, subtaskCompletions: newSubtaskCompletions };

      const subtaskTitle = definition.subTasks?.find(st => st.id === subtaskId)?.title || 'Unknown Subtask';
      const newCompletionState = currentInstance.subtaskCompletions[subtaskId];
      currentInstance = logActivity(currentInstance, 'Subtask Toggled', currentUser?.id, currentUser?.username, `'${subtaskTitle}' to ${newCompletionState ? 'Complete' : 'Incomplete'}`);

      const allSubtasksComplete = definition.subTasks && definition.subTasks.length > 0
        ? definition.subTasks.every(st => !!currentInstance.subtaskCompletions[st.id])
        : true;

      const kidKanbanColumns = definition.assignedKidId ? getKanbanColumnConfigs(definition.assignedKidId) : [];
      const currentColumnConfig = kidKanbanColumns.find(col => col.id === currentInstance.categoryStatus);

      let categoryChanged = false;
      const originalStatus = currentInstance.categoryStatus;

      if (allSubtasksComplete && currentColumnConfig && !currentColumnConfig.isCompletedColumn) {
        const firstDoneColumn = kidKanbanColumns.find(col => col.isCompletedColumn);
        if (firstDoneColumn) {
          currentInstance.isComplete = true;
          currentInstance.previousSubtaskCompletions = { ...currentInstance.subtaskCompletions };
          currentInstance.categoryStatus = firstDoneColumn.id;
          categoryChanged = true;
        } else {
          currentInstance.isComplete = true;
        }
      } else if (!allSubtasksComplete && currentColumnConfig && currentColumnConfig.isCompletedColumn) {
        const firstNonDoneColumn = kidKanbanColumns.find(col => !col.isCompletedColumn) || kidKanbanColumns[0];
        if (firstNonDoneColumn) {
          currentInstance.isComplete = false;
          if (currentInstance.previousSubtaskCompletions) {
            currentInstance.subtaskCompletions = { ...currentInstance.previousSubtaskCompletions };
            currentInstance.previousSubtaskCompletions = undefined;
          }
          currentInstance.categoryStatus = firstNonDoneColumn.id;
          categoryChanged = true;
        }
      } else {
        if (!currentColumnConfig || !currentColumnConfig.isCompletedColumn) {
          currentInstance.isComplete = allSubtasksComplete;
        }
      }

      if (categoryChanged && originalStatus !== currentInstance.categoryStatus) {
         const newColTitle = kidKanbanColumns.find(col => col.id === currentInstance.categoryStatus)?.title || currentInstance.categoryStatus;
         currentInstance = logActivity(currentInstance, 'Status Changed (Auto)', currentUser?.id, currentUser?.username, `to '${newColTitle}' due to subtask update`);
      }

      const finalInstances = [...prevInstances];
      finalInstances[instanceIndex] = currentInstance;
      return finalInstances;
    });
  }, [choreDefinitions, setChoreInstances, getKanbanColumnConfigs, currentUser]);

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
    newStatusId: string,
  ) => {
    setChoreInstances(prevInstances =>
      prevInstances.map(currentInst => { // Changed variable name to avoid conflict
        if (currentInst.id === instanceId) {
          const definition = choreDefinitions.find(def => def.id === currentInst.choreDefinitionId);
          if (!definition || !definition.assignedKidId) return currentInst;

          const kidKanbanColumns = getKanbanColumnConfigs(definition.assignedKidId);
          const newColumnConfig = kidKanbanColumns.find(col => col.id === newStatusId);
          const oldColumnConfig = kidKanbanColumns.find(col => col.id === currentInst.categoryStatus);

          // Avoid logging if status hasn't actually changed
          if (currentInst.categoryStatus === newStatusId) return currentInst;

          let updatedInstance = { ...currentInst, categoryStatus: newStatusId };

          if (newColumnConfig?.isCompletedColumn) {
            updatedInstance.isComplete = true;
            if (Object.keys(currentInst.subtaskCompletions || {}).length > 0 || (definition.subTasks && definition.subTasks.length > 0)) {
              updatedInstance.previousSubtaskCompletions = { ...currentInst.subtaskCompletions };
              const allTrueSubtasks: Record<string, boolean> = {};
              (definition.subTasks || []).forEach(st => allTrueSubtasks[st.id] = true);
              updatedInstance.subtaskCompletions = allTrueSubtasks;
            }
          } else if (oldColumnConfig?.isCompletedColumn && (!newColumnConfig || !newColumnConfig.isCompletedColumn)) {
            // Moving from a completed column to a non-completed one
            updatedInstance.isComplete = false;
            if (updatedInstance.previousSubtaskCompletions) {
              updatedInstance.subtaskCompletions = { ...updatedInstance.previousSubtaskCompletions };
              updatedInstance.previousSubtaskCompletions = undefined;
            }
            const allSubtasksStillComplete = definition.subTasks && definition.subTasks.length > 0
              ? definition.subTasks.every(st => !!updatedInstance.subtaskCompletions[st.id])
              : false;
            updatedInstance.isComplete = allSubtasksStillComplete;
          }

          const newColTitle = newColumnConfig?.title || newStatusId;
          updatedInstance = logActivity(updatedInstance, 'Status Changed', currentUser?.id, currentUser?.username, `to '${newColTitle}'`);

          return updatedInstance;
        }
        return currentInst;
      })
    );
  }, [setChoreInstances, choreDefinitions, getKanbanColumnConfigs, currentUser]);

  // applyCategoryUpdateToInstance is removed as its simplified version is no longer sufficient
  // and the logic is now directly in batchToggleCompleteChoreInstances and updateChoreInstanceCategory.

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
          let updatedInst = { ...inst, [fieldName]: value };
          // Log specific field changes
          if (fieldName === 'priority') {
            updatedInst = logActivity(updatedInst, 'Priority Changed', currentUser?.id, currentUser?.username, `to ${value || 'Default'}`);
          } else if (fieldName === 'instanceDate') {
            updatedInst = logActivity(updatedInst, 'Date Changed', currentUser?.id, currentUser?.username, `to ${value}`);
          } else if (fieldName === 'overriddenRewardAmount') {
             const definition = choreDefinitions.find(def => def.id === inst.choreDefinitionId);
             const baseReward = definition?.rewardAmount ?? 0;
             const newReward = value !== undefined ? value : baseReward; // If undefined, it means reset to base
            updatedInst = logActivity(updatedInst, 'Reward Changed', currentUser?.id, currentUser?.username, `to $${Number(newReward).toFixed(2)}`);
          }
          // Add more else if blocks for other fields if needed
          return updatedInst;
        }
        return inst;
      })
    );
  }, [setChoreInstances, choreDefinitions, currentUser]);

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
          let updatedInstance = { ...instance };
          const originalStatus = instance.categoryStatus; // For logging category change

          if (markAsComplete) {
            updatedInstance.isComplete = true;
            if (definition.assignedKidId) {
              const kidKanbanColumns = getKanbanColumnConfigs(definition.assignedKidId);
              const doneColumn = kidKanbanColumns.find(col => col.isCompletedColumn);
              if (doneColumn) updatedInstance.categoryStatus = doneColumn.id;
            }
            if (Object.keys(updatedInstance.subtaskCompletions || {}).length > 0 || (definition.subTasks && definition.subTasks.length > 0)) {
              updatedInstance.previousSubtaskCompletions = { ...updatedInstance.subtaskCompletions };
              const allTrueSubtasks: Record<string, boolean> = {};
              (definition.subTasks || []).forEach(st => allTrueSubtasks[st.id] = true);
              updatedInstance.subtaskCompletions = allTrueSubtasks;
            }
          } else { // Marking as incomplete
            updatedInstance.isComplete = false;
            if (definition.assignedKidId) {
              const kidKanbanColumns = getKanbanColumnConfigs(definition.assignedKidId);
              const firstNonDoneColumn = kidKanbanColumns.find(col => !col.isCompletedColumn) || kidKanbanColumns[0];
              if (firstNonDoneColumn) updatedInstance.categoryStatus = firstNonDoneColumn.id;
            }
            if (updatedInstance.previousSubtaskCompletions) {
              updatedInstance.subtaskCompletions = { ...updatedInstance.previousSubtaskCompletions };
              updatedInstance.previousSubtaskCompletions = undefined;
            }
          }

          updatedInstance = logActivity(updatedInstance, updatedInstance.isComplete ? 'Marked Complete (Batch)' : 'Marked Incomplete (Batch)', currentUser?.id, currentUser?.username);
          if (originalStatus !== updatedInstance.categoryStatus) {
             const newColTitle = getKanbanColumnConfigs(definition.assignedKidId!).find(col => col.id === updatedInstance.categoryStatus)?.title || updatedInstance.categoryStatus;
             updatedInstance = logActivity(updatedInstance, 'Status Changed (Batch Auto)', currentUser?.id, currentUser?.username, `to '${newColTitle}' due to batch completion change`);
          }
          return updatedInstance;
        }
        return instance;
      });
    });
  }, [choreDefinitions, addKidReward, setChoreInstances, getKanbanColumnConfigs, currentUser]);

  const batchUpdateChoreInstancesCategory = useCallback(async (instanceIds: string[], newStatusId: string) => {
    setChoreInstances(prevInstances =>
      prevInstances.map(inst => { // Changed instance to inst
        if (instanceIds.includes(inst.id)) {
          const definition = choreDefinitions.find(def => def.id === inst.choreDefinitionId);
          if (!definition || !definition.assignedKidId) return inst;

          const kidKanbanColumns = getKanbanColumnConfigs(definition.assignedKidId);
          const newColumnConfig = kidKanbanColumns.find(col => col.id === newStatusId);
          const oldColumnConfig = kidKanbanColumns.find(col => col.id === inst.categoryStatus);

          if (inst.categoryStatus === newStatusId) return inst; // No actual change

          let updatedInstance = { ...inst, categoryStatus: newStatusId };

          if (newColumnConfig?.isCompletedColumn) {
            updatedInstance.isComplete = true;
            if (Object.keys(inst.subtaskCompletions || {}).length > 0 || (definition.subTasks && definition.subTasks.length > 0)) {
              updatedInstance.previousSubtaskCompletions = { ...inst.subtaskCompletions };
              const allTrueSubtasks: Record<string, boolean> = {};
              (definition.subTasks || []).forEach(st => allTrueSubtasks[st.id] = true);
              updatedInstance.subtaskCompletions = allTrueSubtasks;
            }
          } else if (oldColumnConfig?.isCompletedColumn && (!newColumnConfig || !newColumnConfig.isCompletedColumn)) {
            updatedInstance.isComplete = false;
            if (updatedInstance.previousSubtaskCompletions) {
              updatedInstance.subtaskCompletions = { ...updatedInstance.previousSubtaskCompletions };
              updatedInstance.previousSubtaskCompletions = undefined;
            }
            const allSubtasksStillComplete = definition.subTasks && definition.subTasks.length > 0
              ? definition.subTasks.every(st => !!updatedInstance.subtaskCompletions[st.id])
              : false;
            updatedInstance.isComplete = allSubtasksStillComplete;
          }

          const newColTitle = newColumnConfig?.title || newStatusId;
          updatedInstance = logActivity(updatedInstance, 'Status Changed (Batch)', currentUser?.id, currentUser?.username, `to '${newColTitle}'`);

          return updatedInstance;
        }
        return inst; // Changed instance to inst
      })
    );
  }, [setChoreInstances, choreDefinitions, getKanbanColumnConfigs, currentUser]);

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

  const updateChoreSeries = useCallback(async (
    definitionId: string,
    updates: Partial<Pick<ChoreDefinition, 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'hour' | 'minute' | 'timeOfDay' | 'priority'>>,
    fromDate: string, // YYYY-MM-DD format
    fieldName: 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'timeOfDay' | 'priority'
  ) => {
    setChoreDefinitions(prevDefs => {
      const definitionIndex = prevDefs.findIndex(d => d.id === definitionId);
      if (definitionIndex === -1) {
        console.error(`[updateChoreSeries] Definition with ID ${definitionId} not found.`);
        return prevDefs;
      }
      const originalDefinition = prevDefs[definitionIndex];

      let updatedDefinitionFields = { ...updates };

      // If dueDate is being updated, it's the primary field in 'updates'.
      // Other fields are applied directly.
      // Ensure subTasks have IDs if they are new, or preserve existing IDs.
      if (updates.subTasks) {
        updatedDefinitionFields.subTasks = updates.subTasks.map((st, index) => ({
          id: st.id || `st_${Date.now()}_${index}`, // Assign ID if new
          ...st,
        }));
      }

      const newDefinition: ChoreDefinition = {
        ...originalDefinition,
        ...updatedDefinitionFields,
        updatedAt: new Date().toISOString(),
      };

      const newDefinitions = [...prevDefs];
      newDefinitions[definitionIndex] = newDefinition;

      // Now handle instances
      setChoreInstances(prevInstances => {
        const instancesToKeep = prevInstances.filter(inst =>
          inst.choreDefinitionId !== definitionId || inst.instanceDate < fromDate
        );

        // Determine regeneration period
        // Default to 1 year from 'fromDate' if no recurrenceEndDate
        let regenerationEndDate = newDefinition.recurrenceEndDate;
        if (!regenerationEndDate) {
          const fromDateObj = new Date(fromDate);
          fromDateObj.setFullYear(fromDateObj.getFullYear() + 1);
          regenerationEndDate = fromDateObj.toISOString().split('T')[0];
        }

        let newFutureInstances: ChoreInstance[] = [];
        if (newDefinition.recurrenceType && !newDefinition.isComplete) { // Only generate if recurring and active
            const rawNewFutureInstances = generateChoreInstances(
                [newDefinition], // Generate only for the updated definition
                fromDate,        // Start from the specified fromDate
                regenerationEndDate
            );

            newFutureInstances = rawNewFutureInstances.map(rawInstance => {
                let initialSubtaskCompletions: Record<string, boolean> = {};
                if (newDefinition.subTasks) {
                    newDefinition.subTasks.forEach(st => {
                    initialSubtaskCompletions[st.id] = st.isComplete || false;
                    });
                }
                return {
                    ...rawInstance,
                    isComplete: false,
                    categoryStatus: "", // Default for new series instances, using empty string
                    subtaskCompletions: initialSubtaskCompletions,
                    previousSubtaskCompletions: undefined,
                    priority: newDefinition.priority, // Carry over priority
                    instanceComments: [], // Initialize as empty array
                    isSkipped: false, // Initialize isSkipped for regenerated instances
                    activityLog: [], // Initialize activityLog for regenerated instances
                };
            });
        }
        return [...instancesToKeep, ...newFutureInstances];
      });

      return newDefinitions;
    });
  }, [setChoreDefinitions, setChoreInstances, currentUser]); // Added currentUser

  const addCommentToInstance = useCallback(async (instanceId: string, commentText: string, userId: string, userName: string) => {
    setChoreInstances(prevInstances =>
      prevInstances.map(inst => {
        if (inst.id === instanceId) {
          const newCommentEntry = {
            id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            userId,
            userName,
            text: commentText,
            createdAt: new Date().toISOString(),
          };
          let updatedInst = { // Use 'inst' here
            ...inst,
            instanceComments: [...(inst.instanceComments || []), newCommentEntry],
          };
          updatedInst = logActivity(updatedInst, 'Comment Added', userId, userName, `"${commentText.substring(0, 30)}${commentText.length > 30 ? '...' : ''}"`);
          return updatedInst;
        }
        return inst; // Use 'inst' here
      })
    );
  }, [setChoreInstances, currentUser]);

  const toggleSkipInstance = useCallback(async (instanceId: string) => {
    setChoreInstances(prevInstances =>
      prevInstances.map(inst => { // Changed 'instance' to 'inst'
        if (inst.id === instanceId) {
          let updatedInst = { ...inst, isSkipped: !inst.isSkipped }; // Use 'inst'
          updatedInst = logActivity(updatedInst, updatedInst.isSkipped ? 'Instance Skipped' : 'Instance Unskipped', currentUser?.id, currentUser?.username);
          return updatedInst;
        }
        return inst; // Use 'inst'
      })
    );
  }, [setChoreInstances, currentUser]);


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
    updateChoreSeries, // Added new function
    addCommentToInstance, // Added new function
    toggleSkipInstance, // Added new function
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
    updateChoreSeries, // Added new function
    addCommentToInstance, // Added new function
    toggleSkipInstance, // Added new function
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
