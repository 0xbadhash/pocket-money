// src/ui/kanban_components/KidKanbanBoard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
import type { ChoreDefinition, ChoreInstance, KanbanPeriod, KanbanColumn as KanbanColumnType } from '../../types';
import KanbanColumn from './KanbanColumn';
import { getTodayDateString, getWeekRange, getMonthRange } from '../../utils/dateUtils';

interface KidKanbanBoardProps {
  kidId: string;
}

const KidKanbanBoard: React.FC<KidKanbanBoardProps> = ({ kidId }) => {
  const { choreDefinitions, choreInstances, generateInstancesForPeriod } = useChoresContext();
  const [selectedPeriod, setSelectedPeriod] = useState<KanbanPeriod>('daily');
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);

  // 1. Determine current period's start and end dates
  const currentPeriodDateRange = useMemo(() => {
    const today = new Date();
    if (selectedPeriod === 'daily') {
      const todayStr = getTodayDateString();
      return { start: todayStr, end: todayStr };
    } else if (selectedPeriod === 'weekly') {
      const range = getWeekRange(today);
      return { start: range.start.toISOString().split('T')[0], end: range.end.toISOString().split('T')[0] };
    } else { // monthly
      const range = getMonthRange(today);
      return { start: range.start.toISOString().split('T')[0], end: range.end.toISOString().split('T')[0] };
    }
  }, [selectedPeriod]);

  // 2. Effect to trigger instance generation in context when period or definitions change
  useEffect(() => {
    if (currentPeriodDateRange.start && currentPeriodDateRange.end) {
      generateInstancesForPeriod(currentPeriodDateRange.start, currentPeriodDateRange.end);
    }
  }, [currentPeriodDateRange, generateInstancesForPeriod, choreDefinitions]);

  // 3. Effect to process instances from context and build columns for the UI
  useEffect(() => {
    const kidAndPeriodInstances = choreInstances.filter(instance => {
      const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
      if (!definition || definition.assignedKidId !== kidId) return false;

      const instanceDate = new Date(instance.instanceDate);
      instanceDate.setUTCHours(0,0,0,0);
      const periodStart = new Date(currentPeriodDateRange.start);
      periodStart.setUTCHours(0,0,0,0);
      const periodEnd = new Date(currentPeriodDateRange.end);
      periodEnd.setUTCHours(0,0,0,0);
      return instanceDate >= periodStart && instanceDate <= periodEnd;
    });

    const activeChores: ChoreInstance[] = kidAndPeriodInstances.filter(inst => !inst.isComplete);
    const completedChores: ChoreInstance[] = kidAndPeriodInstances.filter(inst => inst.isComplete);

    let columnTitles = { active: "Active", completed: "Completed" };
    if (selectedPeriod === 'daily') {
        columnTitles = { active: "Today - Active", completed: "Today - Completed" };
    } else if (selectedPeriod === 'weekly') {
        columnTitles = { active: "This Week - Active", completed: "This Week - Completed" };
    } else { // monthly
        columnTitles = { active: "This Month - Active", completed: "This Month - Completed" };
    }

    setColumns([
      { id: `${selectedPeriod}_active`, title: columnTitles.active, chores: activeChores },
      { id: `${selectedPeriod}_completed`, title: columnTitles.completed, chores: completedChores },
    ]);

  }, [kidId, selectedPeriod, choreInstances, choreDefinitions, currentPeriodDateRange]);


  const getDefinitionForInstance = (instance: ChoreInstance): ChoreDefinition | undefined => {
    return choreDefinitions.find(def => def.id === instance.choreDefinitionId);
  };

  return (
    <div className="kid-kanban-board">
      <div className="period-selector" style={{ marginBottom: '15px' }}>
        <button onClick={() => setSelectedPeriod('daily')} disabled={selectedPeriod === 'daily'}>Daily</button>
        <button onClick={() => setSelectedPeriod('weekly')} disabled={selectedPeriod === 'weekly'}>Weekly</button>
        <button onClick={() => setSelectedPeriod('monthly')} disabled={selectedPeriod === 'monthly'}>Monthly</button>
      </div>
      <div className="kanban-columns" style={{ display: 'flex', gap: '10px' }}>
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            getDefinitionForInstance={getDefinitionForInstance}
          />
        ))}
        {columns.every(col => col.chores.length === 0) && <p>No chores to display for this period.</p>}
      </div>
    </div>
  );
};

export default KidKanbanBoard;
