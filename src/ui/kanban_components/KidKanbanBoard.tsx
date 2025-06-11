// src/ui/kanban_components/KidKanbanBoard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
// Import ColumnThemeOption from types
import type { ChoreDefinition, ChoreInstance, KanbanPeriod, KanbanColumn as KanbanColumnType, ColumnThemeOption } from '../../types';
import KanbanColumn from './KanbanColumn';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter, // Or another appropriate collision detection strategy
  DragEndEvent,
  DragStartEvent,
  DragCancelEvent,
  DragOverlay
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { getTodayDateString, getWeekRange, getMonthRange } from '../../utils/dateUtils';

// Types for filter and sort state
type RewardFilterOption = 'any' | 'has_reward' | 'no_reward';
type SortByOption = 'instanceDate' | 'title' | 'rewardAmount';
type SortDirectionOption = 'asc' | 'desc';
// ColumnThemeOption is now imported from ../../types

interface ActiveDragItem {
  instance: ChoreInstance;
  definition: ChoreDefinition;
}

interface KidKanbanBoardProps {
  kidId: string;
}

const KidKanbanBoard: React.FC<KidKanbanBoardProps> = ({ kidId }) => {
  const { choreDefinitions, choreInstances, generateInstancesForPeriod, toggleChoreInstanceComplete } = useChoresContext();
  const [selectedPeriod, setSelectedPeriod] = useState<KanbanPeriod>('daily');
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(null);

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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      console.log("Drag ended outside a droppable area");
      return;
    }

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // active.data.current?.sortable.containerId is the ID of the SortableContext (column) the item came from
    const activeContainerId = active.data.current?.sortable?.containerId;
    // over.data.current?.sortable.containerId is the ID of the SortableContext (column) the item is over
    // If dropping on an item, this is the item's column. If dropping on a column itself, this will be the column's ID.
    // However, if over.id is a column ID (when dropping on an empty column), over.data.current might be undefined.
    // So, we prioritize over.data.current.sortable.containerId, then check if over.id itself is a column id.
    let overContainerId = over.data.current?.sortable?.containerId;

    if (!overContainerId) {
        // This case handles dropping an item onto a column directly (e.g., an empty column)
        // Here, over.id would be the column's ID.
        const isOverColumn = columns.some(col => col.id === over.id);
        if (isOverColumn) {
            overContainerId = over.id.toString();
        }
    }

    // If we still don't have overContainerId, it might be that we are dropping on an item
    // and need to find its container.
    if (!overContainerId) {
        const columnContainingOverItem = columns.find(col => col.chores.some(chore => chore.id === overId));
        if (columnContainingOverItem) {
            overContainerId = columnContainingOverItem.id;
        }
    }


    if (!activeContainerId || !overContainerId) {
      console.warn("Could not determine active or over container. Active:", activeContainerId, "Over:", overContainerId);
      return;
    }

    // Don't do anything if dropping on itself (item) in the same column
    if (activeId === overId && activeContainerId === overContainerId) {
      console.log("Dropped on self in the same column, no reorder needed unless indices change, which is handled below.");
      // The arrayMove check later will see if index actually changed.
    }

    setColumns(prev => {
      const activeColumnIndex = prev.findIndex(col => col.id === activeContainerId);
      const overColumnIndex = prev.findIndex(col => col.id === overContainerId);

      if (activeColumnIndex === -1 || overColumnIndex === -1) {
        console.error("Active or over column not found in state");
        return prev;
      }

      // If same column
      if (activeContainerId === overContainerId) {
        const currentColumn = prev[activeColumnIndex];
        const oldIndex = currentColumn.chores.findIndex(item => item.id === activeId);
        const newIndex = currentColumn.chores.findIndex(item => item.id === overId);

        if (oldIndex === newIndex) { // No actual change in order
            console.log("Item dropped in the same position in the same column.");
            return prev;
        }

        if (oldIndex !== -1 && newIndex !== -1) {
          const updatedChores = arrayMove(currentColumn.chores, oldIndex, newIndex);
          const newColumns = [...prev];
          newColumns[activeColumnIndex] = {
            ...currentColumn,
            chores: updatedChores,
          };
          return newColumns;
        }
      } else { // Different columns
        const sourceColumn = prev[activeColumnIndex];
        const destinationColumn = prev[overColumnIndex];

        const sourceItems = [...sourceColumn.chores];
        const destinationItems = [...destinationColumn.chores];

        const activeItemIndex = sourceItems.findIndex(item => item.id === activeId);
        if (activeItemIndex === -1) {
            console.error("Error: Could not find active item in source column during drag end.");
            return prev;
        }

        const [draggedItemOriginal] = sourceItems.splice(activeItemIndex, 1);
        let itemToMove = { ...draggedItemOriginal }; // Clone to modify if status changes

        // Update completion status if moving between 'active' and 'completed' columns
        if (sourceColumn.id !== destinationColumn.id) {
          const destinationIsCompletedColumn = destinationColumn.id.endsWith('_completed');
          // itemNeedsStatusChange is true if the item's current status is different from what the destination column implies
          const itemNeedsStatusChange = itemToMove.isComplete === destinationIsCompletedColumn;

          // Corrected logic: Change status if current status doesn't match destination column type
          if (itemToMove.isComplete !== destinationIsCompletedColumn) {
            // Call context function to update the source of truth
            toggleChoreInstanceComplete(itemToMove.id);
            // Also update the local item's status for immediate UI consistency before context re-render
            itemToMove.isComplete = destinationIsCompletedColumn;
          }
        }

        // Find target index in destination column
        // If overId is an item in destinationColumn, find its index.
        // If overId is the columnId (dropped on empty column), newIndex is destinationItems.length.
        let newDestinationIndex = destinationItems.findIndex(item => item.id === overId);

        if (newDestinationIndex === -1) { // Dropped on column itself or empty space
            if (over.id === overContainerId) { // Check if over.id is the column ID
                 newDestinationIndex = destinationItems.length; // Add to the end
            } else {
                // This case might occur if `over.id` is an item that somehow wasn't found,
                // or if `overContainerId` was determined via an item but `over.id` itself isn't in `destinationItems` yet.
                // Defaulting to the end is a safe fallback.
                console.warn(`Could not find item with id ${overId} in destination column ${overContainerId} for precise indexing. Adding to end.`);
                newDestinationIndex = destinationItems.length;
            }
        }

        destinationItems.splice(newDestinationIndex, 0, itemToMove);

        const newColumnsState = [...prev];
        newColumnsState[activeColumnIndex] = {
          ...sourceColumn,
          chores: sourceItems, // Already updated by splice
        };
        newColumnsState[overColumnIndex] = {
          ...destinationColumn,
          chores: destinationItems, // Updated with itemToMove
        };

        // The useEffect hook that depends on `choreInstances` (updated by `toggleChoreInstanceComplete`)
        // will re-process and ensure the columns are correctly rebuilt based on the source of truth.
        // The local state update here provides immediate feedback.
        return newColumnsState;
      }
      return prev; // Fallback, should not be reached if logic is sound
    });
    setActiveDragItem(null);
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const instance = choreInstances.find(inst => inst.id === active.id);
    if (instance) {
      const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
      if (definition) {
        setActiveDragItem({ instance, definition });
      } else {
        console.warn(`Definition not found for instance ${active.id} during drag start`);
        setActiveDragItem(null);
      }
    } else {
      console.warn(`Instance ${active.id} not found during drag start`);
      setActiveDragItem(null);
    }
  }

  function handleDragCancel() { // Removed event: DragCancelEvent as it's not used
    console.log("Drag cancel event triggered");
    setActiveDragItem(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
      <DragOverlay dropAnimation={null}>
        {activeDragItem ? (
          <KanbanCard
            instance={activeDragItem.instance}
            definition={activeDragItem.definition}
            // isOverlay={true} // Optional: Consider if a specific prop is needed for overlay styling
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KidKanbanBoard;
