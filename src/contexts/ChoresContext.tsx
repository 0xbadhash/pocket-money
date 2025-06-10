// src/contexts/ChoresContext.tsx
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Chore, RecurrenceSetting } from '../types'; // Ensure RecurrenceSetting is imported
import { v4 as uuidv4 } from 'uuid';

// Helper function to add days to a date
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Helper function to add months to a date
const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  // Set date to 1 to avoid month overflow issues with setMonth
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  // Try to set to original day, or last day of new month if original day is too high
  const originalDay = date.getDate();
  result.setDate(Math.min(originalDay, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
  return result;
};

const CHORES_STORAGE_KEY = 'familyTaskManagerChores';

interface ChoresContextType {
  chores: Chore[];
  addChore: (name: string, description: string, recurrence: RecurrenceSetting, dueDate: string) => void;
  toggleChore: (id: string) => void;
  deleteChore: (id: string) => void;
  updateChore: (id: string, updates: Partial<Omit<Chore, 'id'>>) => void; // Added for next step
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
  const [chores, setChores] = useState<Chore[]>(() => { // Using useState initializer function
    try {
      const storedChores = window.localStorage.getItem(CHORES_STORAGE_KEY);
      if (storedChores) {
        const parsedChores = JSON.parse(storedChores);
        // Basic validation: check if it's an array
        if (Array.isArray(parsedChores)) {
          // Further validation could be added here to check structure of each chore object
          return parsedChores;
        }
      }
    } catch (error) {
      console.error('Error parsing chores from localStorage:', error);
      // Fall through to return default empty array
    }
    return []; // Default to empty array if nothing in storage or if parsing fails
  });

  // NEW useEffect for saving to localStorage
  useEffect(() => {
    try {
      const serializedChores = JSON.stringify(chores);
      window.localStorage.setItem(CHORES_STORAGE_KEY, serializedChores);
    } catch (error) {
      console.error('Error saving chores to localStorage:', error);
    }
  }, [chores]); // Dependency array ensures this runs when 'chores' changes

  const addChore = (name: string, description: string, recurrence: RecurrenceSetting, dueDate: string) => {
    const newChore: Chore = {
      id: uuidv4(),
      name,
      description,
      isComplete: false,
      recurrence,
      dueDate, // Expecting ISO string "YYYY-MM-DD"
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
            choreToReschedule = { ...chore, isComplete: false }; // Clone for new instance, mark as incomplete
          }
          return { ...chore, isComplete: newStatus }; // Update status of the original chore
        }
        return chore;
      });

      if (choreToReschedule && choreToReschedule.recurrence) {
        const { recurrence, dueDate: currentDueDateString } = choreToReschedule;
        // Ensure parsing as local date, not UTC, by appending time for safety with `new Date()`
        const currentDueDate = new Date(currentDueDateString + 'T00:00:00');
        let nextDueDate: Date | null = null;

        switch (recurrence.type) {
          case 'daily':
            nextDueDate = addDays(currentDueDate, 1);
            break;
          case 'weekly':
            nextDueDate = new Date(currentDueDate); // Start from current due date
            const daysToAddForWeekly = (recurrence.dayOfWeek - currentDueDate.getDay() + 7) % 7;
            nextDueDate.setDate(currentDueDate.getDate() + daysToAddForWeekly);
            if (nextDueDate <= currentDueDate) {
                 nextDueDate.setDate(nextDueDate.getDate() + 7);
            }
            break;
          case 'monthly':
            const targetDayOfMonth = recurrence.dayOfMonth;
            let tempNextMonthDate = addMonths(currentDueDate, 1);

            const daysInCalcMonth = new Date(tempNextMonthDate.getFullYear(), tempNextMonthDate.getMonth() + 1, 0).getDate();
            tempNextMonthDate.setDate(Math.min(targetDayOfMonth, daysInCalcMonth));
            nextDueDate = tempNextMonthDate;

            if (nextDueDate <= currentDueDate) {
                let futureMonth = addMonths(currentDueDate,1);
                if(futureMonth <= currentDueDate) futureMonth = addMonths(futureMonth,1);

                const daysInFutureCalcMonth = new Date(futureMonth.getFullYear(), futureMonth.getMonth() + 1, 0).getDate();
                futureMonth.setDate(Math.min(targetDayOfMonth, daysInFutureCalcMonth));
                nextDueDate = futureMonth;
                 if (nextDueDate <= currentDueDate) {
                    nextDueDate = addDays(addMonths(currentDueDate,1), 1); // Fallback to first day of next month + 1 day
                    const daysInFallbackMonth = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + 1, 0).getDate();
                    nextDueDate.setDate(Math.min(targetDayOfMonth,daysInFallbackMonth));
                 }
            }
            break;
          case 'specificDays':
            // const sortedDays = [...recurrence.days].sort((a, b) => a - b); // Not strictly needed if just checking includes
            // const currentDayOfWeek = currentDueDate.getDay(); // Can get from dateCursor
            let nextDayFound = false;
            let dateCursor = new Date(currentDueDate);

            for (let i = 0; i < 14; i++) { // Check up to two weeks ahead
                dateCursor = addDays(currentDueDate, i + 1); // Start checking from the day AFTER currentDueDate
                if (recurrence.days.includes(dateCursor.getDay())) {
                    nextDueDate = dateCursor;
                    nextDayFound = true;
                    break;
                }
            }
            if (!nextDayFound && recurrence.days.length > 0) {
                // Fallback if somehow not found in 2 weeks
                // Go to the first specific day of the week (from recurrence.days), starting 2 weeks from currentDueDate
                dateCursor = addDays(currentDueDate, 14);
                const baseFallbackDay = dateCursor.getDay();
                // Ensure recurrence.days is sorted to pick the "first" logical day for fallback
                const sortedRecurrenceDays = [...recurrence.days].sort((a,b) => a-b);
                const daysToAdd = (sortedRecurrenceDays[0] - baseFallbackDay + 7) % 7;
                nextDueDate = addDays(dateCursor, daysToAdd);
            }
            break;
          default:
            break;
        }

        if (nextDueDate) {
          const nextInstance: Chore = {
            ...choreToReschedule,
            id: uuidv4(),
            dueDate: nextDueDate.toISOString().split('T')[0],
          };
          return [...updatedChores, nextInstance];
        }
      }
      return updatedChores;
    });
  };

  const deleteChore = (id: string) => {
    setChores(prevChores => prevChores.filter(chore => chore.id !== id));
  };

  const updateChore = (id: string, updates: Partial<Omit<Chore, 'id'>>) => {
    setChores(prevChores =>
      prevChores.map(chore =>
        chore.id === id ? { ...chore, ...updates } : chore
      )
    );
  };

  return (
    <ChoresContext.Provider value={{ chores, addChore, toggleChore, deleteChore, updateChore }}>
      {children}
    </ChoresContext.Provider>
  );
};
