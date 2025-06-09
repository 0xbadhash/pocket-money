// src/contexts/ChoresContext.tsx
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Chore, Recurrence } from '../types'; // Adjust path as necessary
import { v4 as uuidv4 } from 'uuid'; // Import uuid for generating unique IDs

interface ChoresContextType {
  chores: Chore[];
  addChore: (name: string, description: string, recurrence: Recurrence) => void;
  toggleChore: (id: string) => void;
}

const ChoresContext = createContext<ChoresContextType | undefined>(undefined);

export const useChores = (): ChoresContextType => {
  const context = useContext(ChoresContext);
  if (!context) {
    throw new Error('useChores must be used within a ChoresProvider');
  }
  return context;
};

interface ChoresProviderProps {
  children: ReactNode;
}

export const ChoresProvider: React.FC<ChoresProviderProps> = ({ children }) => {
  const [chores, setChores] = useState<Chore[]>([]);

  const addChore = (name: string, description: string, recurrence: Recurrence) => {
    const newChore: Chore = {
      id: uuidv4(),
      name,
      description,
      isComplete: false,
      recurrence,
      // dueDate: undefined, // Set dueDate logic if needed, e.g., based on recurrence
    };
    setChores(prevChores => [...prevChores, newChore]);
  };

  const toggleChore = (id: string) => {
    setChores(prevChores => {
      let choreToReschedule: Chore | null = null;

      const updatedChores = prevChores.map(chore => {
        if (chore.id === id) {
          const newStatus = !chore.isComplete;
          if (newStatus && chore.recurrence) { // Chore is marked complete and is recurring
            // Prepare to reschedule this chore
            choreToReschedule = { ...chore }; // Clone the chore
          }
          return { ...chore, isComplete: newStatus };
        }
        return chore;
      });

      if (choreToReschedule) {
        // Create a new instance for the next occurrence
        const nextInstance: Chore = {
          ...choreToReschedule,
          id: uuidv4(), // New ID for the new instance
          isComplete: false, // Reset completion status
          // Optional: Adjust dueDate for the next instance if implementing date logic
          // For now, it just re-adds with a new ID and incomplete status
        };
        // Add the new instance to the list
        return [...updatedChores, nextInstance];
      }

      return updatedChores;
    });
  };

  return (
    <ChoresContext.Provider value={{ chores, addChore, toggleChore }}>
      {children}
    </ChoresContext.Provider>
  );
};
