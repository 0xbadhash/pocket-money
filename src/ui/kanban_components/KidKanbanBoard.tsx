/**
 * @file KidKanbanBoard.tsx
 * Displays a Kanban board for a specific kid, showing their chores.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
import { useUserContext } from '../../contexts/UserContext';
import { useNotification } from '../../contexts/NotificationContext'; // Import useNotification
import type { ChoreDefinition, ChoreInstance, KanbanPeriod, Kid, ColumnThemeOption, MatrixKanbanCategory, BatchActionResult } from '../../types';
import KanbanCard from './KanbanCard';
import DateColumnView from './DateColumnView';
import { useChoreSelection } from '../../hooks/useChoreSelection';
import { useModalState } from '../../hooks/useModalState';
import BatchActionsToolbar from './BatchActionsToolbar';
import ConfirmationModal from '../components/ConfirmationModal'; // Added import
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
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'; // Removed arrayMove as it's not used
import { getTodayDateString, getWeekRange, getMonthRange } from '../../utils/dateUtils';
import AddChoreForm from '../../components/AddChoreForm';

interface ActiveDragItem {
  instance: ChoreInstance;
  definition: ChoreDefinition;
}

interface KidKanbanBoardProps {
  kidId: string;
  // New props for receiving filtered/sorted data
  allChoreDefinitions: ChoreDefinition[];
  filteredSortedInstances: ChoreInstance[];
}

const KidKanbanBoard: React.FC<KidKanbanBoardProps> = ({
  kidId,
  allChoreDefinitions, // Use this prop
  filteredSortedInstances, // Use this prop
}) => {
  const {
    // choreDefinitions, // Now from props
    // choreInstances, // Now from props
    generateInstancesForPeriod, // Still needed from context for actions
    updateChoreInstanceCategory, // Action from context
    batchToggleCompleteChoreInstances,
    batchUpdateChoreInstancesCategory,
    batchAssignChoreDefinitionsToKid,
  } = useChoresContext();
  const { getKanbanColumnConfigs, user } = useUserContext();
  const { addNotification } = useNotification(); // Get addNotification
  const allKids = user?.kids || [];

  // Custom Hooks for selection and modal states
  const {
    selectedInstanceIds,
    toggleSelection: handleToggleSelection,
    clearSelection: actualClearSelectionLogic, // Renamed for clarity
    setSelectedInstanceIds,
  } = useChoreSelection();

  // State for ConfirmationModal for clearing selection
  const [isClearSelectionConfirmOpen, setIsClearSelectionConfirmOpen] = useState(false);

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
  const [selectedKidId, setSelectedKidId] = useState<string>(kidId); // Already exists

  // This derived list is now the primary source for rendering within this component
  const instancesForThisKidAndPeriod = useMemo(() => {
    return filteredSortedInstances.filter(instance => {
      const definition = allChoreDefinitions.find(def => def.id === instance.choreDefinitionId);
      // Filter by selected kid AND ensure instance falls within the current board's date range
      return definition?.assignedKidId === selectedKidId &&
             instance.instanceDate >= currentPeriodDateRange.start &&
             instance.instanceDate <= currentPeriodDateRange.end;
    });
  }, [filteredSortedInstances, allChoreDefinitions, selectedKidId, currentPeriodDateRange]);

  // The choreInstancesForSelectedKid for "Select All By Category" should also use the prop data
  const choreInstancesForSelectedKid = useMemo(() => {
    return filteredSortedInstances.filter(instance => {
      const definition = allChoreDefinitions.find(def => def.id === instance.choreDefinitionId);
      return definition?.assignedKidId === selectedKidId;
    });
  }, [filteredSortedInstances, allChoreDefinitions, selectedKidId]);


  useEffect(() => {
    localStorage.setItem('kanban_columnTheme', selectedColumnTheme);
  }, [selectedColumnTheme]);

  useEffect(() => {
    if (actionFeedbackMessage) {
      const timer = setTimeout(() => setActionFeedbackMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedbackMessage]);

  useEffect(() => {
    setSelectedKidId(kidId);
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
    if (!selectedKidId) return; // Use selectedKidId from state for consistency
    if (currentPeriodDateRange.start && currentPeriodDateRange.end) {
      generateInstancesForPeriod(
        currentPeriodDateRange.start,
        currentPeriodDateRange.end
      );
    }
  }, [selectedKidId, currentPeriodDateRange, generateInstancesForPeriod]);


  // getDefinitionForInstance now uses allChoreDefinitions from props (already updated in previous step)
  const getDefinitionForInstance = useCallback((instance: ChoreInstance): ChoreDefinition | undefined => {
    return allChoreDefinitions.find(def => def.id === instance.choreDefinitionId);
  }, [allChoreDefinitions]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const instance = filteredSortedParentInstances.find(inst => inst.id === event.active.id.toString()); // Use prop
    if (instance) {
      const definition = getDefinitionForInstance(instance); // Uses updated getDefinitionForInstance
      if (definition) setActiveDragItem({ instance, definition });
      else setActiveDragItem(null);
    } else {
      setActiveDragItem(null);
    }
  }, [filteredSortedParentInstances, getDefinitionForInstance]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over || !active) return;

    const activeInstance = filteredSortedParentInstances.find(inst => inst.id === active.id.toString()); // Use prop
    if (!activeInstance) return;

    const parsedOverId = parseSwimlaneId(over.id.toString());
    if (!parsedOverId) {
      console.warn("Invalid swimlane ID format:", over.id.toString());
      return;
    }
    const { dateString: targetDateString, category: newCategory } = parsedOverId;

    if (activeInstance.instanceDate !== targetDateString) {
      setActionFeedbackMessage("Chores can only be moved between categories for the same day in this view.");
      return;
    }
    if (activeInstance.categoryStatus !== newCategory) {
      updateChoreInstanceCategory(activeInstance.id.toString(), newCategory);
      const definition = getDefinitionForInstance(activeInstance);
      const categoryTitles: Record<MatrixKanbanCategory, string> = { TO_DO: "To Do", IN_PROGRESS: "In Progress", COMPLETED: "Completed" };
      setActionFeedbackMessage(`${definition?.title || "Chore"} moved to ${categoryTitles[newCategory]}.`);
    }
  }, [choreInstances, getDefinitionForInstance, updateChoreInstanceCategory, setActionFeedbackMessage]);

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

  function parseSwimlaneId(swimlaneId: string): { dateString: string, category: MatrixKanbanCategory } | null {
    if (swimlaneId.includes('|')) {
      const parts = swimlaneId.split('|');
      return parts.length === 2 ? { dateString: parts[0], category: parts[1] as MatrixKanbanCategory } : null;
    }
    const dashParts = swimlaneId.split('-');
    if (dashParts.length >= 4) {
      return { dateString: dashParts.slice(0, 3).join('-'), category: dashParts.slice(3).join('-') as MatrixKanbanCategory };
    }
    return null;
  }

  useEffect(() => {
    if (!selectedKidId) return;
    // Ensure instances within the current view (already filtered by parent, then by kid and period here)
    // have a default category if missing.
    instancesForThisKidAndPeriod.forEach(instance => {
      if (!instance.categoryStatus) {
        // The getDefinitionForInstance is not strictly needed here if instancesForThisKidAndPeriod
        // already correctly filters by kidId. However, keeping it for safety or if definition properties were needed.
        // const definition = getDefinitionForInstance(instance);
        // if (definition && definition.assignedKidId === selectedKidId) {
        updateChoreInstanceCategory(instance.id, "TO_DO");
        // }
      }
    });
  }, [selectedKidId, instancesForThisKidAndPeriod, updateChoreInstanceCategory, getDefinitionForInstance]);

  const kidsForSwitcher = user?.kids || [];
  const swimlaneConfigs = useMemo(() => getKanbanColumnConfigs(selectedKidId).sort((a, b) => a.order - b.order), [getKanbanColumnConfigs, selectedKidId]);

  // Batch Action Handlers wrapped in useCallback
  const handleRequestClearSelection = () => {
    if (selectedInstanceIds.length > 0) {
      setIsClearSelectionConfirmOpen(true);
    }
  };

  const handleConfirmClearSelection = () => {
    actualClearSelectionLogic();
    setIsClearSelectionConfirmOpen(false);
    addNotification({ message: `${selectedInstanceIds.length} chore(s) selection cleared.`, type: 'info', duration: 3000 });
  };

  const createBatchActionNotificationMessage = (action: string, result: BatchActionResult): string => {
    let message = `${action}: ${result.succeededCount} succeeded`;
    if (result.failedCount > 0) {
      message += `, ${result.failedCount} failed (IDs: ${result.failedIds.join(', ')}).`;
    } else {
      message += '.';
    }
    return message;
  };

  const handleBatchMarkCompleteCb = useCallback(async () => {
    if (selectedInstanceIds.length === 0) return;
    const result = await batchToggleCompleteChoreInstances(selectedInstanceIds, true);
    addNotification({
      message: createBatchActionNotificationMessage('Marked complete', result),
      type: result.failedCount > 0 ? (result.succeededCount > 0 ? 'warning' : 'error') : 'success',
    });
    if (result.succeededCount > 0) actualClearSelectionLogic();
  }, [selectedInstanceIds, batchToggleCompleteChoreInstances, actualClearSelectionLogic, addNotification]);

  const handleBatchMarkIncompleteCb = useCallback(async () => {
    if (selectedInstanceIds.length === 0) return;
    const result = await batchToggleCompleteChoreInstances(selectedInstanceIds, false);
    addNotification({
      message: createBatchActionNotificationMessage('Marked incomplete', result),
      type: result.failedCount > 0 ? (result.succeededCount > 0 ? 'warning' : 'error') : 'success',
    });
    if (result.succeededCount > 0) actualClearSelectionLogic();
  }, [selectedInstanceIds, batchToggleCompleteChoreInstances, actualClearSelectionLogic, addNotification]);

  // Note: CategoryChangeModal and KidAssignmentModal already call their respective batch functions
  // which now return BatchActionResult. The onActionSuccess callbacks in those modals
  // could be enhanced to use this result for more specific feedback, but for now,
  // we'll just keep the existing alert and then clear selection.
  // A deeper refactor would involve passing addNotification to these modals or handling their results here.

  const handleCategoryActionSuccess = useCallback(() => {
    // This is called from CategoryChangeModal AFTER it performs its action and shows an alert.
    // We just clear selection here. For more detailed notifications, CategoryChangeModal would need
    // to return the BatchActionResult or useNotification hook itself.
    // For now, assuming its internal alert is sufficient for immediate feedback.
    addNotification({ message: 'Category change process completed.', type: 'info', duration: 3000 });
    categoryModal.closeModal();
    actualClearSelectionLogic();
  }, [categoryModal, actualClearSelectionLogic, addNotification]);

  const handleKidAssignmentActionSuccess = useCallback(() => {
    // Similar to CategoryChangeModal, KidAssignmentModal handles its own internal alert.
    addNotification({ message: 'Kid assignment process completed.', type: 'info', duration: 3000 });
    kidAssignmentModal.closeModal();
    actualClearSelectionLogic();
  }, [kidAssignmentModal, actualClearSelectionLogic, addNotification]);

  const handleSelectAllByCategory = useCallback((category: MatrixKanbanCategory) => {
    const instancesInCategory = choreInstancesForSelectedKid.filter(
      instance => instance.categoryStatus === category
    );
    const instanceIdsInCategory = instancesInCategory.map(instance => instance.id);
    setSelectedInstanceIds(instanceIdsInCategory);
    addNotification({
      message: `Selected all ${instanceIdsInCategory.length} chores in ${category.replace('_', ' ')}.`,
      type: 'info',
      duration: 3000
    });
  }, [choreInstancesForSelectedKid, setSelectedInstanceIds, addNotification]);

  // Derive selectedDefinitionIds for KidAssignmentModal - this needs to be available when opening modal
  const selectedDefinitionIdsForModal = useMemo(() => {
    if (selectedInstanceIds.length === 0) return [];
    return Array.from(new Set(
      selectedInstanceIds
        .map(id => filteredSortedParentInstances.find(inst => inst.id === id)?.choreDefinitionId) // Use prop
        .filter((id): id is string => !!id)
    ));
  }, [selectedInstanceIds, filteredSortedParentInstances]);

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


  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="kid-kanban-board">
        <BatchActionsToolbar
          selectedCount={selectedInstanceIds.length}
          onClearSelection={handleRequestClearSelection}
          onOpenCategoryModal={categoryModal.openModal}
          onOpenKidAssignmentModal={kidAssignmentModal.openModal}
          onMarkComplete={handleBatchMarkCompleteCb}
          onMarkIncomplete={handleBatchMarkIncompleteCb}
          onSelectAllByCategory={handleSelectAllByCategory} // Pass the new handler
          // availableCategories can be implicitly known by BatchActionsToolbar or passed if dynamic
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
          selectedDefinitionIds={selectedDefinitionIdsForModal}
          onActionSuccess={handleKidAssignmentActionSuccess}
        />
        <ConfirmationModal
          isOpen={isClearSelectionConfirmOpen}
          onClose={() => setIsClearSelectionConfirmOpen(false)}
          onConfirm={handleConfirmClearSelection}
          title="Confirm Clear Selection"
          message={`Are you sure you want to clear all ${selectedInstanceIds.length} selected chore(s)? This cannot be undone.`}
          confirmButtonText="Clear Selection"
          cancelButtonText="Keep Selection"
        />

        {/* Kid selection buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {kidsForSwitcher.map(kid => (
            <button key={kid.id} onClick={() => setSelectedKidId(kid.id)}
              style={{ fontWeight: selectedKidId === kid.id ? 'bold' : 'normal', background: selectedKidId === kid.id ? '#1976d2' : '#f5f5f5', color: selectedKidId === kid.id ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}>
              {kid.name}
            </button>
          ))}
        </div>
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
          {visibleDates.map(date => (<div key={date.toISOString()} className="date-header" style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>{formatDateHeader(date)}</div>))}
        </div>
        <div className="matrix-kanban-body" style={{ display: 'flex', justifyContent: 'space-around', gap: '5px' }}>
          {visibleDates.map(date => (
            <div key={date.toISOString()} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {swimlaneConfigs.map(swimlane => (
                <DateColumnView
                  key={swimlane.id}
                  date={date}
                  // Pass down the relevant instances and definitions for this specific DateColumnView
                  instancesForDateColumn={instancesForThisKidAndPeriod}
                  allDefinitionsForDateColumn={allChoreDefinitions}
                  onEditChore={handleEditChore}
                  kidId={selectedKidId} // kidId is already correct
                  swimlaneConfig={swimlane}
                  selectedInstanceIds={selectedInstanceIds} // For selection visuals
                  onToggleSelection={handleToggleSelection} // For selection interaction
                />
              ))}
            </div>
          ))}
        </div>

        {/* Add/Edit Chore Modals */}
        {showAddChoreModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0 }}>Assign New Chore</h3>
              <AddChoreForm defaultKidId={selectedKidId} defaultDueDate={addChoreDefaultDate || undefined} defaultCategoryStatus="TO_DO" onSuccess={handleChoreCreated} onCancel={handleCloseAddChore} enableSubtasks enableRecurrence defaultIsRecurring={false} />
            </div>
          </div>
        )}
        {editingChore && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0 }}>Edit Chore</h3>
              <AddChoreForm initialChore={editingChore} onSuccess={handleCloseEditChore} onCancel={handleCloseEditChore} enableSubtasks enableRecurrence />
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