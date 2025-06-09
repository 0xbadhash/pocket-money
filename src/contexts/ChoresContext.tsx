// src/contexts/ChoresContext.tsx
import React, { createContext, useState, ReactNode, useContext } from 'react';
import type { Chore } from '../types'; // Import Chore type

// Define the shape of the context value
interface ChoresContextType {
  chores: Chore[];
  addChore: (choreData: Omit<Chore, 'id' | 'isComplete'>) => void;
  toggleChoreComplete: (choreId: string) => void;
  getChoresForKid: (kidId: string) => Chore[]; // Added as per plan
}

// Create the context
export const ChoresContext = createContext<ChoresContextType | undefined>(undefined);

// Custom hook for easier context consumption
export const useChoresContext = () => {
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
  const [chores, setChores] = useState<Chore[]>([
    // Initial mock chores
    { id: 'c1', title: 'Clean Room', assignedKidId: 'kid_a', dueDate: '2023-12-15', rewardAmount: 5, isComplete: false },
    { id: 'c2', title: 'Walk the Dog', assignedKidId: 'kid_b', dueDate: '2023-12-10', rewardAmount: 3, isComplete: true },
    { id: 'c3', title: 'Do Homework', assignedKidId: 'kid_a', isComplete: false },
    { id: 'c4', title: 'Take out trash', description: 'Before Tuesday morning', rewardAmount: 1, isComplete: false}
  ]);

  const addChore = (choreData: Omit<Chore, 'id' | 'isComplete'>) => {
    const newChore: Chore = {
      id: `c${Date.now()}`, // Simple unique ID
      isComplete: false, // New chores are incomplete by default
      ...choreData,
    };
    setChores(prevChores => [newChore, ...prevChores]); // Add to top
  };

  const toggleChoreComplete = (choreId: string) => {
    setChores(prevChores =>
      prevChores.map(chore =>
        chore.id === choreId ? { ...chore, isComplete: !chore.isComplete } : chore
      )
    );
  };

  const getChoresForKid = (kidId: string): Chore[] => {
    return chores.filter(chore => chore.assignedKidId === kidId);
  };

  return (
    <ChoresContext.Provider value={{ chores, addChore, toggleChoreComplete, getChoresForKid }}>
      {children}
    </ChoresContext.Provider>
  );
};
