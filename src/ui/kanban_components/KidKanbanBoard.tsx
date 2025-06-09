// src/ui/kanban_components/KidKanbanBoard.tsx
import React, { useState, useEffect } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
import type { Chore, KanbanPeriod, KanbanColumn as KanbanColumnType } from '../../types';
import KanbanColumn from './KanbanColumn';
import { getTodayDateString, getWeekRange, getMonthRange, isDateInFuture } from '../../utils/dateUtils';

interface KidKanbanBoardProps {
  kidId: string;
}

const KidKanbanBoard: React.FC<KidKanbanBoardProps> = ({ kidId }) => {
  const { getChoresForKid } = useChoresContext();
  const [selectedPeriod, setSelectedPeriod] = useState<KanbanPeriod>('daily');
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [kidChores, setKidChores] = useState<Chore[]>([]);

  useEffect(() => {
    const chores = getChoresForKid(kidId);
    setKidChores(chores);
  }, [kidId, getChoresForKid]);

  useEffect(() => {
    const today = new Date();
    const todayStr = getTodayDateString();
    const currentWeekRange = getWeekRange(today);
    const currentMonthRange = getMonthRange(today);

    const processChoresForPeriod = (choresToFilter: Chore[]): { active: Chore[], completed: Chore[] } => {
      const activeChores: Chore[] = [];
      const completedChores: Chore[] = [];

      choresToFilter.forEach(chore => {
        // Skip if recurrence end date has passed
        if (chore.recurrenceEndDate && new Date(chore.recurrenceEndDate) < today) {
          return;
        }

        let relevantDate = chore.dueDate ? new Date(chore.dueDate) : null;
        if (relevantDate) relevantDate.setHours(0,0,0,0); // Normalize for comparison

        // For non-recurring, only show if due date is today or in future, or if incomplete and past due
        if (!chore.recurrenceType || chore.recurrenceType === 'none') {
          if (relevantDate && (isDateInFuture(chore.dueDate!) || !chore.isComplete) ) {
            // Further filter by period
            if (selectedPeriod === 'daily' && chore.dueDate === todayStr) {
               chore.isComplete ? completedChores.push(chore) : activeChores.push(chore);
            } else if (selectedPeriod === 'weekly' && relevantDate && relevantDate >= currentWeekRange.start && relevantDate <= currentWeekRange.end) {
               chore.isComplete ? completedChores.push(chore) : activeChores.push(chore);
            } else if (selectedPeriod === 'monthly' && relevantDate && relevantDate >= currentMonthRange.start && relevantDate <= currentMonthRange.end) {
               chore.isComplete ? completedChores.push(chore) : activeChores.push(chore);
            }
          }
        } else { // Recurring chores
          // Simplified logic: show if it's "active" for the period type.
          // More complex logic would generate specific instances.
          let isActiveForPeriod = false;
          if (selectedPeriod === 'daily' && chore.recurrenceType === 'daily') {
            isActiveForPeriod = true;
          } else if (selectedPeriod === 'weekly') {
            if (chore.recurrenceType === 'daily') isActiveForPeriod = true; // Daily chores appear every day of the week
            if (chore.recurrenceType === 'weekly') {
              // Check if chore.recurrenceDay falls within the current week view (always true by this simplified logic)
              // A more precise check would be if today is that day of the week, or if we are showing full week.
              // For now, assume weekly chores are candidates for the "This Week" column.
              isActiveForPeriod = true;
            }
          } else if (selectedPeriod === 'monthly') {
            if (chore.recurrenceType === 'daily' || chore.recurrenceType === 'weekly') isActiveForPeriod = true; // Daily/Weekly appear in monthly view
            if (chore.recurrenceType === 'monthly') {
              // Similar to weekly, assume monthly chores are candidates for "This Month".
              isActiveForPeriod = true;
            }
          }

          if (isActiveForPeriod) {
            // For recurring chores, `isComplete` might mean the *current* instance is done.
            // The mock data doesn't have per-instance completion, so we use the general `isComplete`.
            // This means a completed daily chore might not reappear until toggled or app reset.
            // This is a limitation of the current data model for true Kanban recurrence.
            chore.isComplete ? completedChores.push(chore) : activeChores.push(chore);
          }
        }
      });
      return { active: activeChores, completed: completedChores };
    };

    const { active, completed } = processChoresForPeriod(kidChores);

    if (selectedPeriod === 'daily') {
      setColumns([
        { id: 'today_active', title: 'Today - Active', chores: active },
        { id: 'today_completed', title: 'Today - Completed', chores: completed },
      ]);
    } else if (selectedPeriod === 'weekly') {
      setColumns([
        { id: 'this_week_active', title: 'This Week - Active', chores: active },
        { id: 'this_week_completed', title: 'This Week - Completed', chores: completed },
      ]);
    } else { // monthly
      setColumns([
        { id: 'this_month_active', title: 'This Month - Active', chores: active },
        { id: 'this_month_completed', title: 'This Month - Completed', chores: completed },
      ]);
    }
  }, [kidId, selectedPeriod, kidChores, getChoresForKid]); // Ensure all dependencies are listed

  return (
    <div className="kid-kanban-board">
      <div className="period-selector" style={{ marginBottom: '15px' }}>
        <button onClick={() => setSelectedPeriod('daily')} disabled={selectedPeriod === 'daily'}>Daily</button>
        <button onClick={() => setSelectedPeriod('weekly')} disabled={selectedPeriod === 'weekly'}>Weekly</button>
        <button onClick={() => setSelectedPeriod('monthly')} disabled={selectedPeriod === 'monthly'}>Monthly</button>
      </div>
      <div className="kanban-columns" style={{ display: 'flex', gap: '10px' }}>
        {columns.map(col => (
          <KanbanColumn key={col.id} column={col} />
        ))}
        {columns.length === 0 && <p>No chores to display for this period.</p>}
      </div>
    </div>
  );
};

export default KidKanbanBoard;
