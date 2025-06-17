// src/contexts/ChoresContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
// Ensure KanbanColumnConfig is imported if it's replacing MatrixKanbanCategory in some contexts
import type { ChoreDefinition, ChoreInstance, KanbanColumnConfig } from '../types';
import { useFinancialContext } from '../contexts/FinancialContext';
import { useUserContext } from './UserContext'; // Import useUserContext
import { generateChoreInstances } from '../utils/choreUtils';

export type KanbanChoreOrders = Record<string, string[]>;

interface ChoresContextType {
  choreDefinitions: ChoreDefinition[];
  choreInstances: ChoreInstance[];
  addChoreDefinition: (choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete' | 'definitionComments' | 'activityLog'>) => void; // activityLog not on definition
  toggleChoreInstanceComplete: (instanceId: string) => void;
  getChoreDefinitionsForKid: (kidId: string) => ChoreDefinition[];
  generateInstancesForPeriod: (startDate: string, endDate: string, defaultKanbanColumnId?: string) => void;
  toggleSubtaskCompletionOnInstance: (instanceId: string, subtaskId: string) => void;
  toggleChoreDefinitionActiveState: (definitionId: string) => void;
  updateChoreInstanceCategory: (instanceId: string, newStatusId: string) => void;
  updateChoreDefinition: (definitionId: string, updates: Partial<ChoreDefinition>) => Promise<void>;
  updateChoreInstanceField: (instanceId: string, fieldName: keyof ChoreInstance, value: any) => Promise<void>;
  batchToggleCompleteChoreInstances: (instanceIds: string[], markAsComplete: boolean) => Promise<void>;
  batchUpdateChoreInstancesCategory: (instanceIds: string[], newStatusId: string) => Promise<void>;
  batchAssignChoreDefinitionsToKid: (definitionIds: string[], newKidId: string | null) => Promise<void>;
  updateChoreSeries: (
    definitionId: string,
    updates: Partial<Pick<ChoreDefinition, 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'hour' | 'minute' | 'timeOfDay' | 'priority'>>,
    fromDate: string,
    fieldName: 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'timeOfDay' | 'priority'
  ) => Promise<void>;
  addCommentToInstance: (instanceId: string, commentText: string, userId: string, userName: string) => Promise<void>;
  toggleSkipInstance: (instanceId: string) => Promise<void>;
}

export const ChoresContext = createContext<ChoresContextType | undefined>(undefined);

export const useChoresContext = (): ChoresContextType => {
  const context = useContext(ChoresContext);
  if (context === undefined) {
    throw new Error('useChoresContext must be used within a ChoresProvider');
  }
  return context;
};

interface ChoresProviderProps {
  children: ReactNode;
}

const defaultInitialDefinitions: ChoreDefinition[] = [
  {
    id: 'cd1_default', title: 'Clean Room (Daily) - Default', assignedKidId: 'kid_a_default', dueDate: '2023-12-01',
    rewardAmount: 1, isComplete: false, recurrenceType: 'daily', recurrenceEndDate: '2023-12-05',
    tags: ['cleaning', 'indoor'], subTasks: [ { id: 'st1_1', title: 'Make bed', isComplete: false } ],
    priority: 'Medium', definitionComments: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
];

export const ChoresProvider: React.FC<ChoresProviderProps> = ({ children }) => {
  const [choreDefinitions, setChoreDefinitions] = useState<ChoreDefinition[]>([]);
  const [choreInstances, setChoreInstances] = useState<ChoreInstance[]>([]);
  const { getKanbanColumnConfigs, user: currentUser } = useUserContext();
  const { addKidReward } = useFinancialContext();

  const logActivity = useCallback((
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
    const existingLog = Array.isArray(instance.activityLog) ? instance.activityLog : [];
    return {
      ...instance,
      activityLog: [logEntry, ...existingLog],
    };
  }, [currentUser]);

  useEffect(() => {
    try {
      const storedDefinitions = localStorage.getItem('choreDefinitions');
      setChoreDefinitions(storedDefinitions ? JSON.parse(storedDefinitions) : defaultInitialDefinitions);
    } catch (error) {
      console.error("Failed to load chore definitions from localStorage:", error);
      setChoreDefinitions(defaultInitialDefinitions);
    }
    try {
      const storedInstances = localStorage.getItem('choreInstances');
      setChoreInstances(storedInstances ? JSON.parse(storedInstances) : []);
    } catch (error) {
      console.error("Failed to load chore instances from localStorage:", error);
      setChoreInstances([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('choreDefinitions', JSON.stringify(choreDefinitions));
  }, [choreDefinitions]);

  useEffect(() => {
    localStorage.setItem('choreInstances', JSON.stringify(choreInstances));
  }, [choreInstances]);

  const addChoreDefinition = useCallback((choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete' | 'definitionComments'>) => {
    const newChoreDef: ChoreDefinition = {
      id: `cd${Date.now()}`,
      isComplete: false,
      ...choreDefData,
      definitionComments: [], // Initialize empty
      // activityLog not on definition
    };
    setChoreDefinitions(prevDefs => [newChoreDef, ...prevDefs]);
  }, []);

  const generateInstancesForPeriod = useCallback((
    periodStartDate: string,
    periodEndDate: string,
    defaultKanbanColumnId?: string
  ) => {
    const activeDefinitions = choreDefinitions.filter(def => !def.isComplete);
    const definitionsForGeneration = activeDefinitions.map(def => {
      if (def.earlyStartDate && def.dueDate && new Date(def.earlyStartDate) < new Date(def.dueDate)) {
        return { ...def, dueDate: def.earlyStartDate };
      }
      return def;
    });

    const rawNewInstances = generateChoreInstances(definitionsForGeneration, periodStartDate, periodEndDate);
    const newInstancesWithFields = rawNewInstances.map(rawInstance => {
      const definition = choreDefinitions.find(def => def.id === rawInstance.choreDefinitionId);
      let initialSubtaskCompletions: Record<string, boolean> = {};
      if (definition?.subTasks) {
        definition.subTasks.forEach(st => { initialSubtaskCompletions[st.id] = st.isComplete || false; });
      }
      return {
        ...rawInstance,
        isComplete: false,
        categoryStatus: defaultKanbanColumnId || "",
        subtaskCompletions: initialSubtaskCompletions,
        previousSubtaskCompletions: undefined,
        priority: definition?.priority,
        instanceComments: [],
        isSkipped: false,
        activityLog: [
          { timestamp: new Date().toISOString(), action: 'Instance Created', userId: 'system', userName: 'System' }
        ],
      };
    });

    setChoreInstances(prevInstances => {
      const outsideOfPeriod = prevInstances.filter(inst => {
        const instDate = new Date(inst.instanceDate);
        instDate.setUTCHours(0,0,0,0);
        const periodStartNorm = new Date(periodStartDate);
        periodStartNorm.setUTCHours(0,0,0,0);
        const periodEndNorm = new Date(periodEndDate);
        periodEndNorm.setUTCHours(0,0,0,0);
        return instDate < periodStartNorm || instDate > periodEndNorm;
      });
      const updatedGeneratedForPeriod = newInstancesWithFields.map(newInstance => {
        const oldMatchingInstance = prevInstances.find(oldInst => oldInst.id === newInstance.id);
        return oldMatchingInstance ? { ...newInstance, ...oldMatchingInstance } : newInstance;
      });
      return [...outsideOfPeriod, ...updatedGeneratedForPeriod];
    });
  }, [choreDefinitions, logActivity]); // logActivity added to dependencies if used here, but it's for modifications

  const toggleChoreInstanceComplete = useCallback((instanceId: string) => {
    setChoreInstances(prevInstances =>
      prevInstances.map(inst => {
        if (inst.id === instanceId) {
          if (inst.isSkipped) return inst; // Cannot complete a skipped task

          const definition = choreDefinitions.find(def => def.id === inst.choreDefinitionId);
          if (!definition || !definition.assignedKidId) return inst;

          const kidKanbanColumns = getKanbanColumnConfigs(definition.assignedKidId);
          let updatedInst = { ...inst, isComplete: !inst.isComplete };

          if (updatedInst.isComplete) {
            if (definition.rewardAmount && definition.rewardAmount > 0) {
              addKidReward(definition.assignedKidId, definition.rewardAmount, `${definition.title} (${inst.instanceDate})`);
            }
            const doneColumn = kidKanbanColumns.find(col => col.isCompletedColumn);
            if (doneColumn && updatedInst.categoryStatus !== doneColumn.id) {
              updatedInst.previousSubtaskCompletions = { ...updatedInst.subtaskCompletions };
              const allTrueSubtasks: Record<string, boolean> = {};
              (definition.subTasks || []).forEach(st => allTrueSubtasks[st.id] = true);
              updatedInst.subtaskCompletions = allTrueSubtasks;
              updatedInst.categoryStatus = doneColumn.id;
               updatedInst = logActivity(updatedInst, 'Status Changed (Auto)', currentUser?.id, currentUser?.username, `to '${doneColumn.title}' due to completion`);
            } else if (updatedInst.categoryStatus === doneColumn?.id) { // Already in done column
                const allTrueSubtasks: Record<string, boolean> = {};
                (definition.subTasks || []).forEach(st => allTrueSubtasks[st.id] = true);
                updatedInst.subtaskCompletions = allTrueSubtasks; // Ensure subtasks are marked complete
            }
          } else { // Marking as incomplete
            const currentColumnConfig = kidKanbanColumns.find(col => col.id === updatedInst.categoryStatus);
            if (currentColumnConfig?.isCompletedColumn) {
              const firstNonDoneColumn = kidKanbanColumns.find(col => !col.isCompletedColumn) || kidKanbanColumns[0];
              if (firstNonDoneColumn) {
                updatedInst.categoryStatus = firstNonDoneColumn.id;
                if (updatedInst.previousSubtaskCompletions) {
                  updatedInst.subtaskCompletions = { ...updatedInst.previousSubtaskCompletions };
                  updatedInstance.previousSubtaskCompletions = undefined;
                }
                updatedInst = logActivity(updatedInst, 'Status Changed (Auto)', currentUser?.id, currentUser?.username, `to '${firstNonDoneColumn.title}' due to uncompletion`);
              }
            }
          }
          updatedInst = logActivity(updatedInst, updatedInst.isComplete ? 'Marked Complete' : 'Marked Incomplete', currentUser?.id, currentUser?.username);
          return updatedInst;
        }
        return inst;
      })
    );
  }, [choreDefinitions, addKidReward, getKanbanColumnConfigs, logActivity, currentUser]);

  const toggleSubtaskCompletionOnInstance = useCallback((instanceId: string, subtaskId: string) => {
    setChoreInstances(prevInstances => {
      const instanceIndex = prevInstances.findIndex(inst => inst.id === instanceId);
      if (instanceIndex === -1) return prevInstances;

      let currentInstance = prevInstances[instanceIndex];
      const definition = choreDefinitions.find(def => def.id === currentInstance.choreDefinitionId);
      if (!definition || !definition.assignedKidId) return prevInstances;

      const newSubtaskCompletions = { ...currentInstance.subtaskCompletions, [subtaskId]: !currentInstance.subtaskCompletions?.[subtaskId] };
      currentInstance = { ...currentInstance, subtaskCompletions: newSubtaskCompletions };

      const subtaskTitle = definition.subTasks?.find(st => st.id === subtaskId)?.title || 'Unknown Subtask';
      const newCompletionState = currentInstance.subtaskCompletions[subtaskId];
      currentInstance = logActivity(currentInstance, 'Subtask Toggled', currentUser?.id, currentUser?.username, `'${subtaskTitle}' to ${newCompletionState ? 'Complete' : 'Incomplete'}`);

      const allSubtasksComplete = definition.subTasks?.every(st => !!currentInstance.subtaskCompletions[st.id]) ?? true;
      const kidKanbanColumns = getKanbanColumnConfigs(definition.assignedKidId);
      const currentColumnConfig = kidKanbanColumns.find(col => col.id === currentInstance.categoryStatus);
      const originalStatus = currentInstance.categoryStatus;

      if (allSubtasksComplete && currentColumnConfig && !currentColumnConfig.isCompletedColumn) {
        const firstDoneColumn = kidKanbanColumns.find(col => col.isCompletedColumn);
        if (firstDoneColumn) {
          currentInstance.isComplete = true;
          currentInstance.previousSubtaskCompletions = { ...currentInstance.subtaskCompletions };
          currentInstance.categoryStatus = firstDoneColumn.id;
        } else {
          currentInstance.isComplete = true; // No done column, but all subtasks are complete
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
        }
      } else { // Not changing columns
        if (!currentColumnConfig?.isCompletedColumn) {
          currentInstance.isComplete = allSubtasksComplete;
        } else { // Is in a completed column
            currentInstance.isComplete = true; // Should remain true
             // if a subtask was unchecked, it implies it moved out of done column already.
             // if it's still in done column and a subtask is unchecked, this state is inconsistent.
             // For now, assume if it's in a done column, it's complete.
        }
      }

      if (originalStatus !== currentInstance.categoryStatus) {
         const newColTitle = kidKanbanColumns.find(col => col.id === currentInstance.categoryStatus)?.title || currentInstance.categoryStatus;
         currentInstance = logActivity(currentInstance, 'Status Changed (Auto)', currentUser?.id, currentUser?.username, `to '${newColTitle}' due to subtask update`);
      }

      const finalInstances = [...prevInstances];
      finalInstances[instanceIndex] = currentInstance;
      return finalInstances;
    });
  }, [choreDefinitions, getKanbanColumnConfigs, logActivity, currentUser]);

  const updateChoreInstanceCategory = useCallback((instanceId: string, newStatusId: string) => {
    setChoreInstances(prevInstances =>
      prevInstances.map(inst => {
        if (inst.id === instanceId) {
          if (inst.categoryStatus === newStatusId) return inst; // No change

          const definition = choreDefinitions.find(def => def.id === inst.choreDefinitionId);
          if (!definition || !definition.assignedKidId) return inst;

          const kidKanbanColumns = getKanbanColumnConfigs(definition.assignedKidId);
          const newColumnConfig = kidKanbanColumns.find(col => col.id === newStatusId);
          const oldColumnConfig = kidKanbanColumns.find(col => col.id === inst.categoryStatus);

          let updatedInstance = { ...inst, categoryStatus: newStatusId };

          if (newColumnConfig?.isCompletedColumn) {
            updatedInstance.isComplete = true;
            if (Object.keys(inst.subtaskCompletions || {}).length > 0 || (definition.subTasks && definition.subTasks.length > 0)) {
              updatedInstance.previousSubtaskCompletions = { ...inst.subtaskCompletions };
              const allTrueSubtasks: Record<string, boolean> = {};
              (definition.subTasks || []).forEach(st => allTrueSubtasks[st.id] = true);
              updatedInstance.subtaskCompletions = allTrueSubtasks;
            }
          } else if (oldColumnConfig?.isCompletedColumn && !newColumnConfig?.isCompletedColumn) {
            updatedInstance.isComplete = false;
            if (updatedInstance.previousSubtaskCompletions) {
              updatedInstance.subtaskCompletions = { ...updatedInstance.previousSubtaskCompletions };
              updatedInstance.previousSubtaskCompletions = undefined;
            }
            updatedInstance.isComplete = definition.subTasks?.every(st => !!updatedInstance.subtaskCompletions[st.id]) ?? !definition.subTasks;
          }

          const newColTitle = newColumnConfig?.title || newStatusId;
          updatedInstance = logActivity(updatedInstance, 'Status Changed', currentUser?.id, currentUser?.username, `to '${newColTitle}'`);
          return updatedInstance;
        }
        return inst;
      })
    );
  }, [choreDefinitions, getKanbanColumnConfigs, logActivity, currentUser]);

  const updateChoreInstanceField = useCallback(async (instanceId: string, fieldName: keyof ChoreInstance, value: any) => {
    setChoreInstances(prevInstances =>
      prevInstances.map(inst => {
        if (inst.id === instanceId) {
          let updatedInst = { ...inst, [fieldName]: value };
          if (fieldName === 'priority') {
            updatedInst = logActivity(updatedInst, 'Priority Changed', currentUser?.id, currentUser?.username, `to ${value || 'Default'}`);
          } else if (fieldName === 'instanceDate') {
            updatedInst = logActivity(updatedInst, 'Date Changed', currentUser?.id, currentUser?.username, `to ${value}`);
          } else if (fieldName === 'overriddenRewardAmount') {
             const definition = choreDefinitions.find(def => def.id === inst.choreDefinitionId);
             const baseReward = definition?.rewardAmount ?? 0;
             const newReward = value !== undefined ? value : baseReward;
            updatedInst = logActivity(updatedInst, 'Reward Changed', currentUser?.id, currentUser?.username, `to $${Number(newReward).toFixed(2)}`);
          }
          return updatedInst;
        }
        return inst;
      })
    );
  }, [choreDefinitions, logActivity, currentUser]);

  const batchToggleCompleteChoreInstances = useCallback(async (instanceIds: string[], markAsComplete: boolean) => {
    setChoreInstances(prevInstances => {
      return prevInstances.map(instance => {
        if (instanceIds.includes(instance.id)) {
          if (instance.isComplete === markAsComplete) return instance;

          const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
          if (!definition || !definition.assignedKidId) return instance;

          if (markAsComplete && !instance.isComplete && definition.rewardAmount && definition.rewardAmount > 0) {
            addKidReward(definition.assignedKidId, definition.rewardAmount, `${definition.title} (${instance.instanceDate})`);
          }
          let updatedInstance = { ...instance };
          const originalStatus = instance.categoryStatus;
          const kidKanbanColumns = getKanbanColumnConfigs(definition.assignedKidId);

          if (markAsComplete) {
            updatedInstance.isComplete = true;
            const doneColumn = kidKanbanColumns.find(col => col.isCompletedColumn);
            if (doneColumn) updatedInstance.categoryStatus = doneColumn.id;

            if (Object.keys(updatedInstance.subtaskCompletions || {}).length > 0 || (definition.subTasks && definition.subTasks.length > 0)) {
              updatedInstance.previousSubtaskCompletions = { ...updatedInstance.subtaskCompletions };
              const allTrueSubtasks: Record<string, boolean> = {};
              (definition.subTasks || []).forEach(st => allTrueSubtasks[st.id] = true);
              updatedInstance.subtaskCompletions = allTrueSubtasks;
            }
          } else {
            updatedInstance.isComplete = false;
            const firstNonDoneColumn = kidKanbanColumns.find(col => !col.isCompletedColumn) || kidKanbanColumns[0];
            if (firstNonDoneColumn) updatedInstance.categoryStatus = firstNonDoneColumn.id;

            if (updatedInstance.previousSubtaskCompletions) {
              updatedInstance.subtaskCompletions = { ...updatedInstance.previousSubtaskCompletions };
              updatedInstance.previousSubtaskCompletions = undefined;
            }
          }
          updatedInstance = logActivity(updatedInstance, updatedInstance.isComplete ? 'Marked Complete (Batch)' : 'Marked Incomplete (Batch)', currentUser?.id, currentUser?.username);
          if (originalStatus !== updatedInstance.categoryStatus) {
             const newColTitle = kidKanbanColumns.find(col => col.id === updatedInstance.categoryStatus)?.title || updatedInstance.categoryStatus;
             updatedInstance = logActivity(updatedInstance, 'Status Changed (Batch Auto)', currentUser?.id, currentUser?.username, `to '${newColTitle}'`);
          }
          return updatedInstance;
        }
        return instance;
      });
    });
  }, [choreDefinitions, addKidReward, getKanbanColumnConfigs, logActivity, currentUser]);

  const batchUpdateChoreInstancesCategory = useCallback(async (instanceIds: string[], newStatusId: string) => {
    setChoreInstances(prevInstances =>
      prevInstances.map(inst => {
        if (instanceIds.includes(inst.id)) {
          if (inst.categoryStatus === newStatusId) return inst;

          const definition = choreDefinitions.find(def => def.id === inst.choreDefinitionId);
          if (!definition || !definition.assignedKidId) return inst;

          const kidKanbanColumns = getKanbanColumnConfigs(definition.assignedKidId);
          const newColumnConfig = kidKanbanColumns.find(col => col.id === newStatusId);
          const oldColumnConfig = kidKanbanColumns.find(col => col.id === inst.categoryStatus);

          let updatedInstance = { ...inst, categoryStatus: newStatusId };

          if (newColumnConfig?.isCompletedColumn) {
            updatedInstance.isComplete = true;
            if (Object.keys(inst.subtaskCompletions || {}).length > 0 || (definition.subTasks && definition.subTasks.length > 0)) {
              updatedInstance.previousSubtaskCompletions = { ...inst.subtaskCompletions };
              const allTrueSubtasks: Record<string, boolean> = {};
              (definition.subTasks || []).forEach(st => allTrueSubtasks[st.id] = true);
              updatedInstance.subtaskCompletions = allTrueSubtasks;
            }
          } else if (oldColumnConfig?.isCompletedColumn && !newColumnConfig?.isCompletedColumn) {
            updatedInstance.isComplete = false;
            if (updatedInstance.previousSubtaskCompletions) {
              updatedInstance.subtaskCompletions = { ...updatedInstance.previousSubtaskCompletions };
              updatedInstance.previousSubtaskCompletions = undefined;
            }
            updatedInstance.isComplete = definition.subTasks?.every(st => !!updatedInstance.subtaskCompletions[st.id]) ?? !definition.subTasks;
          }
          const newColTitle = newColumnConfig?.title || newStatusId;
          updatedInstance = logActivity(updatedInstance, 'Status Changed (Batch)', currentUser?.id, currentUser?.username, `to '${newColTitle}'`);
          return updatedInstance;
        }
        return inst;
      })
    );
  }, [choreDefinitions, getKanbanColumnConfigs, logActivity, currentUser]);

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
          // As per refined requirement, comments are NOT logged to activityLog here.
          // They are stored in instanceComments and displayed separately.
          return {
            ...inst,
            instanceComments: [...(inst.instanceComments || []), newCommentEntry],
          };
        }
        return inst;
      })
    );
  }, []); // Removed currentUser dependency as it's not used for logging here

  const toggleSkipInstance = useCallback(async (instanceId: string) => {
    setChoreInstances(prevInstances =>
      prevInstances.map(inst => {
        if (inst.id === instanceId) {
          let updatedInst = { ...inst, isSkipped: !inst.isSkipped };
          updatedInst = logActivity(updatedInst, updatedInst.isSkipped ? 'Instance Skipped' : 'Instance Unskipped', currentUser?.id, currentUser?.username);
          return updatedInst;
        }
        return inst;
      })
    );
  }, [logActivity, currentUser]);

  const updateChoreSeries = useCallback(async (
    definitionId: string,
    updates: Partial<Pick<ChoreDefinition, 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'hour' | 'minute' | 'timeOfDay' | 'priority'>>,
    fromDate: string,
    fieldName: 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'timeOfDay' | 'priority'
  ) => {
    setChoreDefinitions(prevDefs => {
      const definitionIndex = prevDefs.findIndex(d => d.id === definitionId);
      if (definitionIndex === -1) return prevDefs;

      const originalDefinition = prevDefs[definitionIndex];
      let updatedDefinitionFields = { ...updates };
      if (updates.subTasks) {
        updatedDefinitionFields.subTasks = updates.subTasks.map((st, index) => ({ id: st.id || `st_${Date.now()}_${index}`, ...st }));
      }
      const newDefinition: ChoreDefinition = { ...originalDefinition, ...updatedDefinitionFields, updatedAt: new Date().toISOString() };
      const newDefinitions = [...prevDefs];
      newDefinitions[definitionIndex] = newDefinition;

      setChoreInstances(prevInstances => {
        const instancesToKeep = prevInstances.filter(inst => inst.choreDefinitionId !== definitionId || inst.instanceDate < fromDate);
        let regenerationEndDate = newDefinition.recurrenceEndDate;
        if (!regenerationEndDate) {
          const fromDateObj = new Date(fromDate);
          fromDateObj.setFullYear(fromDateObj.getFullYear() + 1);
          regenerationEndDate = fromDateObj.toISOString().split('T')[0];
        }
        let newFutureInstances: ChoreInstance[] = [];
        if (newDefinition.recurrenceType && !newDefinition.isComplete) {
            const rawNewFutureInstances = generateChoreInstances([newDefinition], fromDate, regenerationEndDate);
            newFutureInstances = rawNewFutureInstances.map(rawInstance => {
                let initialSubtaskCompletions: Record<string, boolean> = {};
                if (newDefinition.subTasks) {
                    newDefinition.subTasks.forEach(st => { initialSubtaskCompletions[st.id] = st.isComplete || false; });
                }
                return {
                    ...rawInstance,
                    isComplete: false,
                    categoryStatus: "",
                    subtaskCompletions: initialSubtaskCompletions,
                    previousSubtaskCompletions: undefined,
                    priority: newDefinition.priority,
                    instanceComments: [],
                    isSkipped: false,
                    activityLog: [],
                };
            });
        }
        // Log series update on the first affected instance if it exists
        const firstInstanceToUpdate = prevInstances.find(inst => inst.choreDefinitionId === definitionId && inst.instanceDate === fromDate);
        if (firstInstanceToUpdate) {
            const updatedFirstInstance = logActivity(firstInstanceToUpdate, `Series Updated: ${fieldName}`, currentUser?.id, currentUser?.username, `Field '${fieldName}' changed for series from ${fromDate}`);
            const index = instancesToKeep.findIndex(inst => inst.id === updatedFirstInstance.id);
            if (index !== -1) {
              instancesToKeep[index] = updatedFirstInstance;
            }
          }
        return [...instancesToKeep, ...newFutureInstances];
      });
      return newDefinitions;
    });
  }, [choreDefinitions, logActivity, currentUser]);

  // Add missing updateChoreDefinition implementation (fixed syntax)
  const updateChoreDefinition = useCallback(async (definitionId: string, updates: Partial<ChoreDefinition>) => {
    setChoreDefinitions(prevDefs => {
      const index = prevDefs.findIndex(def => def.id === definitionId);
      if (index === -1) return prevDefs;
      const updatedDef = { ...prevDefs[index], ...updates };
      const newDefs = [...prevDefs];
      newDefs[index] = updatedDef;
      return newDefs;
    });
    return Promise.resolve();
  }, []);

  // Add missing batchAssignChoreDefinitionsToKid implementation
  const batchAssignChoreDefinitionsToKid = useCallback(async (definitionIds: string[], newKidId: string | null) => {
    setChoreDefinitions(prevDefs =>
      prevDefs.map(def => {
        if (definitionIds.includes(def.id)) {
          return { ...def, assignedKidId: newKidId || undefined, updatedAt: new Date().toISOString() };
        }
        return def;
      })
    );
    return Promise.resolve();
  }, []);

  // Remove duplicate batchAssignChoreDefinitionsToKid from contextValue
  const contextValue = useMemo(() => ({
    choreDefinitions,
    choreInstances,
    addChoreDefinition,
    toggleChoreInstanceComplete,
    getChoreDefinitionsForKid: (kidId: string) => choreDefinitions.filter(def => def.assignedKidId === kidId),
    generateInstancesForPeriod,
    toggleSubtaskCompletionOnInstance,
    toggleChoreDefinitionActiveState: (definitionId: string) => {
      setChoreDefinitions(prevDefs =>
        prevDefs.map(def => def.id === definitionId ? { ...def, isComplete: !def.isComplete } : def)
      );
    },
    updateChoreInstanceCategory,
    updateChoreDefinition,
    updateChoreInstanceField,
    batchToggleCompleteChoreInstances,
    batchUpdateChoreInstancesCategory,
    batchAssignChoreDefinitionsToKid,
    updateChoreSeries,
    addCommentToInstance,
    toggleSkipInstance,
  }), [
    choreDefinitions,
    choreInstances,
    addChoreDefinition,
    toggleChoreInstanceComplete,
    generateInstancesForPeriod,
    toggleSubtaskCompletionOnInstance,
    updateChoreInstanceCategory,
    updateChoreDefinition,
    updateChoreInstanceField,
    batchToggleCompleteChoreInstances,
    batchUpdateChoreInstancesCategory,
    batchAssignChoreDefinitionsToKid,
    updateChoreSeries,
    addCommentToInstance,
    toggleSkipInstance
  ]);

  return (
    <ChoresContext.Provider value={contextValue}>
      {children}
    </ChoresContext.Provider>
  );
};
