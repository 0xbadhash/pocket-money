// src/contexts/ChoresContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { ChoreDefinition, ChoreInstance, MatrixKanbanCategory } from '../types';
import { useFinancialContext } from '../contexts/FinancialContext';
import { ChoreService } from '../services/choreService';

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
export interface ChoresContextType {
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
  updateChoreInstanceField: (instanceId: string, fieldName: keyof ChoreInstance, value: string | number | boolean | MatrixKanbanCategory | Record<string, boolean> | undefined) => Promise<void>;
  /** Batch marks chore instances as complete or incomplete. */
  batchToggleCompleteChoreInstances: (instanceIds: string[], markAsComplete: boolean) => Promise<void>;
  /** Batch updates the category for multiple chore instances. */
  batchUpdateChoreInstancesCategory: (instanceIds: string[], newCategory: MatrixKanbanCategory) => Promise<void>;
  /** Batch assigns chore definitions to a new kid. */
  batchAssignChoreDefinitionsToKid: (definitionIds: string[], newKidId: string | null) => Promise<void>;
  /** Updates a chore definition and its future instances from a given date. */
  updateChoreSeries: (
    definitionId: string,
    updates: Partial<Pick<ChoreDefinition, 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'timeOfDay'>>,
    fromDate: string, // YYYY-MM-DD, instanceDate of the item that was edited
    fieldName: 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'timeOfDay' // Field that triggered the series edit
  ) => Promise<void>;
}

// Create the context
// eslint-disable-next-line react-refresh/only-export-components
export const ChoresContext = createContext<ChoresContextType | undefined>(undefined);

// Custom hook for easier context consumption - Ensure return type matches new ChoresContextType
// eslint-disable-next-line react-refresh/only-export-components
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
  }
  // Add more default definitions if needed for a baseline usable state
];

export const ChoresProvider: React.FC<ChoresProviderProps> = ({ children }) => {
  const [choreDefinitions, setChoreDefinitions] = useState<ChoreDefinition[]>([]);
  const [choreInstances, setChoreInstances] = useState<ChoreInstance[]>([]);
  // Removed initial hardcoded state for choreDefinitions, will load from localStorage or use defaults

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
    defaultCategory?: MatrixKanbanCategory
  ) => {
    console.log(`Generating instances for period: ${periodStartDate} to ${periodEndDate}. Default category: ${defaultCategory}`);

    setChoreInstances(prevInstances => 
      ChoreService.generateInstancesForPeriod(
        choreDefinitions,
        periodStartDate,
        periodEndDate,
        prevInstances,
        defaultCategory || 'TO_DO'
      )
    );
  }, [choreDefinitions, setChoreInstances]);

  // toggleSubTaskComplete (old version operating on definitions) has been removed.
  // updateKanbanChoreOrder has been removed.
  // updateChoreInstanceColumn has been removed.

  const toggleSubtaskCompletionOnInstance = useCallback((instanceId: string, subtaskId: string) => {
    setChoreInstances(prevInstances => {
      const instance = prevInstances.find(inst => inst.id === instanceId);
      if (!instance) return prevInstances;

      const updatedInstance = ChoreService.toggleSubtaskCompletionOnInstance(
        instance,
        subtaskId,
        choreDefinitions
      );

      if (!updatedInstance) return prevInstances;

      return prevInstances.map(inst => 
        inst.id === instanceId ? updatedInstance : inst
      );
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
          return ChoreService.applyCategoryUpdateToInstance(instance, newCategory, definition);
        }
        return instance;
      })
    );
  }, [choreDefinitions, setChoreInstances]);

  const updateChoreDefinition = useCallback(async (definitionId: string, updates: Partial<ChoreDefinition>) => {
    setChoreDefinitions(prevDefs =>
      prevDefs.map(def =>
        def.id === definitionId
          ? { ...def, ...updates, updatedAt: new Date().toISOString() } // Assuming ChoreDefinition has updatedAt
          : def
      )
    );
  }, [setChoreDefinitions]);

  const updateChoreInstanceField = useCallback(async (instanceId: string, fieldName: keyof ChoreInstance, value: string | number | boolean | MatrixKanbanCategory | Record<string, boolean> | undefined) => {
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
          if (instance.isComplete === markAsComplete) return instance;

          const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
          if (!definition) {
            console.warn(`Definition not found for instance ${instance.id} during batch toggle complete.`);
            return instance;
          }

          if (markAsComplete && !instance.isComplete && definition.assignedKidId && definition.rewardAmount && definition.rewardAmount > 0) {
            addKidReward(definition.assignedKidId, definition.rewardAmount, `${definition.title} (${instance.instanceDate})`);
          }

          if (markAsComplete) {
            if (instance.categoryStatus !== 'COMPLETED') {
              return ChoreService.applyCategoryUpdateToInstance(instance, 'COMPLETED', definition);
            }
            return { ...instance, isComplete: true };
          } else {
            if (instance.categoryStatus === 'COMPLETED') {
              return ChoreService.applyCategoryUpdateToInstance(instance, 'IN_PROGRESS', definition);
            }
            return { ...instance, isComplete: false };
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
          return ChoreService.applyCategoryUpdateToInstance(instance, newCategory, definition);
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

  const updateChoreSeries = useCallback(async (
    definitionId: string,
    updates: Partial<Pick<ChoreDefinition, 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'timeOfDay'>>,
    fromDate: string, // YYYY-MM-DD format
  ) => {
    setChoreDefinitions(prevDefs => {
      const definitionIndex = prevDefs.findIndex(d => d.id === definitionId);
      if (definitionIndex === -1) {
        console.error(`[updateChoreSeries] Definition with ID ${definitionId} not found.`);
        return prevDefs;
      }
      const originalDefinition = prevDefs[definitionIndex];

      const updatedDefinitionFields = { ...updates };

      // If dueDate is being updated, it's the primary field in 'updates'.
      // Other fields are applied directly.
      // Ensure subTasks have IDs if they are new, or preserve existing IDs.
      if (updates.subTasks) {
        updatedDefinitionFields.subTasks = updates.subTasks.map((st, index) => ({
          id: st.id || `st_${Date.now()}_${index}`, // Assign ID if new
          title: st.title,
          isComplete: st.isComplete,
        }));
      }

      const newDefinition: ChoreDefinition = {
        ...originalDefinition,
        ...updatedDefinitionFields,
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
            const rawNewFutureInstances = ChoreService.generateInstancesForPeriod(
                [newDefinition], // Generate only for the updated definition
                fromDate,        // Start from the specified fromDate
                regenerationEndDate,
                [],              // No existing instances to preserve
                'TO_DO'          // Default category
            );

            newFutureInstances = rawNewFutureInstances.map(rawInstance => {
                const initialSubtaskCompletions: Record<string, boolean> = {};
                if (newDefinition.subTasks) {
                    newDefinition.subTasks.forEach(st => {
                    initialSubtaskCompletions[st.id] = st.isComplete || false;
                    });
                }
                return {
                    ...rawInstance,
                    isComplete: false,
                    categoryStatus: "TO_DO" as MatrixKanbanCategory, // Default for new series instances
                    subtaskCompletions: initialSubtaskCompletions,
                    previousSubtaskCompletions: undefined,
                };
            });
        }
        return [...instancesToKeep, ...newFutureInstances];
      });

      return newDefinitions;
    });
  }, [setChoreDefinitions, setChoreInstances]);


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
