// src/contexts/ChoresContext.tsx
import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import type { ChoreDefinition, ChoreInstance } from '../types'; // Removed redundant SubTask import, as it should be part of ChoreDefinition now
import { useFinancialContext } from '../contexts/FinancialContext';
import { generateChoreInstances } from '../utils/choreUtils';

// Define the storage key for chore definitions
const CHORE_DEFINITIONS_STORAGE_KEY = 'familyTaskManagerChoreDefinitions';
const CHORE_INSTANCES_STORAGE_KEY = 'familyTaskManagerChoreInstances'; // Separate key for instances

// Define the shape of the context value
interface ChoresContextType {
  choreDefinitions: ChoreDefinition[];
  choreInstances: ChoreInstance[];
  addChoreDefinition: (choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete'>) => void;
  toggleChoreInstanceComplete: (instanceId: string) => void;
  getChoreDefinitionsForKid: (kidId: string) => ChoreDefinition[];
  generateInstancesForPeriod: (startDate: string, endDate: string) => void;
  toggleSubTaskComplete: (choreDefinitionId: string, subTaskId: string) => void; // Include NEW subTask function
}

// Create the context
export const ChoresContext = createContext<ChoresContextType | undefined>(undefined);

// Custom hook for easier context consumption
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
  // State for chore definitions, loaded from localStorage with initial dummy data if empty
  const [choreDefinitions, setChoreDefinitions] = useState<ChoreDefinition[]>(() => {
    try {
      const storedDefs = window.localStorage.getItem(CHORE_DEFINITIONS_STORAGE_KEY);
      if (storedDefs) {
        const parsedDefs = JSON.parse(storedDefs);
        if (Array.isArray(parsedDefs)) {
          // Basic validation for existing definitions, could add more detailed checks
          return parsedDefs;
        }
      }
    } catch (error) {
      console.error('Error parsing chore definitions from localStorage:', error);
    }
    // Default initial definitions if nothing in storage or parsing fails - Merged from both, ensuring subtasks
    return [
      {
        id: 'cd1', title: 'Clean Room (Daily)', assignedKidId: 'kid_a', dueDate: '2023-12-01',
        rewardAmount: 1, isComplete: false, recurrenceType: 'daily', recurrenceEndDate: '2023-12-05',
        tags: ['cleaning', 'indoor'],
        subTasks: [ // Included from feature branch
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
        subTasks: [ // Included from feature branch
          { id: 'st2_1', title: 'Leash and harness', isComplete: false },
          { id: 'st2_2', title: 'Walk for 30 mins', isComplete: false },
        ]
      },
      {
        id: 'cd3', title: 'Do Homework (One-off)', assignedKidId: 'kid_a', dueDate: '2023-12-15',
        rewardAmount: 2, isComplete: false, recurrenceType: 'one-time'
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
        subTasks: [ // Included from feature branch
          { id: 'st5_1', title: 'Clean bowl', isComplete: false },
          { id: 'st5_2', title: 'Fill with food', isComplete: false },
          { id: 'st5_3', title: 'Check water', isComplete: true }, // Example pre-completed
        ]
      }
    ];
  });

  // State for chore instances, loaded from localStorage
  const [choreInstances, setChoreInstances] = useState<ChoreInstance[]>(() => {
    try {
      const storedInstances = window.localStorage.getItem(CHORE_INSTANCES_STORAGE_KEY);
      if (storedInstances) {
        const parsedInstances = JSON.parse(storedInstances);
        if (Array.isArray(parsedInstances)) {
          return parsedInstances;
        }
      }
    } catch (error) {
      console.error('Error parsing chore instances from localStorage:', error);
    }
    return []; // Default to empty if nothing in storage or parsing fails
  });

  const { addKidReward } = useFinancialContext();

  // useEffect to save choreDefinitions to localStorage whenever they change
  useEffect(() => {
    try {
      window.localStorage.setItem(CHORE_DEFINITIONS_STORAGE_KEY, JSON.stringify(choreDefinitions));
    } catch (error) {
      console.error('Error saving chore definitions to localStorage:', error);
    }
  }, [choreDefinitions]);

  // useEffect to save choreInstances to localStorage whenever they change
  useEffect(() => {
    try {
      window.localStorage.setItem(CHORE_INSTANCES_STORAGE_KEY, JSON.stringify(choreInstances));
    } catch (error) {
      console.error('Error saving chore instances to localStorage:', error);
    }
  }, [choreInstances]);

  const addChoreDefinition = (choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete'>) => {
    const newChoreDef: ChoreDefinition = {
      id: `cd${Date.now()}`, // Simple unique ID
      isComplete: false, // New definitions are active by default
      ...choreDefData,
    };
    setChoreDefinitions(prevDefs => [newChoreDef, ...prevDefs]);
  };

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

  const getChoreDefinitionsForKid = (kidId: string): ChoreDefinition[] => {
    return choreDefinitions.filter(def => def.assignedKidId === kidId);
  };

  const generateInstancesForPeriod = (periodStartDate: string, periodEndDate: string) => {
    console.log(`Generating instances for period: ${periodStartDate} to ${periodEndDate}`);
    const generatedForPeriod = generateChoreInstances(choreDefinitions, periodStartDate, periodEndDate);

    setChoreInstances(prevInstances => {
      // Filter out any old instances that were for the period we are now regenerating
      const outsideOfPeriod = prevInstances.filter(inst => {
        const instDate = new Date(inst.instanceDate);
        instDate.setUTCHours(0,0,0,0); // Normalize date for comparison

        const periodStartNorm = new Date(periodStartDate);
        periodStartNorm.setUTCHours(0,0,0,0);
        const periodEndNorm = new Date(periodEndDate);
        periodEndNorm.setUTCHours(0,0,0,0);
        
        // Keep instances that are outside the current generation period, regardless of completion status
        return instDate < periodStartNorm || instDate > periodEndNorm;
      });

      // For the newly generated instances, try to preserve completion status if they existed before
      const updatedGeneratedForPeriod = generatedForPeriod.map(newInstance => {
        const oldMatchingInstance = prevInstances.find(oldInst => oldInst.id === newInstance.id);
        if (oldMatchingInstance) {
          return { ...newInstance, isComplete: oldMatchingInstance.isComplete };
        }
        return newInstance;
      });

      // Combine the outside instances with the potentially updated generated ones
      return [...outsideOfPeriod, ...updatedGeneratedForPeriod];
    });
  };

  const toggleSubTaskComplete = (choreDefinitionId: string, subTaskId: string) => {
    setChoreDefinitions(prevDefs =>
      prevDefs.map(def => {
        if (def.id === choreDefinitionId) {
          // Ensure subTasks array exists before mapping
          const updatedSubTasks = def.subTasks?.map(st => {
            if (st.id === subTaskId) {
              return { ...st, isComplete: !st.isComplete };
            }
            return st;
          });
          return { ...def, subTasks: updatedSubTasks };
        }
        return def;
      })
    );
  };

  return (
    <ChoresContext.Provider value={{
      choreDefinitions,
      choreInstances,
      addChoreDefinition,
      toggleChoreInstanceComplete,
      getChoreDefinitionsForKid,
      generateInstancesForPeriod,
      toggleSubTaskComplete // Add new function to provider
    }}>
      {children}
    </ChoresContext.Provider>
  );
};