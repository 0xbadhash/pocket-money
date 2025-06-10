// src/ui/kanban_components/KidKanbanBoard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
// Import ColumnThemeOption from types
import type { ChoreDefinition, ChoreInstance, KanbanPeriod, KanbanColumn as KanbanColumnType, ColumnThemeOption } from '../../types';
import KanbanColumn from './KanbanColumn';
import { getTodayDateString, getWeekRange, getMonthRange } from '../../utils/dateUtils';

// Types for filter and sort state
type RewardFilterOption = 'any' | 'has_reward' | 'no_reward';
type SortByOption = 'instanceDate' | 'title' | 'rewardAmount';
type SortDirectionOption = 'asc' | 'desc';
// ColumnThemeOption is now imported from ../../types

interface KidKanbanBoardProps {
  kidId: string;
}

const KidKanbanBoard: React.FC<KidKanbanBoardProps> = ({ kidId }) => {
  const { choreDefinitions, choreInstances, generateInstancesForPeriod } = useChoresContext();
  const [selectedPeriod, setSelectedPeriod] = useState<KanbanPeriod>('daily');
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);

  // State for filters and sorting
  const [rewardFilter, setRewardFilter] = useState<RewardFilterOption>('any');
  const [sortBy, setSortBy] = useState<SortByOption>('instanceDate');
  const [sortDirection, setSortDirection] = useState<SortDirectionOption>('asc');
  const [selectedColumnTheme, setSelectedColumnTheme] = useState<ColumnThemeOption>(() => {
    const storedTheme = localStorage.getItem('kanban_columnTheme') as ColumnThemeOption | null;
    return storedTheme || 'default';
  });

  // Effect to save theme to localStorage
  useEffect(() => {
    localStorage.setItem('kanban_columnTheme', selectedColumnTheme);
  }, [selectedColumnTheme]);

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

    // Apply Filtering
    const filteredInstances = kidAndPeriodInstances.filter(instance => {
      const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
      if (!definition) return true; // Or handle error, but for filtering, let it pass if def not found

      if (rewardFilter === 'has_reward') {
        return definition.rewardAmount && definition.rewardAmount > 0;
      } else if (rewardFilter === 'no_reward') {
        return !definition.rewardAmount || definition.rewardAmount === 0;
      }
      return true; // 'any'
    });

    let activeChores: ChoreInstance[] = filteredInstances.filter(inst => !inst.isComplete);
    let completedChores: ChoreInstance[] = filteredInstances.filter(inst => inst.isComplete);

    // Apply Sorting
    const sortInstances = (instances: ChoreInstance[], definitions: ChoreDefinition[], criteria: SortByOption, direction: SortDirectionOption): ChoreInstance[] => {
      const sorted = [...instances].sort((a, b) => {
        const defA = definitions.find(d => d.id === a.choreDefinitionId);
        const defB = definitions.find(d => d.id === b.choreDefinitionId);

        // Handle cases where definitions might be missing (shouldn't happen in ideal state)
        if (!defA && !defB) return 0;
        if (!defA) return direction === 'asc' ? 1 : -1; // Put items without defs at end or start
        if (!defB) return direction === 'asc' ? -1 : 1;


        if (criteria === 'instanceDate') {
          const dateA = new Date(a.instanceDate).getTime();
          const dateB = new Date(b.instanceDate).getTime();
          return direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        if (criteria === 'title') {
          return direction === 'asc' ? defA.title.localeCompare(defB.title) : defB.title.localeCompare(defA.title);
        }
        if (criteria === 'rewardAmount') {
          const rewardA = defA.rewardAmount || 0;
          const rewardB = defB.rewardAmount || 0;
          return direction === 'asc' ? rewardA - rewardB : rewardB - rewardA;
        }
        return 0;
      });
      return sorted;
    };

    activeChores = sortInstances(activeChores, choreDefinitions, sortBy, sortDirection);
    completedChores = sortInstances(completedChores, choreDefinitions, sortBy, sortDirection);

    // Set Columns (existing logic)
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

  }, [kidId, selectedPeriod, choreInstances, choreDefinitions, currentPeriodDateRange, rewardFilter, sortBy, sortDirection]); // Added new dependencies


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

      <div className="kanban-controls" style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap' }}>
        <div>
          <label htmlFor="rewardFilterSelect" style={{ marginRight: '5px' }}>Filter by Reward:</label>
          <select
            id="rewardFilterSelect"
            value={rewardFilter}
            onChange={(e) => setRewardFilter(e.target.value as RewardFilterOption)}
            style={{ padding: '5px' }}
          >
            <option value="any">Any Reward</option>
            <option value="has_reward">Has Reward</option>
            <option value="no_reward">No Reward</option>
          </select>
        </div>

        <div>
          <label htmlFor="sortBySelect" style={{ marginRight: '5px' }}>Sort by:</label>
          <select
            id="sortBySelect"
            value={sortBy}
            onChange={(e) => {
              const newSortBy = e.target.value as SortByOption;
              setSortBy(newSortBy);
              // Optional: Set default sort direction based on new sortBy
              if (newSortBy === 'rewardAmount') {
                setSortDirection('desc');
              } else {
                setSortDirection('asc');
              }
            }}
            style={{ padding: '5px' }}
          >
            <option value="instanceDate">Due Date</option>
            <option value="title">Title</option>
            <option value="rewardAmount">Reward</option>
          </select>
        </div>

        <div>
          <button
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            style={{ padding: '5px 10px' }}
            title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {sortBy === 'rewardAmount' ?
              (sortDirection === 'asc' ? 'Low to High' : 'High to Low') :
              (sortDirection === 'asc' ? 'A-Z / Old-New' : 'Z-A / New-Old')
            }
            {sortDirection === 'asc' ? ' ↑' : ' ↓'}
          </button>
        </div>

        <div>
          <label htmlFor="columnThemeSelect" style={{ marginRight: '5px' }}>Column Theme:</label>
          <select
            id="columnThemeSelect"
            value={selectedColumnTheme}
            onChange={(e) => setSelectedColumnTheme(e.target.value as ColumnThemeOption)}
            style={{ padding: '5px' }}
          >
            <option value="default">Default</option>
            <option value="pastel">Pastel</option>
            <option value="ocean">Ocean</option>
          </select>
        </div>
      </div>

      <div className="kanban-columns" style={{ display: 'flex', gap: '10px' }}>
        {columns.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            getDefinitionForInstance={getDefinitionForInstance}
            theme={selectedColumnTheme} // Pass the selected theme state
          />
        ))}
        {columns.every(col => col.chores.length === 0) && <p>No chores to display for this period.</p>}
      </div>
    </div>
  );
};

export default KidKanbanBoard;
