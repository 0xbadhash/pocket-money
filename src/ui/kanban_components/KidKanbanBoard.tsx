/**
 * @file KidKanbanBoard.tsx
 * Displays a Kanban board for a specific kid, showing their chores.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
import { useUserContext } from '../../contexts/UserContext';
import type { ChoreDefinition, ChoreInstance, KanbanPeriod, Kid, ColumnThemeOption, MatrixKanbanCategory } from '../../types';
import KanbanCard from './KanbanCard';
import DateColumnView from './DateColumnView';
import { useChoreSelection } from '../../hooks/useChoreSelection';
import { useModalState } from '../../hooks/useModalState';
import BatchActionsToolbar from './BatchActionsToolbar';
import CategoryChangeModal from './CategoryChangeModal';
import KidAssignmentModal from './KidAssignmentModal';
import ConfirmationModal from '../../components/ConfirmationModal'; // Added import
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
}

const KidKanbanBoard: React.FC<KidKanbanBoardProps> = ({ kidId }) => {
  const {
    choreDefinitions,
    choreInstances,
    generateInstancesForPeriod,
    updateChoreInstanceCategory,
    batchToggleCompleteChoreInstances,
    batchUpdateChoreInstancesCategory,
    batchAssignChoreDefinitionsToKid,
    batchDeleteChoreInstances, // Uncommented and now used
  } = useChoresContext();
  const { getKanbanColumnConfigs, user } = useUserContext();
  const allKids = user?.kids || [];

  // Custom Hooks for selection and modal states
  const {
    selectedInstanceIds,
    toggleSelection: handleToggleSelection,
    clearSelection: handleClearSelection,
    setSelectedInstanceIds,
  } = useChoreSelection();

  const categoryModal = useModalState();
  const kidAssignmentModal = useModalState();
  const deleteConfirmModal = useModalState(); // Added state for delete confirmation modal

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
  const [selectedKidId, setSelectedKidId] = useState<string>(kidId);

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
    choreInstances.forEach(instance => {
      const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
      if (definition && definition.assignedKidId === selectedKidId && instance.instanceDate >= currentPeriodDateRange.start && instance.instanceDate <= currentPeriodDateRange.end && !instance.categoryStatus) {
        updateChoreInstanceCategory(instance.id, "TO_DO");
      }
    });
  }, [selectedKidId, choreInstances, choreDefinitions, currentPeriodDateRange, updateChoreInstanceCategory]);

  const kidsForSwitcher = user?.kids || [];
  const swimlaneConfigs = useMemo(() => getKanbanColumnConfigs(selectedKidId).sort((a, b) => a.order - b.order), [getKanbanColumnConfigs, selectedKidId]);

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

  // Batch Delete Handlers
  const handleRequestBatchDelete = useCallback(() => {
    if (selectedInstanceIds.length > 0) {
      deleteConfirmModal.openModal();
    } else {
      setActionFeedbackMessage("No chores selected for deletion.");
      // Alternatively, do nothing or log a warning
    }
  }, [selectedInstanceIds, deleteConfirmModal, setActionFeedbackMessage]);

  const handleConfirmBatchDelete = useCallback(async () => {
    deleteConfirmModal.closeModal();
    if (selectedInstanceIds.length > 0) {
      try {
        await batchDeleteChoreInstances(selectedInstanceIds);
        setActionFeedbackMessage(`${selectedInstanceIds.length} chore(s) deleted successfully.`);
      } catch (error) {
        console.error("Failed to batch delete chores:", error);
        setActionFeedbackMessage("Error deleting chores. Please try again.");
        // Depending on UX, might not clear selection on error, or might re-open modal with error.
        // For now, selection is cleared outside/after this block.
      }
      handleClearSelection(); // Clears selection regardless of success/failure of delete, adjust if needed.
    }
  }, [deleteConfirmModal, selectedInstanceIds, batchDeleteChoreInstances, handleClearSelection, setActionFeedbackMessage]);

  const handleSelectAllInSwimlane = useCallback((idsToSelect: string[]) => {
    setSelectedInstanceIds(prevSelectedIds => {
      const newSelectedIds = new Set([...prevSelectedIds, ...idsToSelect]);
      return Array.from(newSelectedIds);
    });
    // Optionally, set a feedback message or log
    // setActionFeedbackMessage(`${idsToSelect.length} chores selected in swimlane.`);
  }, [setSelectedInstanceIds]);

  const handleSelectAllOnDate = useCallback((dateString: string) => {
    const idsToSelect = choreInstances
      .filter(instance => {
        if (instance.instanceDate !== dateString) return false;
        const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
        return definition && definition.assignedKidId === selectedKidId && !definition.isComplete; // Not archived
      })
      .map(instance => instance.id);

    if (idsToSelect.length > 0) {
      setSelectedInstanceIds(prevSelectedIds => {
        const newSelectedIds = new Set([...prevSelectedIds, ...idsToSelect]);
        return Array.from(newSelectedIds);
      });
      // setActionFeedbackMessage(`${idsToSelect.length} chores on ${dateString} selected.`);
    }
  }, [choreInstances, choreDefinitions, selectedKidId, setSelectedInstanceIds]);


  // Simplified handler for CategoryChangeModal's onActionSuccess
  const handleCategoryActionSuccess = useCallback(() => {
    // The modal now handles the alert/feedback internally based on its own success/failure.
    // KidKanbanBoard just needs to close the modal and clear selection.
    alert("Category change action attempted."); // Generic feedback, or remove if modal handles all feedback
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
          onBatchDelete={handleRequestBatchDelete} // Passed handler to toolbar
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
        <ConfirmationModal
          isOpen={deleteConfirmModal.isModalVisible}
          onClose={deleteConfirmModal.closeModal}
          onConfirm={handleConfirmBatchDelete}
          title="Confirm Batch Delete"
          message={`Are you sure you want to delete ${selectedInstanceIds.length} selected chore(s)? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
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
          {visibleDates.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            // Check if there are any selectable chores for this date and kid to conditionally show the button
            const hasChoresOnDate = choreInstances.some(instance => {
                if (instance.instanceDate !== dateStr) return false;
                const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
                return definition && definition.assignedKidId === selectedKidId && !definition.isComplete;
            });

            return (
              <div key={dateStr} className="date-header" style={{ flex: 1, textAlign: 'center', padding: '5px' }}>
                <span style={{ fontWeight: 'bold' }}>{formatDateHeader(date)}</span>
                {hasChoresOnDate && (
                  <button
                    onClick={() => handleSelectAllOnDate(dateStr)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-link-color, #007bff)',
                      cursor: 'pointer', padding: '0px 4px', fontSize: '0.75em', textDecoration: 'underline',
                      marginLeft: '5px', display: 'block', margin: '2px auto 0' // Center button under date
                    }}
                    title={`Select all chores for ${formatDateHeader(date)}`}
                  >
                    Select All
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="matrix-kanban-body" style={{ display: 'flex', justifyContent: 'space-around', gap: '5px' }}>
          {visibleDates.map(date => (
            <div key={date.toISOString()} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {swimlaneConfigs.map(swimlane => (
                <DateColumnView
                  key={swimlane.id}
                  date={date}
                  onEditChore={handleEditChore}
                  // getSwimlaneId={getSwimlaneId} // Retained if DateColumnView needs it for droppable IDs
                  kidId={selectedKidId}
                  swimlaneConfig={swimlane}
                  selectedInstanceIds={selectedInstanceIds}
                  onToggleSelection={handleToggleSelection}
                  onSelectAllInSwimlane={handleSelectAllInSwimlane} // Pass the handler
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