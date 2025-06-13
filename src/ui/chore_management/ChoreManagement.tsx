/**
 * @file KidKanbanBoard.tsx
 * Displays a Kanban board for a specific kid, showing their chores.
 * Uses user-defined columns from UserContext and supports drag-and-drop
 * for chore reordering (persisted via ChoresContext) and moving chores
 * between these dynamic columns (updating choreInstance.kanbanColumnId via ChoresContext).
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
import { useUserContext } from '../../contexts/UserContext';
import type { ChoreDefinition, ChoreInstance, KanbanPeriod, KanbanColumn as KanbanColumnType, ColumnThemeOption, MatrixKanbanCategory } from '../../types';
import KanbanCard from './KanbanCard';
import DateColumnView from './DateColumnView';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { getTodayDateString, getWeekRange, getMonthRange } from '../../utils/dateUtils';
import AddChoreForm from '../../components/AddChoreForm';

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
    updateChoreInstanceCategory,
  } = useChoresContext();
  const { getKanbanColumnConfigs } = useUserContext();

  /** State for the selected time period (daily, weekly, monthly) for displaying chores. */
  const [selectedPeriod, setSelectedPeriod] = useState<KanbanPeriod>('daily');
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

  // State for Matrix Kanban date navigation
  const [currentVisibleStartDate, setCurrentVisibleStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zero out time for consistent day calculations
    return today;
  });

  // Modal state for ad-hoc chore creation
  const [showAddChoreModal, setShowAddChoreModal] = useState(false);
  const [addChoreDefaultDate, setAddChoreDefaultDate] = useState<Date | null>(null);

  // Add state for editing
  const [editingChore, setEditingChore] = useState<ChoreDefinition | null>(null);

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

  // Memoized calculation of the date range for the selected period.
  const currentPeriodDateRange = useMemo(() => {
    const today = new Date(currentVisibleStartDate); // Use navigation date, not always today
    if (selectedPeriod === 'daily') {
      const todayStr = today.toISOString().split('T')[0];
      return { start: todayStr, end: todayStr };
    } else if (selectedPeriod === 'weekly') {
      const range = getWeekRange(today);
      return { start: range.start.toISOString().split('T')[0], end: range.end.toISOString().split('T')[0] };
    } else { // monthly
      const range = getMonthRange(today);
      return { start: range.start.toISOString().split('T')[0], end: range.end.toISOString().split('T')[0] };
    }
  }, [selectedPeriod, currentVisibleStartDate]);

  const currentPeriodDisplayString = useMemo(() => {
    // Appending 'T00:00:00' to "YYYY-MM-DD" strings (from currentPeriodDateRange) ensures
    // that the string is parsed as a local time at the very beginning of that day,
    // rather than potentially being interpreted as UTC. This helps prevent date shifts
    // when the date is then formatted for display using the user's local timezone.
    // toLocaleDateString() is then used for basic localized date formatting.
    if (!currentPeriodDateRange.start) return "";

    // Helper to parse "YYYY-MM-DD" and treat as local date to avoid timezone shifts converting to other parts of the day.
    const parseAsLocalDate = (dateString: string) => new Date(dateString + 'T00:00:00');

    const startDate = parseAsLocalDate(currentPeriodDateRange.start);

    if (selectedPeriod === 'daily') {
      return startDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (selectedPeriod === 'weekly') {
      const endDate = parseAsLocalDate(currentPeriodDateRange.end);
      // Format start and end dates. Example: "Week: Sep 10, 2023 - Sep 16, 2023"
      // Adjust options as needed for desired verbosity.
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
      const formattedStartDate = startDate.toLocaleDateString(undefined, options);
      const formattedEndDate = endDate.toLocaleDateString(undefined, options);
      return `Week: ${formattedStartDate} - ${formattedEndDate}`;
    } else { // monthly
      // For month, display month and year. Example: "Month: September 2023"
      return `Month: ${startDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
    }
  }, [selectedPeriod, currentPeriodDateRange]);

  /**
   * Effect to trigger chore instance generation in `ChoresContext`.
   * This is called when the period, kid, or chore definitions change.
   * It fetches the kid's column configurations to pass the ID of the first column
   * as the default column for newly generated instances.
   * 
   * [KB-001.4] - Generate instances for all visible dates in the current period.
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
        // setColumns([]); // Old state
        return;
    }
    // This effect was for the old column-based Kanban.
    // It might be removed or adapted later if a different data structure is needed for the matrix view
    // that isn't directly rendered from choreInstances. For now, commenting out its core logic.
    // const userColumnConfigs = getKanbanColumnConfigs(kidId).sort((a, b) => a.order - b.order);

    /*
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
    */

  }, [
    kidId, selectedPeriod, choreInstances, choreDefinitions, currentPeriodDateRange,
    rewardFilter, sortBy, sortDirection,
    getKanbanColumnConfigs
  ]);

  const getDefinitionForInstance = useCallback((instance: ChoreInstance): ChoreDefinition | undefined => {
    return choreDefinitions.find(def => def.id === instance.choreDefinitionId);
  }, [choreDefinitions]); // Correctly closed useCallback for getDefinitionForInstance

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const instance = choreInstances.find(inst => inst.id === active.id.toString());
    if (instance) {
      const definition = getDefinitionForInstance(instance);
      if (definition) {
        setActiveDragItem({ instance, definition });
      } else {
        setActiveDragItem(null); // Should not happen if data is consistent
      }
    } else {
      setActiveDragItem(null);
    }
  }, [choreInstances, getDefinitionForInstance]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null); // Clear overlay item regardless of drop outcome

    if (!over || !active) {
      return;
    }

    const activeInstanceId = active.id.toString();
    const overSwimlaneId = over.id.toString(); // This ID is `${dateString}-${category}`

    const activeInstance = choreInstances.find(inst => inst.id === activeInstanceId);
    if (!activeInstance) return;

    // Parse the target date and category from the swimlane ID
    const parts = overSwimlaneId.split('-');
    if (parts.length < 4) { // Expecting "YYYY-MM-DD-CATEGORY" (e.g. 3 parts for date, 1 for category)
        console.warn("Invalid swimlane ID format:", overSwimlaneId);
        return;
    }
    const targetDateString = parts.slice(0, 3).join('-'); // e.g., "2023-10-01"
    const newCategory = parts.slice(3).join('-') as MatrixKanbanCategory; // e.g., "TO_DO"

    // Constraint: Only allow category changes within the same date column for this implementation
    if (activeInstance.instanceDate !== targetDateString) {
      setActionFeedbackMessage("Chores can only be moved between categories for the same day in this view.");
      // Optional: Could provide visual indication of invalid drop target earlier (e.g. in useDroppable's data)
      return;
    }

    // If dropped on a different swimlane (category change) but same date
    if (activeInstance.categoryStatus !== newCategory) {
      updateChoreInstanceCategory(activeInstanceId, newCategory);

      const definition = getDefinitionForInstance(activeInstance);
      const choreTitle = definition?.title || "Chore";
      const categoryTitles: Record<MatrixKanbanCategory, string> = {
        TO_DO: "To Do",
        IN_PROGRESS: "In Progress",
        COMPLETED: "Completed"
      };
      setActionFeedbackMessage(`${choreTitle} moved to ${categoryTitles[newCategory]}.`);
    }
    // Note: Reordering within the same swimlane (active.id !== over.id but same container)
    // is not explicitly handled here yet. That would require updateKanbanChoreOrder or similar
    // if `SortableContext` is used per swimlane and items are reordered.
    // For now, the main goal is category change.

  }, [choreInstances, updateChoreInstanceCategory, getDefinitionForInstance, setActionFeedbackMessage]);

  const handleDragCancel = useCallback(() => {
    setActiveDragItem(null);
  }, []);

  // const userColumnConfigs = getKanbanColumnConfigs(kidId); // Not directly used for matrix rendering

  // Date Navigation Functions
  const adjustDate = useCallback((currentDate: Date, adjustment: (date: Date) => void) => {
    const newDate = new Date(currentDate);
    adjustment(newDate);
    newDate.setHours(0,0,0,0); // Ensure time is zeroed out
    setCurrentVisibleStartDate(newDate);
  }, []);

  const goToPreviousDay = () => adjustDate(currentVisibleStartDate, date => date.setDate(date.getDate() - 1));
  const goToNextDay = () => adjustDate(currentVisibleStartDate, date => date.setDate(date.getDate() + 1));
  const goToPreviousWeek = () => adjustDate(currentVisibleStartDate, date => date.setDate(date.getDate() - 7));
  const goToNextWeek = () => adjustDate(currentVisibleStartDate, date => date.setDate(date.getDate() + 7));
  const goToPreviousMonth = () => adjustDate(currentVisibleStartDate, date => date.setMonth(date.getMonth() - 1));
  const goToNextMonth = () => adjustDate(currentVisibleStartDate, date => date.setMonth(date.getMonth() + 1));
  const goToToday = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    setCurrentVisibleStartDate(today);
  };

  const visibleDates = useMemo(() => {
    const dates: Date[] = [];
    const startDate = new Date(currentVisibleStartDate);
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      dates.push(day);
    }
    return dates;
  }, [currentVisibleStartDate]);

  // Format function for date headers (e.g., "Mon, Jun 12")
  const formatDateHeader = (date: Date): string => {
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Handler to open the modal, optionally with a default date
  const handleOpenAddChore = (date?: Date) => {
    setAddChoreDefaultDate(date || currentVisibleStartDate);
    setShowAddChoreModal(true);
  };
  const handleCloseAddChore = () => setShowAddChoreModal(false);

  // Handler for successful ad-hoc chore creation
  const handleChoreCreated = () => {
    setShowAddChoreModal(false);
    setActionFeedbackMessage('Chore created!');
    // No need to manually refresh; effect above will pick up new instance
  };

  // Handler to open edit modal
  const handleEditChore = (chore: ChoreDefinition) => setEditingChore(chore);
  const handleCloseEditChore = () => setEditingChore(null);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="kid-kanban-board">
        {/* Add Chore Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button onClick={() => handleOpenAddChore()} style={{ fontWeight: 'bold', padding: '6px 16px' }}>+ Assign New Chore</button>
        </div>
        {/* Action feedback message display area */}
        {actionFeedbackMessage && (
          <div className="kanban-action-feedback" role="status" aria-live="polite">
            {actionFeedbackMessage}
          </div>
        )}

        {/* Date Navigation Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <button onClick={goToPreviousMonth}>&lt;&lt; Month</button>
          <button onClick={goToPreviousWeek}>&lt; Week</button>
          <button onClick={goToPreviousDay}>&lt; Day</button>
          <button onClick={goToToday} style={{ fontWeight: 'bold' }}>Today</button>
          <button onClick={goToNextDay}>Day &gt;</button>
          <button onClick={goToNextWeek}>Week &gt;</button>
          <button onClick={goToNextMonth}>Month &gt;&gt;</button>
        </div>

        {/* Period Selectors (Daily, Weekly, Monthly) - Kept from original */}
        <div className="period-selector" style={{ marginBottom: '15px', textAlign: 'center' }}>
          <label style={{ marginRight: 10 }}>
            <input
              type="radio"
              name="kanban-period"
              value="daily"
              checked={selectedPeriod === 'daily'}
              onChange={() => setSelectedPeriod('daily')}
            /> Daily
          </label>
          <label style={{ marginRight: 10 }}>
            <input
              type="radio"
              name="kanban-period"
              value="weekly"
              checked={selectedPeriod === 'weekly'}
              onChange={() => setSelectedPeriod('weekly')}
            /> Weekly
          </label>
          <label>
            <input
              type="radio"
              name="kanban-period"
              value="monthly"
              checked={selectedPeriod === 'monthly'}
              onChange={() => setSelectedPeriod('monthly')}
            /> Monthly
          </label>
        </div>

        {/* Current Period Display (e.g., "Week: Sep 10, 2023 - Sep 16, 2023") - Kept from original */}
        <div className="current-period-display" style={{ marginBottom: '20px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em' }}>
          {currentPeriodDisplayString}
        </div>

        {/* Old Kanban Controls - Commenting out for now, may be repurposed or removed later */}
        {/* <div className="kanban-controls" style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap' }}>
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
        </div> */}

        {/* Matrix Kanban Grid */}
        <div className="matrix-kanban-header" style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '5px', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
          {visibleDates.map(date => (
            <div key={date.toISOString()} className="date-header" style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>
              {formatDateHeader(date)}
              <button onClick={() => handleOpenAddChore(date)} style={{ marginLeft: 8, fontSize: '0.9em' }}>+ Add</button>
            </div>
          ))}
        </div>
        <div className="matrix-kanban-body" style={{ display: 'flex', justifyContent: 'space-around', gap: '5px' }}>
          {visibleDates.map(date => (
            <DateColumnView key={date.toISOString()} date={date} />
          ))}
        </div>
        {/* Add Chore Modal */}
        {showAddChoreModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal-content" style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0 }}>Assign New Chore</h3>
              <AddChoreForm
                defaultKidId={kidId}
                defaultDueDate={addChoreDefaultDate || undefined}
                onSuccess={handleChoreCreated}
                onCancel={handleCloseAddChore}
                enableSubtasks={true}
                enableRecurrence={true}
                defaultIsRecurring={false}
              />
            </div>
          </div>
        )}
        {/* Edit Chore Modal - New addition for editing chores */}
        {editingChore && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal-content" style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0 }}>Edit Chore</h3>
              <AddChoreForm
                initialChore={editingChore}
                onSuccess={handleCloseEditChore}
                onCancel={handleCloseEditChore}
                enableSubtasks={true}
                enableRecurrence={true}
              />
            </div>
          </div>
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDragItem ? (
          <KanbanCard
            instance={activeDragItem.instance}
            definition={activeDragItem.definition}
            isOverlay={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KidKanbanBoard;