/**
 * @file KidKanbanBoard.tsx
 * Displays a Kanban board for a specific kid, showing their chores categorized into columns
 * (e.g., "Active", "Completed") for different time periods (daily, weekly, monthly).
 * Supports drag-and-drop functionality for reordering chores and moving them between columns.
 */
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
 * Renders a customizable Kanban board for a specific kid, displaying their chores.
 * Features period selection (daily, weekly, monthly), filtering, sorting,
 * theming, and drag-and-drop functionality for chore management.
 * @param {KidKanbanBoardProps} props - The component props.
 * @returns {JSX.Element} The KidKanbanBoard UI.
 */
const KidKanbanBoard: React.FC<KidKanbanBoardProps> = ({ kidId }) => {
  const {
    choreDefinitions,
    choreInstances,
    generateInstancesForPeriod,
    toggleChoreInstanceComplete,
    updateKanbanChoreOrder,
    kanbanChoreOrders // Destructure kanbanChoreOrders
  } = useChoresContext();

  /** State for the selected time period (daily, weekly, monthly) for displaying chores. */
  const [selectedPeriod, setSelectedPeriod] = useState<KanbanPeriod>('daily');
  /** State representing the columns and the chores within them for the Kanban board. */
  const [columns, setColumns] = useState<KanbanColumnType[]>([]);
  /** State holding the active chore instance and definition being dragged, for DragOverlay. */
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(null);

  // State for filters and sorting
  /** State for filtering chores by reward status. */
  const [rewardFilter, setRewardFilter] = useState<RewardFilterOption>('any');
  /** State for the criteria used to sort chores (e.g., due date, title, reward amount). */
  const [sortBy, setSortBy] = useState<SortByOption>('instanceDate');
  /** State for the direction of sorting (ascending or descending). */
  const [sortDirection, setSortDirection] = useState<SortDirectionOption>('asc');
  /** State for the selected visual theme for Kanban columns. Persisted in localStorage. */
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
  }, [currentPeriodDateRange, generateInstancesForPeriod, choreDefinitions]); // choreDefinitions added as instances might need re-gen if defs change (e.g. new chore added for today)

  /**
   * Main effect hook for processing chore instances and building the columns for the Kanban board.
   * This effect runs when the selected kid, period, chore instances/definitions,
   * or filter/sort options change.
   *
   * Logic:
   * 1. Filters `choreInstances` to get those relevant to the current `kidId` and `selectedPeriod`.
   * 2. Applies filtering based on `rewardFilter`.
   * 3. Separates chores into `activeChores` and `completedChores`.
   * 4. Applies sorting:
   *    - If `sortBy` is 'instanceDate' (labeled "My Order / Due Date"), it first attempts to apply a custom order
   *      retrieved from `kanbanChoreOrders` (via `ChoresContext`). Chores not in the custom order are appended.
   *    - Otherwise, it applies the selected explicit sort (e.g., by title, reward amount).
   * 5. Sets the `columns` state with the processed chores, updating column titles based on the `selectedPeriod`.
   */
  useEffect(() => {
    // Filter instances for the current kid and period
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

    /**
     * Sorts an array of chore instances based on the selected criteria and direction.
     * If the criteria is 'instanceDate' (meaning "My Order / Due Date"), it first attempts
     * to apply a custom order from `kanbanChoreOrders`. If no custom order exists, or
     * for other criteria, it applies standard sorting.
     * @param {ChoreInstance[]} chores - The array of chores to sort.
     * @param {string} columnIdSuffix - Suffix for the column ID (e.g., 'active', 'completed') to construct the order key.
     * @param {ChoreDefinition[]} definitions - All chore definitions, for accessing details like title or reward.
     * @param {SortByOption} criteria - The sorting criterion.
     * @param {SortDirectionOption} direction - The sorting direction.
     * @returns {ChoreInstance[]} The sorted array of chore instances.
     */
    const applyCustomOrderOrDefaultSort = (
      chores: ChoreInstance[],
      columnIdSuffix: string,
      definitions: ChoreDefinition[],
      criteria: SortByOption,
      direction: SortDirectionOption
    ): ChoreInstance[] => {
      const columnFullId = `${selectedPeriod}_${columnIdSuffix}`;
      const orderKey = `${kidId}-${columnFullId}`;
      const customOrderIds = kanbanChoreOrders[orderKey];

      // Apply custom order if 'instanceDate' (My Order) is selected and a custom order exists
      if (criteria === 'instanceDate' && customOrderIds && customOrderIds.length > 0) {
        const choreMap = new Map(chores.map(chore => [chore.id, chore]));
        const orderedChores: ChoreInstance[] = [];

        customOrderIds.forEach(id => {
          const chore = choreMap.get(id);
          if (chore) {
            orderedChores.push(chore);
            choreMap.delete(id); // Remove processed chores
          }
        });

        // Append any remaining chores (not in customOrderIds, e.g., newly added)
        // These are secondarily sorted by instanceDate by default.
        const remainingChores = Array.from(choreMap.values()).sort((a, b) =>
          new Date(a.instanceDate).getTime() - new Date(b.instanceDate).getTime()
        );
        return [...orderedChores, ...remainingChores];
      } else {
        // Standard sorting logic for explicit sorts or if no custom order for 'instanceDate'
        return [...chores].sort((a, b) => {
          const defA = definitions.find(d => d.id === a.choreDefinitionId);
          const defB = definitions.find(d => d.id === b.choreDefinitionId);

          if (!defA || !defB) return 0;

          if (criteria === 'instanceDate') { // Default sort for 'instanceDate' if no custom order
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
      }
    };

    activeChores = applyCustomOrderOrDefaultSort(activeChores, 'active', choreDefinitions, sortBy, sortDirection);
    completedChores = applyCustomOrderOrDefaultSort(completedChores, 'completed', choreDefinitions, sortBy, sortDirection);

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

  }, [kidId, selectedPeriod, choreInstances, choreDefinitions, currentPeriodDateRange, rewardFilter, sortBy, sortDirection, kanbanChoreOrders]); // Added kanbanChoreOrders dependency


  /**
   * Retrieves the full ChoreDefinition object for a given ChoreInstance.
   * @param {ChoreInstance} instance - The chore instance for which to find the definition.
   * @returns {ChoreDefinition | undefined} The found chore definition, or undefined if not found.
   */
  const getDefinitionForInstance = (instance: ChoreInstance): ChoreDefinition | undefined => {
    return choreDefinitions.find(def => def.id === instance.choreDefinitionId);
  };

  /** Configured sensors for dnd-kit, enabling pointer and keyboard interactions. */
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * Handles the end of a drag operation for a Kanban card.
   * This function is responsible for:
   * - Determining the source and destination of the dragged item.
   * - Reordering the item within the same column if applicable.
   * - Moving the item to a different column if applicable.
   * - Updating the chore's `isComplete` status if it's moved between 'active' and 'completed' columns,
   *   by calling `toggleChoreInstanceComplete` from `ChoresContext`.
   * - Clearing the `activeDragItem` state to hide the `DragOverlay`.
   * - Persisting custom order using `updateKanbanChoreOrder` if reordering occurs within the same column.
   * @param {DragEndEvent} event - The drag end event object from dnd-kit.
   */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveDragItem(null); // Clear overlay regardless of outcome once dragging stops

    if (!over) {
      console.log("Drag ended outside a droppable area");
      return;
    }

    const activeId = active.id.toString();
    const overId = over.id.toString();

    const activeContainerId = active.data.current?.sortable?.containerId;
    let overContainerId = over.data.current?.sortable?.containerId;
    // If `overContainerId` is not found via `over.data` (e.g. dropping on an empty column where `over.id` is the column id)
    if (!overContainerId) {
        const isOverColumn = columns.some(col => col.id === over.id.toString());
        if (isOverColumn) {
            overContainerId = over.id.toString();
        } else {
            // If still not found, try to find which column the `over.id` (item) belongs to
            const columnContainingOverItem = columns.find(col => col.chores.some(chore => chore.id === overId));
            if (columnContainingOverItem) {
                overContainerId = columnContainingOverItem.id;
            }
        }
    }

    if (!activeContainerId || !overContainerId) {
      console.warn("Could not determine active or over container for DND operation. Active Container:", activeContainerId, "Over Container:", overContainerId);
      return;
    }

    // If the item is dropped in the same place it started, do nothing.
    if (activeId === overId && activeContainerId === overContainerId) {
      // Check if the actual index would change. If not, it's a no-op.
      const itemsInColumn = columns.find(col => col.id === activeContainerId)?.chores || [];
      const oldIdx = itemsInColumn.findIndex(item => item.id === activeId);
      const newIdx = itemsInColumn.findIndex(item => item.id === overId);
      if (oldIdx === newIdx) {
        console.log("Item dropped in the exact same position.");
        return;
      }
    }

    setColumns(prev => {
      const activeColumnIndex = prev.findIndex(col => col.id === activeContainerId);
      const overColumnIndex = prev.findIndex(col => col.id === overContainerId);

      if (activeColumnIndex === -1 || overColumnIndex === -1) {
        console.error("Critical: Active or over column not found in state during setColumns update.");
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
          const updatedChores = arrayMove(currentColumn.chores, oldIndex, newIndex);
          const newColumns = [...prev];
          newColumns[activeColumnIndex] = {
            ...currentColumn,
            chores: updatedChores,
          };
          // After local state is updated, save the new order to context/localStorage
          if (activeContainerId) { // Ensure activeContainerId is valid
            const orderedIds = updatedChores.map(chore => chore.id);
            updateKanbanChoreOrder(kidId, activeContainerId, orderedIds);
          }
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
        // The local state update here provides immediate feedback, while context update ensures persistence.
        return newColumnsState;
      }
      // Fallback if none of the conditions were met (e.g. item dragged to same position in same column, handled by earlier check)
      return prev;
    });
  }

  /**
   * Handles the start of a drag operation for a Kanban card.
   * Finds the chore instance and its definition corresponding to the dragged item
   * and sets them in the `activeDragItem` state to be rendered by `DragOverlay`.
   * @param {DragStartEvent} event - The drag start event object from dnd-kit.
   */
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const instance = choreInstances.find(inst => inst.id === active.id.toString());
    if (instance) {
      const definition = getDefinitionForInstance(instance); // Use existing helper
      if (definition) {
        setActiveDragItem({ instance, definition });
      } else {
        console.warn(`Definition not found for instance ${active.id.toString()} during drag start.`);
        setActiveDragItem(null); // Ensure overlay doesn't show stale data
      }
    } else {
      console.warn(`Instance ${active.id.toString()} not found during drag start.`);
      setActiveDragItem(null);
    }
  }

  /**
   * Handles the cancellation of a drag operation.
   * Clears the `activeDragItem` state to hide the `DragOverlay`.
   * Note: `DragCancelEvent` is available from dnd-kit if specific cancel event data is needed.
   */
  function handleDragCancel() {
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

                if (newSortBy === 'rewardAmount') {
                  setSortDirection('desc'); // Default to descending for reward amount
                } else {
                  setSortDirection('asc'); // Default to ascending for other types
                }

                // If an explicit sort ('title' or 'rewardAmount') is chosen,
                // clear any existing custom drag-and-drop orders for the currently visible columns.
                // This ensures the explicit sort takes precedence and the view is not confusing.
                // If the user later switches back to "My Order / Due Date", they can establish a new custom order.
                if (newSortBy !== 'instanceDate') {
                  columns.forEach(col => {
                    updateKanbanChoreOrder(kidId, col.id, []);
                  });
                }
              }}
              style={{ padding: '5px' }}
            >
              <option value="instanceDate">My Order / Due Date</option>
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
