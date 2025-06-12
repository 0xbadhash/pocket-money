/**
 * @file KidKanbanBoard.tsx
 * Displays a Kanban board for a specific kid, showing their chores.
 * Uses user-defined columns from UserContext and supports drag-and-drop
 * for chore reordering (persisted via ChoresContext) and moving chores
 * between these dynamic columns (updating choreInstance.kanbanColumnId via ChoresContext).
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
import { useUserContext } from '../../contexts/UserContext';
import type { ChoreDefinition, ChoreInstance, KanbanPeriod, KanbanColumn as KanbanColumnType, ColumnThemeOption, KanbanColumnConfig } from '../../types';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import * as DndKit from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { getTodayDateString, getWeekRange, getMonthRange } from '../../utils/dateUtils';

// Types for filter and sort state
type RewardFilterOption = 'any' | 'has_reward' | 'no_reward';
type SortByOption = 'instanceDate' | 'title' | 'rewardAmount'; // 'instanceDate' is also "My Order"
type SortDirectionOption = 'asc' | 'desc';

/**
 * @interface ActiveDragItem
 * Represents the data associated with the currently dragged Kanban card.
 * Used by DragOverlay to render a preview of the card being dragged.
 */
interface ActiveDragItem {
  /** The chore instance being dragged. */
  instance: ChoreInstance;
  /** The definition of the chore being dragged. */
  definition: ChoreDefinition;
}

/**
 * @interface KidKanbanBoardProps
 * Props for the KidKanbanBoard component.
 */
interface KidKanbanBoardProps {
  /** The ID of the kid whose Kanban board is to be displayed. */
  kidId: string;
}

/**
 * KidKanbanBoard component.
 * Renders a customizable Kanban board for a specific kid, displaying their chores
 * based on user-defined columns. Features period selection, filtering, sorting (including custom order),
 * theming, and drag-and-drop functionality for chore management.
 * @param {KidKanbanBoardProps} props - The component props.
 * @returns {JSX.Element} The KidKanbanBoard UI.
 */
