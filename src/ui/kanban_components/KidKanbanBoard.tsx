/**
 * @file KidKanbanBoard.tsx
 * Displays a Kanban board for a specific kid, showing their chores.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { useChoresContext } from '../../contexts/ChoresContext';
import { useUserContext } from '../../contexts/UserContext';
import type { ChoreDefinition, ChoreInstance, KanbanPeriod, Kid, ColumnThemeOption, MatrixKanbanCategory, KanbanColumnConfig } from '../../types';
import KanbanCard from './KanbanCard';
import DateColumnView from './DateColumnView';
import { useChoreSelection } from '../../hooks/useChoreSelection';
import { useModalState } from '../../hooks/useModalState';
import BatchActionsToolbar from './BatchActionsToolbar';
import CategoryChangeModal from './CategoryChangeModal';
import KidAssignmentModal from './KidAssignmentModal';
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
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { getTodayDateString, getWeekRange, getMonthRange } from '../../utils/dateUtils'; // getTodayDateString is already imported
import AddChoreForm from '../../components/AddChoreForm';

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
    updateChoreInstanceCategory,
    updateChoreInstanceField, // Added updateChoreInstanceField
    batchToggleCompleteChoreInstances,
    // batchUpdateChoreInstancesCategory, // This will be updated later if still needed with new types
    batchAssignChoreDefinitionsToKid,
  } = useChoresContext();
  const { getKanbanColumnConfigs, user } = useUserContext(); // Ensure user is destructured
  // const allKids = user?.kids || []; // allKids not needed for switcher

  // Custom Hooks for selection and modal states
  const {
    selectedInstanceIds,
    toggleSelection: handleToggleSelection,
    clearSelection: handleClearSelection,
    setSelectedInstanceIds,
  } = useChoreSelection();

  const categoryModal = useModalState();
  const kidAssignmentModal = useModalState();

  const [selectedPeriod, setSelectedPeriod] = useState<KanbanPeriod>('daily');
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(null);
  const [actionFeedbackMessage, setActionFeedbackMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortByOption>('instanceDate'); // Assuming SortByOption is defined elsewhere
  const [sortDirection, setSortDirection] = useState<SortDirectionOption>('asc'); // Assuming SortDirectionOption is defined elsewhere
  const [selectedColumnTheme, setSelectedColumnTheme] = useState<ColumnThemeOption>(() => {
    const storedTheme = localStorage.getItem('kanban_columnTheme') as ColumnThemeOption | null;
    return storedTheme || 'default';
  });
  const [currentVisibleStartDate, setCurrentVisibleStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [showAddChoreModal, setShowAddChoreModal] = useState(false);
  const [addChoreDefaultDate, setAddChoreDefaultDate] = useState<Date | null>(null);
  const [editingChore, setEditingChore] = useState<ChoreDefinition | null>(null);

  const todayString = getTodayDateString(); // Get today's date string

  useEffect(() => {
    localStorage.setItem('kanban_columnTheme', selectedColumnTheme);
  }, [selectedColumnTheme]);

  useEffect(() => {
    if (actionFeedbackMessage) {
      const timer = setTimeout(() => setActionFeedbackMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedbackMessage]);

  // Effect to clear selections when the kidId prop changes
  useEffect(() => {
    setSelectedInstanceIds([]);
  }, [kidId, setSelectedInstanceIds]);

  const currentPeriodDateRange = useMemo(() => {
    const today = new Date(currentVisibleStartDate);
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

  useEffect(() => {
    if (!kidId) return;
    const statusColumns = getKanbanColumnConfigs(kidId);
    if (currentPeriodDateRange.start && currentPeriodDateRange.end) {
      generateInstancesForPeriod(
        currentPeriodDateRange.start,
        currentPeriodDateRange.end,
        statusColumns[0]?.id // Pass the ID of the first configured column as default
      );
    }
  }, [kidId, currentPeriodDateRange, generateInstancesForPeriod, getKanbanColumnConfigs]);


  const getDefinitionForInstance = useCallback((instance: ChoreInstance): ChoreDefinition | undefined => {
    return choreDefinitions.find(def => def.id === instance.choreDefinitionId);
  }, [choreDefinitions]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const instance = choreInstances.find(inst => inst.id === event.active.id.toString());
    if (instance) {
      const definition = getDefinitionForInstance(instance);
      if (definition) setActiveDragItem({ instance, definition });
      else setActiveDragItem(null);
    } else {
      setActiveDragItem(null);
    }
  }, [choreInstances, getDefinitionForInstance]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over || !active) return;

    const activeInstance = choreInstances.find(inst => inst.id === active.id.toString());
    if (!activeInstance) return;

    const parsedOverId = parseSwimlaneId(over.id.toString());
    if (!parsedOverId) {
      console.warn("Invalid swimlane ID format:", over.id.toString());
      return;
    }
    const { dateString: targetDateString, statusId: newStatusId } = parsedOverId;
    const statusColumns = getKanbanColumnConfigs(kidId);

    const dateChanged = activeInstance.instanceDate !== targetDateString;
    const categoryChanged = activeInstance.categoryStatus !== newStatusId;

    if (!dateChanged && !categoryChanged) {
      return;
    }

    if (dateChanged) {
      updateChoreInstanceField(activeInstance.id.toString(), 'instanceDate', targetDateString);
    }

    if (categoryChanged) {
      updateChoreInstanceCategory(activeInstance.id.toString(), newStatusId);
    }

    const definition = getDefinitionForInstance(activeInstance);
    let feedback = `${definition?.title || "Chore"} moved`;
    if (categoryChanged) {
      const newStatusColumn = statusColumns.find(sc => sc.id === newStatusId);
      feedback += ` to ${newStatusColumn?.title || newStatusId}`;
    }
    if (dateChanged) {
      const displayDate = new Date(targetDateString + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      feedback += ` to date ${displayDate}`;
    }
    feedback += ".";
    setActionFeedbackMessage(feedback);

  }, [choreInstances, getDefinitionForInstance, updateChoreInstanceCategory, updateChoreInstanceField, setActionFeedbackMessage, getKanbanColumnConfigs, kidId]);

  const handleDragCancel = useCallback(() => setActiveDragItem(null), []);

  const adjustDate = useCallback((currentDate: Date, adjustment: (date: Date) => void) => {
    const newDate = new Date(currentDate);
    adjustment(newDate);
    newDate.setHours(0,0,0,0);
    setCurrentVisibleStartDate(newDate);
  }, []);

  const dateNavigationHandlers = useMemo(() => ({
    goToPreviousDay: () => adjustDate(currentVisibleStartDate, date => date.setDate(date.getDate() - 1)),
    goToNextDay: () => adjustDate(currentVisibleStartDate, date => date.setDate(date.getDate() + 1)),
    goToPreviousWeek: () => adjustDate(currentVisibleStartDate, date => date.setDate(date.getDate() - 7)),
    goToNextWeek: () => adjustDate(currentVisibleStartDate, date => date.setDate(date.getDate() + 7)),
    goToPreviousMonth: () => adjustDate(currentVisibleStartDate, date => date.setMonth(date.getMonth() - 1)),
    goToNextMonth: () => adjustDate(currentVisibleStartDate, date => date.setMonth(date.getMonth() + 1)),
    goToToday: () => { const today = new Date(); today.setHours(0,0,0,0); setCurrentVisibleStartDate(today); },
  }), [currentVisibleStartDate, adjustDate]);

  const visibleDates = useMemo(() => {
    const dates: Date[] = [];
    const startDate = new Date(currentVisibleStartDate);
    for (let i = 0; i < 7; i++) { const day = new Date(startDate); day.setDate(startDate.getDate() + i); dates.push(day); }
    return dates;
  }, [currentVisibleStartDate]);

  const formatDateHeader = (date: Date): string => date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const handleOpenAddChore = (date?: Date) => { setAddChoreDefaultDate(date || currentVisibleStartDate); setShowAddChoreModal(true); };
  const handleCloseAddChore = () => setShowAddChoreModal(false);
  const handleChoreCreated = () => { setShowAddChoreModal(false); setActionFeedbackMessage('Chore created!'); };
  const handleEditChore = (chore: ChoreDefinition) => setEditingChore(chore);
  const handleCloseEditChore = () => setEditingChore(null);

  function parseSwimlaneId(swimlaneId: string): { dateString: string, statusId: string } | null {
    if (swimlaneId.includes('|')) {
      const parts = swimlaneId.split('|');
      // Ensure parts[1] is not empty or undefined before returning
      return parts.length === 2 && parts[1] ? { dateString: parts[0], statusId: parts[1] } : null;
    }
    // Fallback for old format (e.g., 2023-10-26-TO_DO) - this might be removed if no longer needed
    // For now, we'll assume the new format `date|statusId` is primary.
    // If you still need to support the old format, adapt the logic below.
    // For simplicity, this example now primarily relies on the `date|statusId` format.
    console.warn("Old swimlane ID format detected or invalid format:", swimlaneId);
    return null;
  }

  useEffect(() => {
    if (!kidId) return;
    const statusColumns = getKanbanColumnConfigs(kidId);
    if (statusColumns.length === 0) return; // No columns to assign to

    choreInstances.forEach(instance => {
      const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
      if (definition && definition.assignedKidId === kidId &&
          instance.instanceDate >= currentPeriodDateRange.start &&
          instance.instanceDate <= currentPeriodDateRange.end &&
          (!instance.categoryStatus || !statusColumns.find(sc => sc.id === instance.categoryStatus)) // If no status or status not in current config
         ) {
        // Default to the first available configured column ID
        updateChoreInstanceCategory(instance.id, statusColumns[0].id);
      }
    });
  }, [kidId, choreInstances, choreDefinitions, currentPeriodDateRange, updateChoreInstanceCategory, getKanbanColumnConfigs]);

  // const kidsForSwitcher = user?.kids || []; // Removed: Kid selection is now in KanbanView

  // Batch Action Handlers wrapped in useCallback
  const handleBatchMarkCompleteCb = useCallback(async () => {
    if (selectedInstanceIds.length === 0) return;
    await batchToggleCompleteChoreInstances(selectedInstanceIds, true);
    alert(`${selectedInstanceIds.length} chore(s) marked as complete.`);
    handleClearSelection();
  }, [selectedInstanceIds, batchToggleCompleteChoreInstances, handleClearSelection]);

  const handleBatchMarkIncompleteCb = useCallback(async () => {
    if (selectedInstanceIds.length === 0) return;
    await batchToggleCompleteChoreInstances(selectedInstanceIds, false);
    alert(`${selectedInstanceIds.length} chore(s) marked as incomplete.`);
    handleClearSelection();
  }, [selectedInstanceIds, batchToggleCompleteChoreInstances, handleClearSelection]);

  // Simplified handler for CategoryChangeModal's onActionSuccess
  const handleCategoryActionSuccess = useCallback(() => {
    // The modal now handles the alert/feedback internally based on its own success/failure.
    // KidKanbanBoard just needs to close the modal and clear selection.
    // alert("Category change action attempted."); // Feedback now in modal
    categoryModal.closeModal();
    handleClearSelection();
  }, [categoryModal, handleClearSelection]);

  // Simplified handler for KidAssignmentModal's onActionSuccess
  const handleKidAssignmentActionSuccess = useCallback(() => {
    // Similar to category change, modal handles specific feedback.
    alert("Kid assignment action attempted."); // Generic feedback, or remove
    kidAssignmentModal.closeModal();
    handleClearSelection();
  }, [kidAssignmentModal, handleClearSelection]);

  // Derive selectedDefinitionIds for KidAssignmentModal - this needs to be available when opening modal
  const selectedDefinitionIdsForModal = useMemo(() => {
    if (selectedInstanceIds.length === 0) return [];
    return Array.from(new Set(
      selectedInstanceIds
        .map(id => choreInstances.find(inst => inst.id === id)?.choreDefinitionId)
        .filter((id): id is string => !!id)
    ));
  }, [selectedInstanceIds, choreInstances]);

  const currentPeriodDisplayString = useMemo(() => {
    if (!currentPeriodDateRange.start) return "";
    const parseAsLocalDate = (dateString: string) => new Date(dateString + 'T00:00:00');
    const startDate = parseAsLocalDate(currentPeriodDateRange.start);
    if (selectedPeriod === 'daily') return startDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (selectedPeriod === 'weekly') {
      const endDate = parseAsLocalDate(currentPeriodDateRange.end);
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
      return `Week: ${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, options)}`;
    }
    return `Month: ${startDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
  }, [selectedPeriod, currentPeriodDateRange]);

  const statusColumns = getKanbanColumnConfigs(kidId);

  if (statusColumns.length === 0 && kidId) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>No status columns configured for this kid.</p>
        <p>Please go to Settings &gt; Kanban Columns to set them up, or an admin can assist.</p>
        {user && user.role === 'admin' && (
          <div style={{ marginTop: '10px' }}>
            <Link to="/settings">
              <button className="button-primary">Configure Columns in Settings</button>
            </Link>
          </div>
        )}
      </div>
    );
  }
  // Fallback if kidId is not yet available (e.g. parent component is loading)
  if (!kidId) {
    return <div>Loading kid information...</div>;
  }


  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="kid-kanban-board">
        <BatchActionsToolbar
          selectedCount={selectedInstanceIds.length}
          onClearSelection={handleClearSelection}
          onOpenCategoryModal={categoryModal.openModal}
          onOpenKidAssignmentModal={kidAssignmentModal.openModal}
          onMarkComplete={handleBatchMarkCompleteCb}
          onMarkIncomplete={handleBatchMarkIncompleteCb}
        />
        <CategoryChangeModal
          isVisible={categoryModal.isModalVisible}
          onClose={categoryModal.closeModal}
          selectedInstanceIds={selectedInstanceIds}
          onActionSuccess={handleCategoryActionSuccess}
        />
        <KidAssignmentModal
          isVisible={kidAssignmentModal.isModalVisible}
          onClose={kidAssignmentModal.closeModal}
          selectedDefinitionIds={selectedDefinitionIdsForModal} // Pass derived definition IDs
          onActionSuccess={handleKidAssignmentActionSuccess}
          // kids prop removed
        />

        {/* Kid selection buttons DIV removed */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button onClick={() => handleOpenAddChore()} style={{ fontWeight: 'bold', padding: '6px 16px' }}>+ Assign New Chore</button>
        </div>
        {actionFeedbackMessage && <div className="kanban-action-feedback" role="status" aria-live="polite">{actionFeedbackMessage}</div>}

        {/* Date Navigation Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <button onClick={dateNavigationHandlers.goToPreviousMonth}>&lt;&lt; Month</button>
          <button onClick={dateNavigationHandlers.goToPreviousWeek}>&lt; Week</button>
          <button onClick={dateNavigationHandlers.goToPreviousDay}>&lt; Day</button>
          <button onClick={dateNavigationHandlers.goToToday} style={{ fontWeight: 'bold' }}>Today</button>
          <button onClick={dateNavigationHandlers.goToNextDay}>Day &gt;</button>
          <button onClick={dateNavigationHandlers.goToNextWeek}>Week &gt;</button>
          <button onClick={dateNavigationHandlers.goToNextMonth}>Month &gt;&gt;</button>
        </div>
        <div className="current-period-display" style={{ marginBottom: '20px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em' }}>
          {currentPeriodDisplayString}
        </div>

        {/* Matrix Kanban Grid */}
        <div className="matrix-kanban-header" style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '5px', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>
          {visibleDates.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const isToday = dateStr === todayString;
            return (
              <div
                key={date.toISOString()}
                className={`date-header ${isToday ? 'today' : ''}`}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontWeight: 'bold',
                  padding: '5px 0',
                  backgroundColor: isToday ? 'var(--highlight-background, #fffde7)' : 'transparent',
                  borderLeft: isToday ? '2px solid var(--primary-color, #007bff)' : 'none',
                  borderRight: isToday ? '2px solid var(--primary-color, #007bff)' : 'none',
                  position: 'relative',
                }}
              >
                {formatDateHeader(date)}
              </div>
            );
          })}
        </div>
        <div className="matrix-kanban-body" style={{ display: 'flex', justifyContent: 'space-around', gap: '5px' }}>
          {visibleDates.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            const isToday = dateStr === todayString;
            return (
              <div
                key={date.toISOString()}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
                className={isToday ? 'today-column-container' : ''}
              >
                {statusColumns.map(statusColumn => (
                  <DateColumnView
                    key={statusColumn.id}
                    date={date}
                    statusColumn={statusColumn}
                    kidId={kidId}
                    selectedInstanceIds={selectedInstanceIds}
                    onToggleSelection={handleToggleSelection}
                    onEditChore={handleEditChore}
                    isToday={isToday} // Pass isToday prop
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Add/Edit Chore Modals */}
        {showAddChoreModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0 }}>Assign New Chore</h3>
              <AddChoreForm
                defaultKidId={kidId}
                defaultDueDate={addChoreDefaultDate || undefined}
                defaultCategoryStatus={statusColumns[0]?.id || ""} // Use first status column ID
                onSuccess={handleChoreCreated}
                onCancel={handleCloseAddChore}
                enableSubtasks
                enableRecurrence
                defaultIsRecurring={false}
              />
            </div>
          </div>
        )}
        {editingChore && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0 }}>Edit Chore</h3>
              {/* Ensure AddChoreForm can handle initialChore without defaultCategoryStatus or adapt as needed */}
              <AddChoreForm
                initialChore={editingChore}
                onSuccess={handleCloseEditChore}
                onCancel={handleCloseEditChore}
                enableSubtasks
                enableRecurrence
              />
            </div>
          </div>
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDragItem ? (<KanbanCard instance={activeDragItem.instance} definition={activeDragItem.definition} isOverlay />) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KidKanbanBoard;