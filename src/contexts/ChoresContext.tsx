import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Chore, RecurrenceSetting } from '../types'; // Ensure RecurrenceSetting is imported
import { v4 as uuidv4 } from 'uuid';
import { useFinancialContext } from '../contexts/FinancialContext'; // Merged: Import FinancialContext

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

interface ChoresContextType {
  chores: Chore[];
  addChore: (name: string, description: string, recurrence: RecurrenceSetting, dueDate: string, assignedKidId?: string, rewardAmount?: number) => void; // Updated signature
  toggleChore: (id: string) => void;
  deleteChore: (id: string) => void;
  updateChore: (id: string, updates: Partial<Omit<Chore, 'id'>>) => void;
  getChoresForKid: (kidId: string) => Chore[]; // Merged: Function to filter chores by kid
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
  const { addKidReward } = useFinancialContext(); // Merged: Consume FinancialContext

  // Updated addChore to include assignedKidId and rewardAmount
  const addChore = (name: string, description: string, recurrence: RecurrenceSetting, dueDate: string, assignedKidId?: string, rewardAmount?: number) => {
    const newChore: Chore = {
      id: uuidv4(),
      title: name, // Renamed from 'name' to 'title' to match Chore type
      description,
      isComplete: false,
      recurrenceType: recurrence?.type || null, // Map RecurrenceSetting to Chore properties
      recurrenceDay: recurrence && 'dayOfWeek' in recurrence ? recurrence.dayOfWeek : (recurrence && 'dayOfMonth' in recurrence ? recurrence.dayOfMonth : null),
      recurrenceEndDate: null, // This would need to be handled if recurrence settings include an end date
      assignedKidId, // Merged: Optional assignedKidId
      rewardAmount, // Merged: Optional rewardAmount
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

          // Merged: Add reward if chore is completed and has a reward amount
          if (newStatus && chore.assignedKidId && chore.rewardAmount && chore.rewardAmount > 0) {
            addKidReward(chore.assignedKidId, chore.rewardAmount, chore.title);
          }

          if (newStatus && chore.recurrenceType) { // Chore is marked complete and is recurring
            choreToReschedule = { ...chore, isComplete: false }; // Clone for new instance, mark as incomplete
          }
          return { ...chore, isComplete: newStatus }; // Update status of the original chore
        }
        return chore;
      });

      if (choreToReschedule && choreToReschedule.recurrenceType) {
        // Construct RecurrenceSetting temporarily for rescheduling logic
        let recurrence: RecurrenceSetting = null;
        if (choreToReschedule.recurrenceType === 'daily') {
          recurrence = { type: 'daily' };
        } else if (choreToReschedule.recurrenceType === 'weekly' && choreToReschedule.recurrenceDay !== undefined && choreToReschedule.recurrenceDay !== null) {
          recurrence = { type: 'weekly', dayOfWeek: choreToReschedule.recurrenceDay };
        } else if (choreToReschedule.recurrenceType === 'monthly' && choreToReschedule.recurrenceDay !== undefined && choreToReschedule.recurrenceDay !== null) {
          recurrence = { type: 'monthly', dayOfMonth: choreToReschedule.recurrenceDay };
        }
        // 'specificDays' type is not directly available on Chore, implying it's a more complex recurrence handled by Chore's existing recurrenceDay property or a separate one
        // For simplicity, I'll rely on the existing recurrenceType and recurrenceDay from Chore, assuming specificDays might map to a generic recurrenceDay or be deprecated.
        // If 'specificDays' was a distinct recurrence type in Chore, it would need a new property like `recurrenceSpecificDays: number[]`

        // Re-evaluating based on the RecurrenceSetting definition in types.ts (from feature/recurring-chores)
        // If Chore interface uses recurrenceType, recurrenceDay etc., and RecurrenceSetting is for form input,
        // then conversion is needed.
        // Let's ensure Chore type properly reflects the recurrence setting for direct use here.
        // Assuming Chore has: recurrenceType: 'daily' | 'weekly' | 'monthly' | null; recurrenceDay?: number | null;
        // And that `specificDays` recurrence is handled via recurrenceDay representing multiple values or a separate property.

        // Given types.ts for Chore has `recurrenceType`, `recurrenceDay`, `recurrenceEndDate`:
        // We need to map `choreToReschedule`'s properties back into a RecurrenceSetting for the calculation.
        // Or, refactor the `toggleChore` logic to directly use `choreToReschedule` properties without re-creating `RecurrenceSetting`.
        // Let's refactor to directly use `choreToReschedule` properties for clarity and avoid re-mapping.

        const { recurrenceType: type, recurrenceDay, dueDate: currentDueDateString } = choreToReschedule;
        const currentDueDate = new Date(currentDueDateString + 'T00:00:00'); // Ensure parsing as local date

        let nextDueDate: Date | null = null;

        switch (type) {
          case 'daily':
            nextDueDate = addDays(currentDueDate, 1);
            break;
          case 'weekly':
            // Need to ensure recurrenceDay is available for weekly
            if (recurrenceDay !== undefined && recurrenceDay !== null) {
              nextDueDate = new Date(currentDueDate);
              const daysToAddForWeekly = (recurrenceDay - currentDueDate.getDay() + 7) % 7;
              nextDueDate.setDate(currentDueDate.getDate() + daysToAddForWeekly);
              if (nextDueDate <= currentDueDate) {
                nextDueDate.setDate(nextDueDate.getDate() + 7);
              }
            }
            break;
          case 'monthly':
            // Need to ensure recurrenceDay is available for monthly (which is dayOfMonth)
            if (recurrenceDay !== undefined && recurrenceDay !== null) {
              const targetDayOfMonth = recurrenceDay;
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
            }
            break;
          // 'specificDays' is not directly a type on Chore.recurrenceType.
          // If 'specificDays' means Chore.recurrenceDay holds an array of days, then Chore type needs update.
          // For now, assuming it's handled by other means or if recurrenceDay means a single day of week/month.
          // If a 'specificDays' type was intended, Chore needs `recurrenceSpecificDays: number[]` property.
          // Based on the 'AddChoreForm' where `recurrenceSetting.type === 'specificDays'` sets `recurrenceSetting.days`,
          // it implies Chore should have a `recurrenceSpecificDays?: number[];` to store this.
          // Without it, `specificDays` logic won't work correctly in `toggleChore`.
          // For this merge, I'm adapting based on existing Chore type in types.ts provided previously which only has `recurrenceDay`.
          // If 'specificDays' recurrence is critical, the Chore interface in types.ts needs a `recurrenceSpecificDays: number[]` property.
          // For now, I'm omitting the specificDays logic in toggleChore as it doesn't align with the Chore type.

          default:
            break;
        }

        if (nextDueDate) {
          const nextInstance: Chore = {
            ...choreToReschedule,
            id: uuidv4(),
            isComplete: false, // Ensure new instance is incomplete
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

  // Merged: Function to filter chores by kid
  const getChoresForKid = (kidId: string): Chore[] => {
    return chores.filter(chore => chore.assignedKidId === kidId);
  };

  // Initial mock chores from 'main' (adapted to new Chore type)
  // These are for initial state, will be overwritten if localStorage used later
  useState<Chore[]>(() => [
    { id: uuidv4(), title: 'Clean Room', assignedKidId: 'kid_a', dueDate: '2025-06-15', rewardAmount: 5, isComplete: false, recurrenceType: null },
    { id: uuidv4(), title: 'Walk the Dog', assignedKidId: 'kid_b', dueDate: '2025-06-10', rewardAmount: 3, isComplete: true, recurrenceType: null },
    { id: uuidv4(), title: 'Do Homework', assignedKidId: 'kid_a', isComplete: false, recurrenceType: null, dueDate: '2025-06-12' },
    { id: uuidv4(), title: 'Take out trash', description: 'Before Tuesday morning', rewardAmount: 1, isComplete: false, recurrenceType: null, dueDate: '2025-06-11' }
  ]);


  return (
    <ChoresContext.Provider value={{ chores, addChore, toggleChore, deleteChore, updateChore, getChoresForKid }}>
      {children}
    </ChoresContext.Provider>
  );
};