const KidKanbanBoard: React.FC<KidKanbanBoardProps> = ({ kidId }) => {
  const {
    choreDefinitions,
    choreInstances,
    generateInstancesForPeriod,
    updateKanbanChoreOrder,
    kanbanChoreOrders,
    updateChoreInstanceColumn
  } = useChoresContext();
  const { getKanbanColumnConfigs } = useUserContext();

  /** State for the selected time period (daily, weekly, monthly) for displaying chores. */
  const [selectedPeriod, setSelectedPeriod] = useState<KanbanPeriod>('daily');
  /** State representing the dynamically configured columns and the chores within them for the Kanban board. */
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  /** State holding the active chore instance and definition being dragged, for DragOverlay. */
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(null);
  /**
   * State for displaying temporary feedback messages to the user,
   * such as when a chore is moved to a new column. Null if no message is active.
   * @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]}
   */
  const [actionFeedbackMessage, setActionFeedbackMessage] = useState<string | null>(null);

  /** State for filtering chores by reward status. */
  const [rewardFilter, setRewardFilter] = useState<RewardFilterOption>('any');
  /**
   * State for the criteria used to sort chores.
   * 'instanceDate' also serves as the "My Order" option, respecting drag-and-drop persisted order.
   */
  const [sortBy, setSortBy] = useState<SortByOption>('instanceDate');
  /** State for the direction of sorting (ascending or descending). */
  const [sortDirection, setSortDirection] = useState<SortDirectionOption>('asc');
  /** State for the selected visual theme for Kanban columns. Persisted in localStorage. */
  const [selectedColumnTheme, setSelectedColumnTheme] = useState<ColumnThemeOption>(() => {
    const storedTheme = localStorage.getItem('kanban_columnTheme') as ColumnThemeOption | null;
    return storedTheme || 'default';
  });

  /** Effect to save selected column theme to localStorage. */
  useEffect(() => {
    localStorage.setItem('kanban_columnTheme', selectedColumnTheme);
  }, [selectedColumnTheme]);

  /**
   * Effect to auto-clear the `actionFeedbackMessage` after a 3-second delay.
   * This ensures feedback messages are temporary and don't clutter the UI.
   */
  useEffect(() => {
    if (actionFeedbackMessage) {
      const timer = setTimeout(() => {
        setActionFeedbackMessage(null);
      }, 3000); // Clear after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [actionFeedbackMessage]);

  /** Memoized calculation of the date range for the selected period. */
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

  /**
   * Effect to trigger chore instance generation in `ChoresContext`.
   * This is called when the period, kid, or chore definitions change.
   * It fetches the kid's column configurations to pass the ID of the first column
   * as the default column for newly generated instances.
   */
  useEffect(() => {
    if (!kidId) return;
    const userColumnConfigs = getKanbanColumnConfigs(kidId);
    const sortedUserColumnConfigs = [...userColumnConfigs].sort((a,b) => a.order - b.order);
    const defaultKanbanColumnId = sortedUserColumnConfigs.length > 0
                                  ? sortedUserColumnConfigs[0].id
                                  : undefined;
    if (currentPeriodDateRange.start && currentPeriodDateRange.end) {
      generateInstancesForPeriod(
        currentPeriodDateRange.start,
        currentPeriodDateRange.end,
        defaultKanbanColumnId
      );
    }
  }, [kidId, currentPeriodDateRange, generateInstancesForPeriod, getKanbanColumnConfigs, choreDefinitions]);

  /**
   * Main effect hook for processing chore instances from context and building the displayable Kanban columns.
   * It filters instances by kid and selected period, then by reward filter.
   * It then iterates through the user-configured Kanban columns (from UserContext),
   * assigning chores to their respective columns based on `choreInstance.kanbanColumnId`
   * (defaulting unassigned chores to the first configured column).
   * Finally, it applies sorting logic (custom drag-and-drop order or explicit sorts)
   * to the chores within each column before updating the `columns` state.
   *
   * Note: If data fetching/processing within this effect were to become asynchronous
   * or significantly time-consuming (e.g., with backend calls or very large datasets),
   * introducing an `isLoading` state that's set to true at the beginning and false at
   * the end of this effect would be advisable to provide user feedback.
   * Currently, with synchronous operations on local data, it's typically fast enough
   * not to require an explicit loading indicator for these re-calculations.
   */
  useEffect(() => {
    if (!kidId) {
        setColumns([]);
        return;
    }
    const userColumnConfigs = getKanbanColumnConfigs(kidId).sort((a, b) => a.order - b.order);

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
        (!instance.kanbanColumnId && config.id === userColumnConfigs[0]?.id)
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

  const sensors = DndKit.useSensors(
    DndKit.useSensor(DndKit.PointerSensor),
    DndKit.useSensor(DndKit.KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DndKit.DragStartEvent) {
    const { active } = event;
    const instance = choreInstances.find(inst => inst.id === active.id.toString());
    if (instance) {
      const definition = getDefinitionForInstance(instance);
      // Store the instance and its definition in activeDragItem for use in DragOverlay and handleDragEnd.
      if (definition) setActiveDragItem({ instance, definition });
      else setActiveDragItem(null);
    } else {
      setActiveDragItem(null);
    }
  }

  function handleDragEnd(event: DndKit.DragEndEvent) {
    // Capture activeDragItem before clearing it, to use its data for feedback message.
    const currentActiveDragItem = activeDragItem;
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

      if (activeContainerId === overContainerId) {
        const oldIndex = activeColumn.chores.findIndex(item => item.id === activeId);
        const newIndex = activeColumn.chores.findIndex(item => item.id === overId);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const updatedChores = arrayMove(activeColumn.chores, oldIndex, newIndex);
          updateKanbanChoreOrder(kidId, activeContainerId, updatedChores.map(c => c.id));
          // No specific feedback for same-column reorder, but could be added.
          // Example: setActionFeedbackMessage(`${currentActiveDragItem?.definition.title || 'Chore'} reordered in ${activeColumn.title}.`);
          return prev.map(col => col.id === activeContainerId ? { ...col, chores: updatedChores } : col);
        }
      } else {
        const sourceChores = [...activeColumn.chores];
        const destChores = [...overColumn.chores];
        const activeItemIndex = sourceChores.findIndex(item => item.id === activeId);

        if (activeItemIndex === -1) return prev;

        const [movedItemOriginal] = sourceChores.splice(activeItemIndex, 1);
        let itemToMove = { ...movedItemOriginal, kanbanColumnId: overColumn.id };

        updateChoreInstanceColumn(itemToMove.id, overColumn.id);

        // Set feedback message for inter-column move.
        const title = currentActiveDragItem?.definition?.title || 'Chore'; // Use title from captured activeDragItem
        setActionFeedbackMessage(`${title} moved to ${overColumn.title}.`);

        let overIndex = destChores.findIndex(item => item.id === overId);
        if (overId === overColumn.id || overIndex === -1) {
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
    <DndKit.DndContext
      sensors={sensors}
      collisionDetection={DndKit.closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="kid-kanban-board">
        {/* Action feedback message display area.
            Role "status" and aria-live "polite" make it an announcement region for screen readers. */}
        {actionFeedbackMessage && (
          <div className="kanban-action-feedback" role="status" aria-live="polite">
            {actionFeedbackMessage}
          </div>
        )}
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
                  const currentKidColumns = getKanbanColumnConfigs(kidId);
                  currentKidColumns.forEach(config => {
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

        <div
          className="kanban-columns"
          style={{ display: 'flex', gap: '10px' }}
          role="list" // Changed from group, as it's a list of columns (which are groups)
          aria-label="Kanban board columns"
        >
          {columns.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              getDefinitionForInstance={getDefinitionForInstance}
              theme={selectedColumnTheme}
            />
          ))}
          {kidId && userColumnConfigs.length > 0 && columns.every(col => col.chores.length === 0) &&
            <p style={{padding: '20px'}}>No chores to display for this period or matching current filters in any column.</p>
          }
        </div>
      </div>
      <DndKit.DragOverlay dropAnimation={null}>
        {activeDragItem ? (
          <KanbanCard
            instance={activeDragItem.instance}
            definition={activeDragItem.definition}
            isOverlay={true} // Pass isOverlay to distinguish the drag preview from the actual sortable item
          />
        ) : null}
      </DndKit.DragOverlay>
    </DndKit.DndContext>
  );
};

export default KidKanbanBoard;
