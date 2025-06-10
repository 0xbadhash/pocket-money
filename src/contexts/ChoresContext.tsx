// src/contexts/ChoresContext.tsx
import React, { createContext, useState, ReactNode, useContext } from 'react';
import type { ChoreDefinition, ChoreInstance } from '../types'; // Import SubTask
import { useFinancialContext } from '../contexts/FinancialContext';
import { generateChoreInstances } from '../utils/choreUtils';

// Define the shape of the context value - MODIFIED
interface ChoresContextType {
  choreDefinitions: ChoreDefinition[];
  choreInstances: ChoreInstance[];
  addChoreDefinition: (choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete'>) => void;
  toggleChoreInstanceComplete: (instanceId: string) => void;
  getChoreDefinitionsForKid: (kidId: string) => ChoreDefinition[];
  generateInstancesForPeriod: (startDate: string, endDate: string) => void;
  toggleSubTaskComplete: (choreDefinitionId: string, subTaskId: string) => void; // NEW
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
  const [choreInstances, setChoreInstances] = useState<ChoreInstance[]>([
    // Example: Some initial instances for testing. Real generation will occur later.
    // { id: 'cd1_2023-12-01', choreDefinitionId: 'cd1', instanceDate: '2023-12-01', isComplete: false },
    // { id: 'cd1_2023-12-02', choreDefinitionId: 'cd1', instanceDate: '2023-12-02', isComplete: true }, // Example of a completed one
  ]);

  const { addKidReward } = useFinancialContext();

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
  const generateInstancesForPeriod = (periodStartDate: string, periodEndDate: string) => {
    console.log(`Generating instances for period: ${periodStartDate} to ${periodEndDate}`);
    const generatedForPeriod = generateChoreInstances(choreDefinitions, periodStartDate, periodEndDate);

    setChoreInstances(prevInstances => {
      // Filter out any old instances that were for the period we are now regenerating
      const outsideOfPeriod = prevInstances.filter(inst => {
        const instDate = new Date(inst.instanceDate);
        instDate.setUTCHours(0,0,0,0); // Normalize date for comparison
        // Ensure periodStartDate and periodEndDate are also normalized if comparing Date objects
        const periodStartNorm = new Date(periodStartDate);
        periodStartNorm.setUTCHours(0,0,0,0);
        const periodEndNorm = new Date(periodEndDate);
        periodEndNorm.setUTCHours(0,0,0,0);
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

      return [...outsideOfPeriod, ...updatedGeneratedForPeriod];
    });
  };

  const toggleSubTaskComplete = (choreDefinitionId: string, subTaskId: string) => {
    setChoreDefinitions(prevDefs =>
      prevDefs.map(def => {
        if (def.id === choreDefinitionId) {
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

  // MODIFIED: Update provider value
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
