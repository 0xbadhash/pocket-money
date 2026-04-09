// src/hooks/useChoreInstances.ts
import { useState, useCallback, useEffect } from 'react';
import type { ChoreDefinition, ChoreInstance } from '../types';
import { generateChoreInstances } from '../utils/choreUtils/instanceGenerator';

interface UseChoreInstancesProps {
  choreDefinitions: ChoreDefinition[];
}

interface UseChoreInstancesReturn {
  choreInstances: ChoreInstance[];
  toggleChoreInstanceComplete: (instanceId: string) => void;
  generateInstancesForPeriod: (startDate: string, endDate: string, defaultKanbanColumnId?: string) => void;
  toggleSubtaskCompletionOnInstance: (instanceId: string, subtaskId: string) => void;
  updateChoreInstanceCategory: (instanceId: string, newStatusId: string) => void;
  updateChoreInstanceField: (instanceId: string, fieldName: keyof ChoreInstance, value: unknown) => Promise<void>;
  batchToggleCompleteChoreInstances: (instanceIds: string[], markAsComplete: boolean) => Promise<void>;
  batchUpdateChoreInstancesCategory: (instanceIds: string[], newStatusId: string) => Promise<void>;
  addCommentToInstance: (instanceId: string, commentText: string, userId: string, userName: string) => Promise<void>;
  toggleSkipInstance: (instanceId: string) => Promise<void>;
}

export function useChoreInstances({
  choreDefinitions,
}: UseChoreInstancesProps): UseChoreInstancesReturn {
  const [choreInstances, setChoreInstances] = useState<ChoreInstance[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedInstances = localStorage.getItem('choreInstances');
      setChoreInstances(storedInstances ? JSON.parse(storedInstances) : []);
    } catch (error) {
      console.error("Error loading instances:", error);
      setChoreInstances([]);
    }
  }, []);

  // Save to localStorage when instances change
  useEffect(() => {
    localStorage.setItem('choreInstances', JSON.stringify(choreInstances));
  }, [choreInstances]);

  const generateInstancesForPeriod = useCallback((startDate: string, endDate: string, defaultKanbanColumnId?: string) => {
    const activeDefs = choreDefinitions.filter(def => !def.isComplete);
    const defsForGen = activeDefs.map(def => 
      (def.earlyStartDate && def.dueDate && new Date(def.earlyStartDate) < new Date(def.dueDate)) 
        ? { ...def, dueDate: def.earlyStartDate } 
        : def
    );
    const rawNew = generateChoreInstances(defsForGen, startDate, endDate);
    const newInstances = rawNew.map(raw => {
      const def = choreDefinitions.find(d => d.id === raw.choreDefinitionId);
      const subCompletions: Record<string,boolean> = {};
      def?.subTasks?.forEach(st => { subCompletions[st.id] = st.isComplete || false; });
      return {
        ...raw, isComplete: false, categoryStatus: defaultKanbanColumnId || "",
        subtaskCompletions: subCompletions, previousSubtaskCompletions: undefined,
        priority: def?.priority, instanceComments: [], instanceDescription: undefined,
        isSkipped: false, activityLog: [{ timestamp: new Date().toISOString(), action: 'Instance Created', userId:'system', userName:'System' }]
      };
    });
    setChoreInstances(prev => {
      const outside = prev.filter(inst => new Date(inst.instanceDate) < new Date(startDate) || new Date(inst.instanceDate) > new Date(endDate));
      const updated = newInstances.map(ni => prev.find(oi => oi.id === ni.id) ? { ...ni, ...prev.find(oi => oi.id === ni.id) } : ni);
      return [...outside, ...updated];
    });
  }, [choreDefinitions]);

  const toggleChoreInstanceComplete = useCallback((instanceId: string) => {
    setChoreInstances(prev => prev.map(inst => {
      if (inst.id === instanceId && !inst.isSkipped) {
        const def = choreDefinitions.find(d => d.id === inst.choreDefinitionId);
        if (!def || !def.assignedKidId) return inst;
        // Note: Kanban column logic should be handled by caller with getKanbanColumnConfigs
        return { ...inst, isComplete: !inst.isComplete };
      }
      return inst;
    }));
  }, [choreDefinitions]);

  const toggleSubtaskCompletionOnInstance = useCallback((instanceId: string, subtaskId: string) => {
    setChoreInstances(prev => prev.map(inst => {
      if (inst.id === instanceId) {
        const def = choreDefinitions.find(d => d.id === inst.choreDefinitionId);
        if (!def || !def.assignedKidId) return inst;
        return {
          ...inst,
          subtaskCompletions: { ...inst.subtaskCompletions, [subtaskId]: !inst.subtaskCompletions?.[subtaskId] }
        };
      }
      return inst;
    }));
  }, [choreDefinitions]);

  const updateChoreInstanceCategory = useCallback((instanceId: string, newStatusId: string) => {
    setChoreInstances(prev => prev.map(inst => {
      if (inst.id === instanceId && inst.categoryStatus !== newStatusId) {
        return { ...inst, categoryStatus: newStatusId };
      }
      return inst;
    }));
  }, []);

  const updateChoreInstanceField = useCallback(async (instanceId: string, fieldName: keyof ChoreInstance, value: unknown) => {
    setChoreInstances(prev => prev.map(inst => {
      if (inst.id === instanceId) {
        return { ...inst, [fieldName]: value };
      }
      return inst;
    }));
  }, []);

  const batchToggleCompleteChoreInstances = useCallback(async (ids: string[], markAsComplete: boolean) => {
    setChoreInstances(prev => prev.map(inst => {
      if (ids.includes(inst.id) && inst.isComplete !== markAsComplete) {
        return { ...inst, isComplete: markAsComplete };
      }
      return inst;
    }));
  }, []);

  const batchUpdateChoreInstancesCategory = useCallback(async (ids: string[], newStatusId: string) => {
    setChoreInstances(prev => prev.map(inst => {
      if (ids.includes(inst.id) && inst.categoryStatus !== newStatusId) {
        return { ...inst, categoryStatus: newStatusId };
      }
      return inst;
    }));
  }, []);

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
        return { ...inst, isSkipped: !inst.isSkipped };
      }
      return inst;
    }));
  }, []);

  return {
    choreInstances,
    toggleChoreInstanceComplete,
    generateInstancesForPeriod,
    toggleSubtaskCompletionOnInstance,
    updateChoreInstanceCategory,
    updateChoreInstanceField,
    batchToggleCompleteChoreInstances,
    batchUpdateChoreInstancesCategory,
    addCommentToInstance,
    toggleSkipInstance,
  };
}
