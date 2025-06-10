import React, { createContext, useState, ReactNode, useContext } from 'react';
import type { ChoreDefinition, ChoreInstance } from '../types'; // Modified types import
import { useFinancialContext } from '../contexts/FinancialContext';
import { generateChoreInstances } from '../utils/choreUtils'; // NEW IMPORT from kanban branch

// Define the shape of the context value
interface ChoresContextType {
  choreDefinitions: ChoreDefinition[];
  choreInstances: ChoreInstance[];
  addChoreDefinition: (choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete'>) => void;
  toggleChoreInstanceComplete: (instanceId: string) => void;
  getChoreDefinitionsForKid: (kidId: string) => ChoreDefinition[];
  generateInstancesForPeriod: (startDate: string, endDate: string) => void; // From kanban branch
  // The following are added for backward compatibility and may be removed after full migration
  // deleteChoreDefinition: (id: string) => void; // If needed for definitions
  // updateChoreDefinition: (id: string, updates: Partial<Omit<ChoreDefinition, 'id'>>) => void; // If needed for definitions
}

const ChoresContext = createContext<ChoresContextType | undefined>(undefined);

// Custom hook for easier context consumption
export const useChoresContext = (): ChoresContextType => {
  const context = useContext(ChoresContext);
  if (!context) {
    // Changed error message to reflect the new hook name
    throw new Error('useChoresContext must be used within a ChoresProvider');
  }
  return context;
};

interface ChoresProviderProps {
  children: ReactNode;
}

export const ChoresProvider: React.FC<ChoresProviderProps> = ({ children }) => {
  // State for chore definitions from kanban branch
  const [choreDefinitions, setChoreDefinitions] = useState<ChoreDefinition[]>([
    { id: 'cd1', title: 'Clean Room (Daily)', assignedKidId: 'kid_a', dueDate: '2023-12-01',
      rewardAmount: 1, isComplete: false, recurrenceType: 'daily', recurrenceEndDate: '2023-12-05' },
    { id: 'cd2', title: 'Walk the Dog (Weekly Sat)', assignedKidId: 'kid_b', dueDate: '2023-12-02',
      rewardAmount: 3, isComplete: false, recurrenceType: 'weekly', recurrenceDay: 6, // Saturday
      recurrenceEndDate: '2023-12-31'},
    { id: 'cd3', title: 'Do Homework (One-off)', assignedKidId: 'kid_a', dueDate: '2023-12-15',
      rewardAmount: 2, isComplete: false, recurrenceType: null },
    { id: 'cd4', title: 'Take out trash (Monthly 15th)', description: 'Before evening', rewardAmount: 1.5,
      assignedKidId: 'kid_a', dueDate: '2023-12-01', isComplete: false, recurrenceType: 'monthly', recurrenceDay: 15,
      recurrenceEndDate: '2024-02-01'
    },
    { id: 'cd5', title: 'Feed Cat (Daily)', assignedKidId: 'kid_a', dueDate: '2023-12-01',
      rewardAmount: 0.5, isComplete: false, recurrenceType: 'daily', recurrenceEndDate: null } // No end date
  ]);

  // State for chore instances from kanban branch
  const [choreInstances, setChoreInstances] = useState<ChoreInstance[]>([]); // Initialize empty, as they will be generated

  const { addKidReward } = useFinancialContext(); // Retained from both branches

  // Renamed and updated logic for adding chore definitions
  const addChoreDefinition = (choreDefData: Omit<ChoreDefinition, 'id' | 'isComplete'>) => {
    const newChoreDef: ChoreDefinition = {
      id: `cd${Date.now()}`, // Simple unique ID
      isComplete: false, // New definitions are active by default
      ...choreDefData,
    };
    setChoreDefinitions(prevDefs => [newChoreDef, ...prevDefs]);
  };

  // Renamed and updated logic for toggling chore instances
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

    // If marking as complete, and it has a reward, and kid is assigned (logic from recurring-chores/main)
    if (!instance.isComplete && definition.assignedKidId && definition.rewardAmount && definition.rewardAmount > 0) {
      addKidReward(definition.assignedKidId, definition.rewardAmount, `${definition.title} (${instance.instanceDate})`);
    }

    setChoreInstances(prevInstances =>
      prevInstances.map(inst =>
        inst.id === instanceId ? { ...inst, isComplete: !inst.isComplete } : inst
      )
    );
  };

  // Renamed and filters chore definitions
  const getChoreDefinitionsForKid = (kidId: string): ChoreDefinition[] => {
    return choreDefinitions.filter(def => def.assignedKidId === kidId);
  };

  // Instance generation logic using utility function from kanban branch
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

  // Update provider value with the new context shape
  return (
    <ChoresContext.Provider value={{
      choreDefinitions,
      choreInstances,
      addChoreDefinition,
      toggleChoreInstanceComplete,
      getChoreDefinitionsForKid,
      generateInstancesForPeriod
    }}>
      {children}
    </ChoresContext.Provider>
  );
};