// src/contexts/ChoresContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { ChoreDefinition, ChoreInstance, MatrixKanbanCategory, BatchActionResult } from '../types'; // Added BatchActionResult
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
  batchToggleCompleteChoreInstances: (instanceIds: string[], markAsComplete: boolean) => Promise<BatchActionResult>;
  /** Batch updates the category for multiple chore instances. */
  batchUpdateChoreInstancesCategory: (instanceIds: string[], newCategory: MatrixKanbanCategory) => Promise<BatchActionResult>;
  /** Batch assigns chore definitions to a new kid. */
  batchAssignChoreDefinitionsToKid: (definitionIds: string[], newKidId: string | null) => Promise<BatchActionResult>;
  /** Updates a chore definition and its future instances from a given date. */
  updateChoreSeries: (
    definitionId: string,
    updates: Partial<Pick<ChoreDefinition, 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'hour' | 'minute' | 'timeOfDay'>>, // Added more editable fields
    fromDate: string, // YYYY-MM-DD, instanceDate of the item that was edited
    fieldName: 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'timeOfDay' // Field that triggered the series edit
  ) => Promise<void>;
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

  const batchToggleCompleteChoreInstances = useCallback(async (instanceIds: string[], markAsComplete: boolean): Promise<BatchActionResult> => {
    const result: BatchActionResult = { succeededCount: 0, failedCount: 0, succeededIds: [], failedIds: [] };

    setChoreInstances(prevInstances => {
      const updatedInstances = prevInstances.map(instance => {
        if (instanceIds.includes(instance.id)) {
          if (instance.isComplete === markAsComplete) {
            // Considered a success as it's already in the desired state or no action needed.
            result.succeededCount++;
            result.succeededIds.push(instance.id);
            return instance;
          }

          const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
          if (!definition) {
            console.warn(`Definition not found for instance ${instance.id} during batch toggle complete.`);
            result.failedCount++;
            result.failedIds.push(instance.id);
            return instance; // Return original instance on failure
          }

          // Handle reward only when marking as complete and not already complete
          if (markAsComplete && !instance.isComplete && definition.assignedKidId && definition.rewardAmount && definition.rewardAmount > 0) {
            addKidReward(definition.assignedKidId, definition.rewardAmount, `${definition.title} (${instance.instanceDate})`);
          }

          result.succeededCount++;
          result.succeededIds.push(instance.id);

          if (markAsComplete) {
            if (instance.categoryStatus !== 'COMPLETED') {
              return applyCategoryUpdateToInstance(instance, 'COMPLETED', definition);
            } else {
              return { ...instance, isComplete: true };
            }
          } else { // Marking incomplete
            if (instance.categoryStatus === 'COMPLETED') {
              return applyCategoryUpdateToInstance(instance, 'IN_PROGRESS', definition);
            } else {
              return { ...instance, isComplete: false };
            }
          }
        }
        return instance;
      });
      // Update failedIds for any IDs not found in prevInstances
      instanceIds.forEach(id => {
        if (!prevInstances.find(inst => inst.id === id)) {
          if (!result.failedIds.includes(id) && !result.succeededIds.includes(id)) { // ensure not already counted
            result.failedCount++;
            result.failedIds.push(id);
          }
        }
      });
      return updatedInstances;
    });
    return result;
  }, [choreDefinitions, addKidReward, setChoreInstances, applyCategoryUpdateToInstance]);

  const batchUpdateChoreInstancesCategory = useCallback(async (instanceIds: string[], newCategory: MatrixKanbanCategory): Promise<BatchActionResult> => {
    const result: BatchActionResult = { succeededCount: 0, failedCount: 0, succeededIds: [], failedIds: [] };

    setChoreInstances(prevInstances => {
      const updatedInstances = prevInstances.map(instance => {
        if (instanceIds.includes(instance.id)) {
          const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
          if (!definition) {
            console.warn(`Definition not found for instance ${instance.id} during batch category update.`);
            result.failedCount++;
            result.failedIds.push(instance.id);
            return instance;
          }
          result.succeededCount++;
          result.succeededIds.push(instance.id);
          return applyCategoryUpdateToInstance(instance, newCategory, definition);
        }
        return instance;
      });
      instanceIds.forEach(id => {
        if (!prevInstances.find(inst => inst.id === id)) {
           if (!result.failedIds.includes(id) && !result.succeededIds.includes(id)) {
            result.failedCount++;
            result.failedIds.push(id);
          }
        }
      });
      return updatedInstances;
    });
    return result;
  }, [choreDefinitions, setChoreInstances, applyCategoryUpdateToInstance]);

  const batchAssignChoreDefinitionsToKid = useCallback(async (definitionIds: string[], newKidId: string | null): Promise<BatchActionResult> => {
    const result: BatchActionResult = { succeededCount: 0, failedCount: 0, succeededIds: [], failedIds: [] };

    setChoreDefinitions(prevDefs => {
      const updatedDefs = prevDefs.map(def => {
        if (definitionIds.includes(def.id)) {
          result.succeededCount++;
          result.succeededIds.push(def.id);
          return { ...def, assignedKidId: newKidId || undefined, updatedAt: new Date().toISOString() };
        }
        return def;
      });
      definitionIds.forEach(id => {
        if (!prevDefs.find(def => def.id === id)) {
          if (!result.failedIds.includes(id) && !result.succeededIds.includes(id)) {
            result.failedCount++;
            result.failedIds.push(id);
          }
        }
      });
      return updatedDefs;
    });
    return result;
  }, [setChoreDefinitions]);

  const updateChoreSeries = useCallback(async (
    definitionId: string,
    updates: Partial<Pick<ChoreDefinition, 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'hour' | 'minute' | 'timeOfDay'>>,
    fromDate: string, // YYYY-MM-DD format
    fieldName: 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'timeOfDay'
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
