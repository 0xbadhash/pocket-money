/**
 * @file KidKanbanBoard.tsx
 * Displays a Kanban board for a specific kid, showing their chores.
 * Uses user-defined columns and supports drag-and-drop for chore reordering and column changes.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
import { useUserContext } from '../../contexts/UserContext';
import type { ChoreDefinition, ChoreInstance, KanbanPeriod, KanbanColumn as KanbanColumnType, ColumnThemeOption, KanbanColumnConfig } from '../../types';
import KanbanColumn from './KanbanColumn';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragCancelEvent,
  DragOverlay
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { getTodayDateString, getWeekRange, getMonthRange } from '../../utils/dateUtils';

type RewardFilterOption = 'any' | 'has_reward' | 'no_reward';
type SortByOption = 'instanceDate' | 'title' | 'rewardAmount'; // 'instanceDate' is also "My Order"
type SortDirectionOption = 'asc' | 'desc';

interface ActiveDragItem {
  instance: ChoreInstance;
  definition: ChoreDefinition;
}

interface KidKanbanBoardProps {
  kidId: string;
}

const KidKanbanBoard: React.FC<KidKanbanBoardProps> = ({ kidId }) => {
  const {
    choreDefinitions,
    choreInstances,
    generateInstancesForPeriod,
    // toggleChoreInstanceComplete, // Not used directly for column moves anymore
    updateKanbanChoreOrder,
    kanbanChoreOrders,
    updateChoreInstanceColumn
  } = useChoresContext();
  const { getKanbanColumnConfigs } = useUserContext();

  const [selectedPeriod, setSelectedPeriod] = useState<KanbanPeriod>('daily');
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(null);
  const [rewardFilter, setRewardFilter] = useState<RewardFilterOption>('any');
  const [sortBy, setSortBy] = useState<SortByOption>('instanceDate'); // Default to 'instanceDate' for custom order
  const [sortDirection, setSortDirection] = useState<SortDirectionOption>('asc');
  const [selectedColumnTheme, setSelectedColumnTheme] = useState<ColumnThemeOption>(() => {
    const storedTheme = localStorage.getItem('kanban_columnTheme') as ColumnThemeOption | null;
    return storedTheme || 'default';
  });

  useEffect(() => {
    localStorage.setItem('kanban_columnTheme', selectedColumnTheme);
  }, [selectedColumnTheme]);

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

  useEffect(() => {
    const userColumnConfigs = getKanbanColumnConfigs(kidId);
    const defaultKanbanColumnId = userColumnConfigs.length > 0
                                  ? [...userColumnConfigs].sort((a,b) => a.order - b.order)[0].id
                                  : undefined;
    if (currentPeriodDateRange.start && currentPeriodDateRange.end && kidId) { // Ensure kidId is present
      generateInstancesForPeriod(
        currentPeriodDateRange.start,
        currentPeriodDateRange.end,
        defaultKanbanColumnId
      );
    }
  }, [kidId, currentPeriodDateRange, generateInstancesForPeriod, getKanbanColumnConfigs, choreDefinitions]);

  useEffect(() => {
    const userColumnConfigs = getKanbanColumnConfigs(kidId).sort((a, b) => a.order - b.order);

    if (!kidId) {
        setColumns([]);
        return;
    }
    // If no columns configured for the kid, KidKanbanBoard will show a message via its render logic.
    // generateInstancesForPeriod would have been called with undefined defaultKanbanColumnId.
    // Chores without a kanbanColumnId will be handled by the column building logic below.

    const kidAndPeriodInstances = choreInstances.filter(instance => {
      const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
      return definition && definition.assignedKidId === kidId &&
             instance.instanceDate >= currentPeriodDateRange.start &&
             instance.instanceDate <= currentPeriodDateRange.end;
    });

    const filteredInstancesOverall = kidAndPeriodInstances.filter(instance => {
      const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
      if (!definition) return true;
      if (rewardFilter === 'has_reward') return definition.rewardAmount && definition.rewardAmount > 0;
      if (rewardFilter === 'no_reward') return !definition.rewardAmount || definition.rewardAmount === 0;
      return true;
    });

    const applySortLogic = (
      chores: ChoreInstance[],
      columnConfigId: string,
    ): ChoreInstance[] => {
      const orderKey = `${kidId}-${columnConfigId}`;
      const customOrderIds = kanbanChoreOrders[orderKey];

      if (sortBy === 'instanceDate' && customOrderIds && customOrderIds.length > 0) {
        const choreMap = new Map(chores.map(chore => [chore.id, chore]));
        let orderedChores: ChoreInstance[] = [];
        customOrderIds.forEach(id => {
          const chore = choreMap.get(id);
          if (chore) orderedChores.push(chore);
          choreMap.delete(id);
        });
        const remainingChores = Array.from(choreMap.values()).sort((a,b) =>
          new Date(a.instanceDate).getTime() - new Date(b.instanceDate).getTime()
        );
        return [...orderedChores, ...remainingChores];
      } else {
        return [...chores].sort((a, b) => {
          const defA = choreDefinitions.find(d => d.id === a.choreDefinitionId);
          const defB = choreDefinitions.find(d => d.id === b.choreDefinitionId);
          if (!defA || !defB) return 0;
          if (sortBy === 'instanceDate') {
            return sortDirection === 'asc' ? new Date(a.instanceDate).getTime() - new Date(b.instanceDate).getTime() : new Date(b.instanceDate).getTime() - new Date(a.instanceDate).getTime();
          }
          if (sortBy === 'title') {
            return sortDirection === 'asc' ? defA.title.localeCompare(defB.title) : defB.title.localeCompare(defA.title);
          }
          if (sortBy === 'rewardAmount') {
            return sortDirection === 'asc' ? (defA.rewardAmount || 0) - (defB.rewardAmount || 0) : (defB.rewardAmount || 0) - (defA.rewardAmount || 0);
          }
          return 0;
        });
      }
    };

    const newKanbanColumns = userColumnConfigs.map(config => {
      const choresForThisColumn = filteredInstancesOverall.filter(instance =>
        instance.kanbanColumnId === config.id ||
        (!instance.kanbanColumnId && config.id === userColumnConfigs[0]?.id) // Assign unassigned to first column
      );
      const sortedChores = applySortLogic(choresForThisColumn, config.id);
      return { id: config.id, title: config.title, chores: sortedChores };
    });

    setColumns(newKanbanColumns);

  }, [
    kidId, selectedPeriod, choreInstances, choreDefinitions, currentPeriodDateRange,
    rewardFilter, sortBy, sortDirection, kanbanChoreOrders, getKanbanColumnConfigs
  ]);

  const getDefinitionForInstance = (instance: ChoreInstance): ChoreDefinition | undefined => {
    return choreDefinitions.find(def => def.id === instance.choreDefinitionId);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const instance = choreInstances.find(inst => inst.id === active.id.toString());
    if (instance) {
      const definition = getDefinitionForInstance(instance);
      if (definition) setActiveDragItem({ instance, definition });
      else setActiveDragItem(null);
    } else {
      setActiveDragItem(null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragItem(null);
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();
    const activeContainerId = active.data.current?.sortable?.containerId;
    let overContainerId = over.data.current?.sortable?.containerId;

    if (!overContainerId) {
      const isOverColumn = columns.some(col => col.id === over.id.toString());
      if (isOverColumn) overContainerId = over.id.toString();
      else {
        const columnContainingOverItem = columns.find(col => col.chores.some(chore => chore.id === overId));
        if (columnContainingOverItem) overContainerId = columnContainingOverItem.id;
      }
    }

    if (!activeContainerId || !overContainerId) return;

    if (activeId === overId && activeContainerId === overContainerId) {
        const itemsInColumn = columns.find(col => col.id === activeContainerId)?.chores || [];
        const oldIdx = itemsInColumn.findIndex(item => item.id === activeId);
        const newIdx = itemsInColumn.findIndex(item => item.id === overId);
        if (oldIdx === newIdx) return;
    }

    setColumns(prev => {
      const activeColumn = prev.find(col => col.id === activeContainerId);
      const overColumn = prev.find(col => col.id === overContainerId);

      if (!activeColumn || !overColumn) return prev;

      if (activeContainerId === overContainerId) { // Same column reorder
        const oldIndex = activeColumn.chores.findIndex(item => item.id === activeId);
        const newIndex = activeColumn.chores.findIndex(item => item.id === overId);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const updatedChores = arrayMove(activeColumn.chores, oldIndex, newIndex);
          updateKanbanChoreOrder(kidId, activeContainerId, updatedChores.map(c => c.id));
          return prev.map(col => col.id === activeContainerId ? { ...col, chores: updatedChores } : col);
        }
      } else { // Different columns
        const sourceChores = [...activeColumn.chores];
        const destChores = [...overColumn.chores];
        const activeItemIndex = sourceChores.findIndex(item => item.id === activeId);
        if (activeItemIndex === -1) return prev;

        const [movedItemOriginal] = sourceChores.splice(activeItemIndex, 1);
        let itemToMove = { ...movedItemOriginal, kanbanColumnId: overColumn.id };

        updateChoreInstanceColumn(itemToMove.id, overColumn.id);

        let overIndex = destChores.findIndex(item => item.id === overId);
        if (overId === overColumn.id || overIndex === -1) { // Dropped on column or empty space
          overIndex = destChores.length;
        }
        destChores.splice(overIndex, 0, itemToMove);

        return prev.map(col => {
          if (col.id === activeContainerId) return { ...col, chores: sourceChores };
          if (col.id === overContainerId) return { ...col, chores: destChores };
          return col;
        });
      }
      return prev;
    });
  }

  function handleDragCancel() {
    setActiveDragItem(null);
  }

  const userColumnConfigs = getKanbanColumnConfigs(kidId);

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
            <select id="rewardFilterSelect" value={rewardFilter} onChange={(e) => setRewardFilter(e.target.value as RewardFilterOption)} style={{ padding: '5px' }}>
              <option value="any">Any Reward</option>
              <option value="has_reward">Has Reward</option>
              <option value="no_reward">No Reward</option>
            </select>
          </div>
          <div>
            <label htmlFor="sortBySelect" style={{ marginRight: '5px' }}>Sort by:</label>
            <select id="sortBySelect" value={sortBy} onChange={(e) => {
                const newSortBy = e.target.value as SortByOption;
                setSortBy(newSortBy);
                if (newSortBy === 'rewardAmount') setSortDirection('desc');
                else setSortDirection('asc');
                if (newSortBy !== 'instanceDate') {
                  userColumnConfigs.forEach(config => { // Use userColumnConfigs from outer scope
                    updateKanbanChoreOrder(kidId, config.id, []);
                  });
                }
              }} style={{ padding: '5px' }}>
              <option value="instanceDate">My Order / Due Date</option>
              <option value="title">Title</option>
              <option value="rewardAmount">Reward</option>
            </select>
          </div>
          <div>
            <button onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')} style={{ padding: '5px 10px' }} title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}>
              {sortBy === 'rewardAmount' ? (sortDirection === 'asc' ? 'Low to High' : 'High to Low') : (sortDirection === 'asc' ? 'A-Z / Old-New' : 'Z-A / New-Old')}
              {sortDirection === 'asc' ? ' ↑' : ' ↓'}
            </button>
          </div>
          <div>
            <label htmlFor="columnThemeSelect" style={{ marginRight: '5px' }}>Column Theme:</label>
            <select id="columnThemeSelect" value={selectedColumnTheme} onChange={(e) => setSelectedColumnTheme(e.target.value as ColumnThemeOption)} style={{ padding: '5px' }}>
              <option value="default">Default</option>
              <option value="pastel">Pastel</option>
              <option value="ocean">Ocean</option>
            </select>
          </div>
        </div>

        {kidId && userColumnConfigs.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--surface-color-hover)', borderRadius: 'var(--border-radius-lg)'}}>
            <p>No Kanban columns are set up for this kid yet.</p>
            <p>Please go to Settings &gt; Kanban Column Settings to configure them.</p>
          </div>
        )}

        <div className="kanban-columns" style={{ display: 'flex', gap: '10px' }}>
          {columns.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              getDefinitionForInstance={getDefinitionForInstance}
              theme={selectedColumnTheme}
            />
          ))}
          {/* The message below might be redundant if the above message for no configs is shown */}
          {kidId && userColumnConfigs.length > 0 && columns.every(col => col.chores.length === 0) &&
            <p style={{padding: '20px'}}>No chores to display for this period or matching current filters in any column.</p>
          }
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDragItem ? (
          <KanbanCard instance={activeDragItem.instance} definition={activeDragItem.definition} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KidKanbanBoard;
