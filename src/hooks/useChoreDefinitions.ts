// src/hooks/useChoreDefinitions.ts
import { useState, useCallback, useMemo } from 'react';
import type { ChoreDefinition } from '../types';

const defaultInitialDefinitions: ChoreDefinition[] = [
  {
    id: 'cd1_default', title: 'Clean Room (Daily) - Default', assignedKidId: 'kid_a_default', dueDate: '2023-12-01',
    rewardAmount: 1, isComplete: false, recurrenceType: 'daily', recurrenceEndDate: '2023-12-05',
    tags: ['cleaning', 'indoor'], subTasks: [ { id: 'st1_1', title: 'Make bed', isComplete: false } ],
    priority: 'Medium', definitionComments: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
];

interface UseChoreDefinitionsReturn {
  choreDefinitions: ChoreDefinition[];
  addChoreDefinition: (choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete' | 'definitionComments'>) => void;
  getChoreDefinitionsForKid: (kidId: string) => ChoreDefinition[];
  toggleChoreDefinitionActiveState: (definitionId: string) => void;
  updateChoreDefinition: (definitionId: string, updates: Partial<ChoreDefinition>) => Promise<void>;
  batchAssignChoreDefinitionsToKid: (definitionIds: string[], newKidId: string | null) => Promise<void>;
}

export function useChoreDefinitions(): UseChoreDefinitionsReturn {
  const [choreDefinitions, setChoreDefinitions] = useState<ChoreDefinition[]>([]);

  // Load from localStorage on mount
  const loadDefinitions = useCallback(() => {
    try {
      const storedDefinitions = localStorage.getItem('choreDefinitions');
      setChoreDefinitions(storedDefinitions ? JSON.parse(storedDefinitions) : defaultInitialDefinitions);
    } catch (error) {
      console.error("Error loading definitions:", error);
      setChoreDefinitions(defaultInitialDefinitions);
    }
  }, []);

  // Save to localStorage when definitions change
  const saveDefinitions = useCallback((definitions: ChoreDefinition[]) => {
    localStorage.setItem('choreDefinitions', JSON.stringify(definitions));
  }, []);

  const addChoreDefinition = useCallback((choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete' | 'definitionComments'>) => {
    const newChoreDef: ChoreDefinition = {
      id: `cd${Date.now()}`, isComplete: false, ...choreDefData, definitionComments: []
    };
    setChoreDefinitions(prev => {
      const updated = [newChoreDef, ...prev];
      saveDefinitions(updated);
      return updated;
    });
  }, [saveDefinitions]);

  const getChoreDefinitionsForKid = useCallback((kidId: string): ChoreDefinition[] => {
    return choreDefinitions.filter(def => def.assignedKidId === kidId);
  }, [choreDefinitions]);

  const toggleChoreDefinitionActiveState = useCallback((definitionId: string) => {
    setChoreDefinitions(prev => {
      const updated = prev.map(def => 
        def.id === definitionId ? { ...def, isComplete: !def.isComplete } : def
      );
      saveDefinitions(updated);
      return updated;
    });
  }, [saveDefinitions]);

  const updateChoreDefinition = useCallback(async (definitionId: string, updates: Partial<ChoreDefinition>) => {
    setChoreDefinitions(prev => {
      const updated = prev.map(def => 
        def.id === definitionId ? { ...def, ...updates, updatedAt: new Date().toISOString() } : def
      );
      saveDefinitions(updated);
      return updated;
    });
  }, [saveDefinitions]);

  const batchAssignChoreDefinitionsToKid = useCallback(async (definitionIds: string[], newKidId: string | null) => {
    setChoreDefinitions(prev => {
      const updated = prev.map(def => 
        definitionIds.includes(def.id) 
          ? { ...def, assignedKidId: newKidId || undefined, updatedAt: new Date().toISOString() } 
          : def
      );
      saveDefinitions(updated);
      return updated;
    });
  }, [saveDefinitions]);

  return {
    choreDefinitions,
    addChoreDefinition,
    getChoreDefinitionsForKid,
    toggleChoreDefinitionActiveState,
    updateChoreDefinition,
    batchAssignChoreDefinitionsToKid,
  };
}
