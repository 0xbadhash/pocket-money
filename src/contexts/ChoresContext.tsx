// src/contexts/ChoresContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { ChoreDefinition, ChoreInstance, KanbanColumnConfig } from '../types';
import { useFinancialContext } from '../contexts/FinancialContext';
import { useUserContext } from './UserContext';
import { generateChoreInstances } from '../utils/choreUtils';

export type KanbanChoreOrders = Record<string, string[]>;

interface ChoresContextType {
  choreDefinitions: ChoreDefinition[];
  choreInstances: ChoreInstance[];
  addChoreDefinition: (choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete' | 'definitionComments' | 'activityLog'>) => void;
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
    } catch (error) { console.error("Error loading definitions:", error); setChoreDefinitions(defaultInitialDefinitions); }
    try {
      const storedInstances = localStorage.getItem('choreInstances');
      setChoreInstances(storedInstances ? JSON.parse(storedInstances) : []);
    } catch (error) { console.error("Error loading instances:", error); setChoreInstances([]); }
  }, []);

  useEffect(() => { localStorage.setItem('choreDefinitions', JSON.stringify(choreDefinitions)); }, [choreDefinitions]);
  useEffect(() => { localStorage.setItem('choreInstances', JSON.stringify(choreInstances)); }, [choreInstances]);

  const addChoreDefinition = useCallback((choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete' | 'definitionComments'>) => {
    const newChoreDef: ChoreDefinition = {
      id: `cd${Date.now()}`, isComplete: false, ...choreDefData, definitionComments: []
    };
    setChoreDefinitions(prev => [newChoreDef, ...prev]);
  }, []);

  const generateInstancesForPeriod = useCallback((startDate: string, endDate: string, defaultKanbanColumnId?: string) => {
    const activeDefs = choreDefinitions.filter(def => !def.isComplete);
    const defsForGen = activeDefs.map(def => (def.earlyStartDate && def.dueDate && new Date(def.earlyStartDate) < new Date(def.dueDate)) ? { ...def, dueDate: def.earlyStartDate } : def);
    const rawNew = generateChoreInstances(defsForGen, startDate, endDate);
    const newInstances = rawNew.map(raw => {
      const def = choreDefinitions.find(d => d.id === raw.choreDefinitionId);
      let subCompletions: Record<string,boolean> = {};
      def?.subTasks?.forEach(st => { subCompletions[st.id] = st.isComplete || false; });
      return {
        ...raw, isComplete: false, categoryStatus: defaultKanbanColumnId || "",
        subtaskCompletions: subCompletions, previousSubtaskCompletions: undefined,
        priority: def?.priority, instanceComments: [], instanceDescription: undefined, // Added instanceDescription
        isSkipped: false, activityLog: [{ timestamp: new Date().toISOString(), action: 'Instance Created', userId:'system', userName:'System' }]
      };
    });
    setChoreInstances(prev => {
      const outside = prev.filter(inst => new Date(inst.instanceDate) < new Date(startDate) || new Date(inst.instanceDate) > new Date(endDate));
      const updated = newInstances.map(ni => prev.find(oi => oi.id === ni.id) ? { ...ni, ...prev.find(oi => oi.id === ni.id) } : ni);
      return [...outside, ...updated];
    });
  }, [choreDefinitions]); // Removed logActivity from deps as it's not directly used here for now

  const toggleChoreInstanceComplete = useCallback((instanceId: string) => {
    setChoreInstances(prev => prev.map(inst => {
      if (inst.id === instanceId && !inst.isSkipped) {
        const def = choreDefinitions.find(d => d.id === inst.choreDefinitionId);
        if (!def || !def.assignedKidId) return inst;
        const cols = getKanbanColumnConfigs(def.assignedKidId);
        let updated = { ...inst, isComplete: !inst.isComplete };
        if (updated.isComplete) {
          if (def.rewardAmount && def.rewardAmount > 0) addKidReward(def.assignedKidId, def.rewardAmount, `${def.title} (${inst.instanceDate})`);
          const doneCol = cols.find(c => c.isCompletedColumn);
          if (doneCol && updated.categoryStatus !== doneCol.id) {
            updated.previousSubtaskCompletions = { ...updated.subtaskCompletions };
            const allTrue: Record<string,boolean> = {};
            def.subTasks?.forEach(st => allTrue[st.id] = true);
            updated.subtaskCompletions = allTrue;
            updated.categoryStatus = doneCol.id;
            updated = logActivity(updated, 'Status Changed (Auto)', currentUser?.id, currentUser?.username, `to '${doneCol.title}' due to completion`);
          } else if (updated.categoryStatus === doneCol?.id) {
             const allTrue: Record<string,boolean> = {};
             def.subTasks?.forEach(st => allTrue[st.id] = true);
             updated.subtaskCompletions = allTrue;
          }
        } else {
          const curColCfg = cols.find(c => c.id === updated.categoryStatus);
          if (curColCfg?.isCompletedColumn) {
            const nonDoneCol = cols.find(c => !c.isCompletedColumn) || cols[0];
            if (nonDoneCol) {
              updated.categoryStatus = nonDoneCol.id;
              if (updated.previousSubtaskCompletions) {
                updated.subtaskCompletions = { ...updated.previousSubtaskCompletions };
                updated.previousSubtaskCompletions = undefined;
              }
              updated = logActivity(updated, 'Status Changed (Auto)', currentUser?.id, currentUser?.username, `to '${nonDoneCol.title}' due to uncompletion`);
            }
          }
        }
        updated = logActivity(updated, updated.isComplete ? 'Marked Complete' : 'Marked Incomplete', currentUser?.id, currentUser?.username);
        return updated;
      }
      return inst;
    }));
  }, [choreDefinitions, addKidReward, getKanbanColumnConfigs, logActivity, currentUser]);

  const toggleSubtaskCompletionOnInstance = useCallback((instanceId: string, subtaskId: string) => {
    setChoreInstances(prev => prev.map(inst => {
      if (inst.id === instanceId) {
        let current = { ...inst };
        const def = choreDefinitions.find(d => d.id === current.choreDefinitionId);
        if (!def || !def.assignedKidId) return inst;

        current.subtaskCompletions = { ...current.subtaskCompletions, [subtaskId]: !current.subtaskCompletions?.[subtaskId] };
        const subTitle = def.subTasks?.find(st=>st.id === subtaskId)?.title || 'Unknown';
        current = logActivity(current, 'Subtask Toggled', currentUser?.id, currentUser?.username, `'${subTitle}' to ${current.subtaskCompletions[subtaskId] ? 'Complete':'Incomplete'}`);

        const allDone = def.subTasks?.every(st => !!current.subtaskCompletions[st.id]) ?? true;
        const cols = getKanbanColumnConfigs(def.assignedKidId);
        const curColCfg = cols.find(c => c.id === current.categoryStatus);
        const origStatus = current.categoryStatus;

        if (allDone && curColCfg && !curColCfg.isCompletedColumn) {
          const doneCol = cols.find(c => c.isCompletedColumn);
          if (doneCol) { current.isComplete = true; current.previousSubtaskCompletions = {...current.subtaskCompletions}; current.categoryStatus = doneCol.id; }
          else { current.isComplete = true; }
        } else if (!allDone && curColCfg && curColCfg.isCompletedColumn) {
          const nonDoneCol = cols.find(c => !c.isCompletedColumn) || cols[0];
          if (nonDoneCol) {
            current.isComplete = false;
            if (current.previousSubtaskCompletions) { current.subtaskCompletions = {...current.previousSubtaskCompletions}; current.previousSubtaskCompletions = undefined; }
            current.categoryStatus = nonDoneCol.id;
          }
        } else {
          if (!curColCfg?.isCompletedColumn) current.isComplete = allDone;
          else current.isComplete = true;
        }
        if (origStatus !== current.categoryStatus) {
          const newColTitle = cols.find(c => c.id === current.categoryStatus)?.title || current.categoryStatus;
          current = logActivity(current, 'Status Changed (Auto)', currentUser?.id, currentUser?.username, `to '${newColTitle}'`);
        }
        return current;
      }
      return inst;
    }));
  }, [choreDefinitions, getKanbanColumnConfigs, logActivity, currentUser]);

  const updateChoreInstanceCategory = useCallback((instanceId: string, newStatusId: string) => {
    setChoreInstances(prev => prev.map(inst => {
      if (inst.id === instanceId && inst.categoryStatus !== newStatusId) {
        const def = choreDefinitions.find(d => d.id === inst.choreDefinitionId);
        if (!def || !def.assignedKidId) return inst;
        const cols = getKanbanColumnConfigs(def.assignedKidId);
        const newColCfg = cols.find(c => c.id === newStatusId);
        const oldColCfg = cols.find(c => c.id === inst.categoryStatus);
        let updated = { ...inst, categoryStatus: newStatusId };
        if (newColCfg?.isCompletedColumn) {
          updated.isComplete = true;
          if (def.subTasks && def.subTasks.length > 0) {
            updated.previousSubtaskCompletions = { ...inst.subtaskCompletions };
            const allTrue:Record<string,boolean> = {};
            def.subTasks.forEach(st => allTrue[st.id] = true);
            updated.subtaskCompletions = allTrue;
          }
        } else if (oldColCfg?.isCompletedColumn && !newColCfg?.isCompletedColumn) {
          updated.isComplete = false;
          if (updated.previousSubtaskCompletions) { updated.subtaskCompletions = {...updated.previousSubtaskCompletions}; updated.previousSubtaskCompletions = undefined; }
          updated.isComplete = def.subTasks?.every(st => !!updated.subtaskCompletions[st.id]) ?? !def.subTasks;
        }
        updated = logActivity(updated, 'Status Changed', currentUser?.id, currentUser?.username, `to '${newColCfg?.title || newStatusId}'`);
        return updated;
      }
      return inst;
    }));
  }, [choreDefinitions, getKanbanColumnConfigs, logActivity, currentUser]);

  const updateChoreInstanceField = useCallback(async (instanceId: string, fieldName: keyof ChoreInstance, value: any) => {
    setChoreInstances(prev => prev.map(inst => {
      if (inst.id === instanceId) {
        let updated = { ...inst, [fieldName]: value };
        if (fieldName === 'priority') updated = logActivity(updated, 'Priority Changed', currentUser?.id, currentUser?.username, `to ${value || 'Default'}`);
        else if (fieldName === 'instanceDate') updated = logActivity(updated, 'Date Changed', currentUser?.id, currentUser?.username, `to ${value}`);
        else if (fieldName === 'overriddenRewardAmount') {
          const def = choreDefinitions.find(d => d.id === inst.choreDefinitionId);
          updated = logActivity(updated, 'Reward Changed', currentUser?.id, currentUser?.username, `to $${Number(value !== undefined ? value : (def?.rewardAmount ?? 0)).toFixed(2)}`);
        } else if (fieldName === 'instanceDescription') {
            updated = logActivity(updated, 'Instance Description Changed', currentUser?.id, currentUser?.username, value ? `to "${value.substring(0,30)}..."` : "cleared");
        }
        return updated;
      }
      return inst;
    }));
  }, [choreDefinitions, logActivity, currentUser]);

  const batchToggleCompleteChoreInstances = useCallback(async (ids: string[], markAsComplete: boolean) => {
    setChoreInstances(prev => prev.map(inst => {
      if (ids.includes(inst.id) && inst.isComplete !== markAsComplete) {
        const def = choreDefinitions.find(d => d.id === inst.choreDefinitionId);
        if (!def || !def.assignedKidId) return inst;
        if (markAsComplete && !inst.isComplete && def.rewardAmount && def.rewardAmount > 0) addKidReward(def.assignedKidId, def.rewardAmount, `${def.title} (${inst.instanceDate})`);
        let updated = { ...inst };
        const origStatus = inst.categoryStatus;
        const cols = getKanbanColumnConfigs(def.assignedKidId);
        if (markAsComplete) {
          updated.isComplete = true;
          const doneCol = cols.find(c=>c.isCompletedColumn);
          if(doneCol) updated.categoryStatus = doneCol.id;
          if (def.subTasks && def.subTasks.length > 0) { updated.previousSubtaskCompletions = {...inst.subtaskCompletions}; const allTrue:Record<string,boolean>={}; def.subTasks.forEach(st=>allTrue[st.id]=true); updated.subtaskCompletions=allTrue;}
        } else {
          updated.isComplete = false;
          const nonDoneCol = cols.find(c=>!c.isCompletedColumn) || cols[0];
          if(nonDoneCol) updated.categoryStatus = nonDoneCol.id;
          if(updated.previousSubtaskCompletions) {updated.subtaskCompletions = {...updated.previousSubtaskCompletions}; updated.previousSubtaskCompletions = undefined;}
        }
        updated = logActivity(updated, markAsComplete ? 'Marked Complete (Batch)' : 'Marked Incomplete (Batch)', currentUser?.id, currentUser?.username);
        if (origStatus !== updated.categoryStatus) updated = logActivity(updated, 'Status Changed (Batch Auto)', currentUser?.id, currentUser?.username, `to '${cols.find(c=>c.id===updated.categoryStatus)?.title || updated.categoryStatus}'`);
        return updated;
      }
      return inst;
    }));
  }, [choreDefinitions, addKidReward, getKanbanColumnConfigs, logActivity, currentUser]);

  const batchUpdateChoreInstancesCategory = useCallback(async (ids: string[], newStatusId: string) => {
    setChoreInstances(prev => prev.map(inst => {
      if (ids.includes(inst.id) && inst.categoryStatus !== newStatusId) {
        const def = choreDefinitions.find(d => d.id === inst.choreDefinitionId);
        if (!def || !def.assignedKidId) return inst;
        const cols = getKanbanColumnConfigs(def.assignedKidId);
        const newColCfg = cols.find(c => c.id === newStatusId);
        const oldColCfg = cols.find(c => c.id === inst.categoryStatus);
        let updated = { ...inst, categoryStatus: newStatusId };
        if (newColCfg?.isCompletedColumn) {
          updated.isComplete = true;
          if (def.subTasks && def.subTasks.length > 0) { updated.previousSubtaskCompletions = {...inst.subtaskCompletions}; const allTrue:Record<string,boolean>={}; def.subTasks.forEach(st=>allTrue[st.id]=true); updated.subtaskCompletions=allTrue;}
        } else if (oldColCfg?.isCompletedColumn && !newColCfg?.isCompletedColumn) {
          updated.isComplete = false;
          if(updated.previousSubtaskCompletions) {updated.subtaskCompletions = {...updated.previousSubtaskCompletions}; updated.previousSubtaskCompletions = undefined;}
          updated.isComplete = def.subTasks?.every(st=>!!updated.subtaskCompletions[st.id]) ?? !def.subTasks;
        }
        updated = logActivity(updated, 'Status Changed (Batch)', currentUser?.id, currentUser?.username, `to '${newColCfg?.title || newStatusId}'`);
        return updated;
      }
      return inst;
    }));
  }, [choreDefinitions, getKanbanColumnConfigs, logActivity, currentUser]);

  const addCommentToInstance = useCallback(async (instanceId: string, commentText: string, userId: string, userName: string) => {
    setChoreInstances(prev => prev.map(inst => {
      if (inst.id === instanceId) {
        const newComment = { id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2,9)}`, userId, userName, text: commentText, createdAt: new Date().toISOString() };
        return { ...inst, instanceComments: [...(inst.instanceComments || []), newComment] };
      }
      return inst;
    }));
  }, []);

  const toggleSkipInstance = useCallback(async (instanceId: string) => {
    setChoreInstances(prev => prev.map(inst => {
      if (inst.id === instanceId) {
        let updated = { ...inst, isSkipped: !inst.isSkipped };
        updated = logActivity(updated, updated.isSkipped ? 'Instance Skipped' : 'Instance Unskipped', currentUser?.id, currentUser?.username);
        return updated;
      }
      return inst;
    }));
  }, [logActivity, currentUser]);

  const updateChoreSeries = useCallback(async (definitionId: string, updates: Partial<Pick<ChoreDefinition, 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'hour' | 'minute' | 'timeOfDay' | 'priority'>>, fromDate: string, fieldName: 'rewardAmount' | 'dueDate' | 'description' | 'subTasks' | 'timeOfDay' | 'priority') => {
    setChoreDefinitions(prevDefs => {
      const defIdx = prevDefs.findIndex(d => d.id === definitionId);
      if (defIdx === -1) return prevDefs;
      const origDef = prevDefs[defIdx];
      let updatedDefFields = { ...updates };
      if (updates.subTasks) updatedDefFields.subTasks = updates.subTasks.map((st, i) => ({ id: st.id || `st_${Date.now()}_${i}`, ...st }));
      const newDef: ChoreDefinition = { ...origDef, ...updatedDefFields, updatedAt: new Date().toISOString() };
      const newDefs = [...prevDefs];
      newDefs[defIdx] = newDef;

      setChoreInstances(prevInsts => {
        const toKeep = prevInsts.filter(i => i.choreDefinitionId !== definitionId || i.instanceDate < fromDate);
        let regenEndDate = newDef.recurrenceEndDate;
        if (!regenEndDate) { const fd = new Date(fromDate); fd.setFullYear(fd.getFullYear() + 1); regenEndDate = fd.toISOString().split('T')[0]; }
        let futureInsts: ChoreInstance[] = [];
        if (newDef.recurrenceType && !newDef.isComplete) {
          const rawNew = generateChoreInstances([newDef], fromDate, regenEndDate);
          futureInsts = rawNew.map(raw => {
            let subComp:Record<string,boolean>={}; newDef.subTasks?.forEach(st => subComp[st.id]=st.isComplete||false);
            return { ...raw, isComplete:false, categoryStatus:"", subtaskCompletions:subComp, previousSubtaskCompletions:undefined, priority:newDef.priority, instanceComments:[], instanceDescription: undefined, isSkipped:false, activityLog:[] };
          });
        }
        const firstAffected = prevInsts.find(i => i.choreDefinitionId === definitionId && i.instanceDate === fromDate);
        if (firstAffected) {
            const loggedFirst = logActivity(firstAffected, `Series Updated: ${fieldName}`, currentUser?.id, currentUser?.username, `Field '${fieldName}' for series from ${fromDate}`);
            const idx = toKeep.findIndex(i => i.id === loggedFirst.id); // This might be -1 if firstAffected was not in toKeep
            if (idx !== -1) toKeep[idx] = loggedFirst;
            // If not found in toKeep (because its instanceDate was >= fromDate), it will be replaced by newFutureInstances if applicable
            // or simply removed if it's a non-recurring chore whose date was changed.
            // This specific logging on 'firstAffected' might be lost if it's part of the instances being replaced.
            // A more robust way for series logging might be needed if this single-instance log is insufficient.
        }
        return [...toKeep, ...futureInsts];
      });
      return newDefs;
    });
  }, [logActivity, currentUser]);

  const getChoreDefinitionsForKid = useCallback((kidId: string): ChoreDefinition[] => choreDefinitions.filter(def => def.assignedKidId === kidId), [choreDefinitions]);
  const toggleChoreDefinitionActiveState = useCallback((definitionId: string) => setChoreDefinitions(prev => prev.map(def => def.id === definitionId ? { ...def, isComplete: !def.isComplete } : def)), []);
  const batchAssignChoreDefinitionsToKid = useCallback(async (definitionIds: string[], newKidId: string | null) => setChoreDefinitions(prev => prev.map(def => definitionIds.includes(def.id) ? { ...def, assignedKidId: newKidId || undefined, updatedAt: new Date().toISOString() } : def)), []);

  const contextValue = useMemo(() => ({
    choreDefinitions, choreInstances, addChoreDefinition, toggleChoreInstanceComplete, getChoreDefinitionsForKid,
    generateInstancesForPeriod, toggleSubtaskCompletionOnInstance, toggleChoreDefinitionActiveState,
    updateChoreInstanceCategory, updateChoreDefinition, updateChoreInstanceField,
    batchToggleCompleteChoreInstances, batchUpdateChoreInstancesCategory, batchAssignChoreDefinitionsToKid,
    updateChoreSeries, addCommentToInstance, toggleSkipInstance,
  }), [
    choreDefinitions, choreInstances, addChoreDefinition, toggleChoreInstanceComplete, getChoreDefinitionsForKid,
    generateInstancesForPeriod, toggleSubtaskCompletionOnInstance, toggleChoreDefinitionActiveState,
    updateChoreInstanceCategory, updateChoreDefinition, updateChoreInstanceField,
    batchToggleCompleteChoreInstances, batchUpdateChoreInstancesCategory, batchAssignChoreDefinitionsToKid,
    updateChoreSeries, addCommentToInstance, toggleSkipInstance,
  ]);

  return <ChoresContext.Provider value={contextValue}>{children}</ChoresContext.Provider>;
};

// Note for future: The dependencies array for useCallback/useMemo for functions that use `logActivity`
// should include `logActivity` if it's not stable (i.e. if `currentUser` changes often).
// However, `logActivity` is memoized with `currentUser` as a dependency, and `contextValue` is memoized
// with all its functions. This setup should generally be stable.
// The main `ChoreProvider`'s `useEffect` hooks for localStorage do not depend on `logActivity`.
// Functions passed in contextValue are already memoized with useCallback.
