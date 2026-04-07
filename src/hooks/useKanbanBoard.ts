/**
 * @file src/hooks/useKanbanBoard.ts
 * Custom hook for managing Kanban board state and operations.
 * Encapsulates all board-related logic for KidKanbanBoard component.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useChoresContext } from '../contexts/ChoresContext';
import type { 
  ChoreDefinition, 
  ChoreInstance, 
  KanbanPeriod, 
  ColumnThemeOption,
  MatrixKanbanCategory 
} from '../types';
import { getWeekRange, getMonthRange } from '../utils/dateUtils';

/**
 * Active drag item during drag-and-drop operations
 */
interface ActiveDragItem {
  instance: ChoreInstance;
  definition: ChoreDefinition;
}

/**
 * Date navigation handlers
 */
interface DateNavigationHandlers {
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
}

/**
 * Return type for useKanbanBoard hook
 */
export interface UseKanbanBoardReturn {
  // State
  selectedPeriod: KanbanPeriod;
  currentVisibleStartDate: Date;
  activeDragItem: ActiveDragItem | null;
  actionFeedbackMessage: string | null;
  selectedColumnTheme: ColumnThemeOption;
  showAddChoreModal: boolean;
  addChoreDefaultDate: Date | null;
  editingChore: ChoreDefinition | null;
  
  // Computed values
  currentPeriodDateRange: { start: string; end: string };
  visibleDates: Date[];
  currentPeriodDisplayString: string;
  
  // Navigation
  dateNavigationHandlers: DateNavigationHandlers;
  
  // Actions
  setActiveDragItem: React.Dispatch<React.SetStateAction<ActiveDragItem | null>>;
  setActionFeedbackMessage: React.Dispatch<React.SetStateAction<string | null>>;
  setShowAddChoreModal: React.Dispatch<React.SetStateAction<boolean>>;
  setAddChoreDefaultDate: React.Dispatch<React.SetStateAction<Date | null>>;
  setEditingChore: React.Dispatch<React.SetStateAction<ChoreDefinition | null>>;
  handleOpenAddChore: (date?: Date) => void;
  handleCloseAddChore: () => void;
  handleChoreCreated: () => void;
  handleEditChore: (chore: ChoreDefinition) => void;
  handleCloseEditChore: () => void;
  formatDateHeader: (date: Date) => string;
  parseSwimlaneId: (swimlaneId: string) => { dateString: string; category: MatrixKanbanCategory } | null;
}

/**
 * Custom hook for managing Kanban board state and operations.
 * @param kidId - The ID of the kid whose board is being displayed
 * @returns Object containing board state, computed values, and action handlers
 */
export const useKanbanBoard = (kidId: string): UseKanbanBoardReturn => {
  const {
    choreDefinitions,
    choreInstances,
    generateInstancesForPeriod,
    updateChoreInstanceCategory,
  } = useChoresContext();

  // Board state
  const [selectedPeriod] = useState<KanbanPeriod>('daily');
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(null);
  const [actionFeedbackMessage, setActionFeedbackMessage] = useState<string | null>(null);
  const [selectedColumnTheme] = useState<ColumnThemeOption>(() => {
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

  // Persist theme preference
  useEffect(() => {
    localStorage.setItem('kanban_columnTheme', selectedColumnTheme);
  }, [selectedColumnTheme]);

  // Auto-dismiss feedback messages
  useEffect(() => {
    if (actionFeedbackMessage) {
      const timer = setTimeout(() => setActionFeedbackMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedbackMessage]);

  // Calculate current period date range based on selected period and start date
  const currentPeriodDateRange = useMemo(() => {
    const today = new Date(currentVisibleStartDate);
    if (selectedPeriod === 'daily') {
      const todayStr = today.toISOString().split('T')[0];
      return { start: todayStr, end: todayStr };
    } else if (selectedPeriod === 'weekly') {
      const range = getWeekRange(today);
      return { 
        start: range.start.toISOString().split('T')[0], 
        end: range.end.toISOString().split('T')[0] 
      };
    } else { // monthly
      const range = getMonthRange(today);
      return { 
        start: range.start.toISOString().split('T')[0], 
        end: range.end.toISOString().split('T')[0] 
      };
    }
  }, [selectedPeriod, currentVisibleStartDate]);

  // Generate instances when period or kid changes
  useEffect(() => {
    if (!kidId) return;
    if (currentPeriodDateRange.start && currentPeriodDateRange.end) {
      generateInstancesForPeriod(
        currentPeriodDateRange.start,
        currentPeriodDateRange.end
      );
    }
  }, [kidId, currentPeriodDateRange, generateInstancesForPeriod]);

  // Ensure instances have category status assigned
  useEffect(() => {
    if (!kidId) return;
    choreInstances.forEach(instance => {
      const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
      if (definition && definition.assignedKidId === kidId &&
          instance.instanceDate >= currentPeriodDateRange.start &&
          instance.instanceDate <= currentPeriodDateRange.end &&
          !instance.categoryStatus) {
        updateChoreInstanceCategory(instance.id, "TO_DO");
      }
    });
  }, [kidId, choreInstances, choreDefinitions, currentPeriodDateRange, updateChoreInstanceCategory]);

  // Date adjustment helper
  const adjustDate = useCallback((currentDate: Date, adjustment: (date: Date) => void) => {
    const newDate = new Date(currentDate);
    adjustment(newDate);
    newDate.setHours(0, 0, 0, 0);
    setCurrentVisibleStartDate(newDate);
  }, []);

  // Date navigation handlers
  const dateNavigationHandlers = useMemo(() => ({
    goToPreviousDay: () => adjustDate(currentVisibleStartDate, date => date.setDate(date.getDate() - 1)),
    goToNextDay: () => adjustDate(currentVisibleStartDate, date => date.setDate(date.getDate() + 1)),
    goToPreviousWeek: () => adjustDate(currentVisibleStartDate, date => date.setDate(date.getDate() - 7)),
    goToNextWeek: () => adjustDate(currentVisibleStartDate, date => date.setDate(date.getDate() + 7)),
    goToPreviousMonth: () => adjustDate(currentVisibleStartDate, date => date.setMonth(date.getMonth() - 1)),
    goToNextMonth: () => adjustDate(currentVisibleStartDate, date => date.setMonth(date.getMonth() + 1)),
    goToToday: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setCurrentVisibleStartDate(today);
    },
  }), [currentVisibleStartDate, adjustDate]);

  // Calculate visible dates for the board (7-day window)
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

  // Format date for display in headers
  const formatDateHeader = useCallback((date: Date): string => {
    return date.toLocaleDateString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }, []);

  // Parse swimlane ID from drag-and-drop operations
  const parseSwimlaneId = useCallback((swimlaneId: string): { dateString: string; category: MatrixKanbanCategory } | null => {
    if (swimlaneId.includes('|')) {
      const parts = swimlaneId.split('|');
      return parts.length === 2 
        ? { dateString: parts[0], category: parts[1] as MatrixKanbanCategory } 
        : null;
    }
    const dashParts = swimlaneId.split('-');
    if (dashParts.length >= 4) { // e.g. 2023-10-26-TO_DO
      const datePart = dashParts.slice(0, 3).join('-'); // YYYY-MM-DD
      const categoryPart = dashParts.slice(3).join('-') as MatrixKanbanCategory;
      if (["TO_DO", "IN_PROGRESS", "COMPLETED"].includes(categoryPart)) {
        return { dateString: datePart, category: categoryPart };
      }
    }
    return null;
  }, []);

  // Modal handlers
  const handleOpenAddChore = useCallback((date?: Date) => {
    setAddChoreDefaultDate(date || currentVisibleStartDate);
    setShowAddChoreModal(true);
  }, [currentVisibleStartDate]);

  const handleCloseAddChore = useCallback(() => {
    setShowAddChoreModal(false);
  }, []);

  const handleChoreCreated = useCallback(() => {
    setShowAddChoreModal(false);
    setActionFeedbackMessage('Chore created!');
  }, []);

  const handleEditChore = useCallback((chore: ChoreDefinition) => {
    setEditingChore(chore);
  }, []);

  const handleCloseEditChore = useCallback(() => {
    setEditingChore(null);
  }, []);

  // Generate period display string
  const currentPeriodDisplayString = useMemo(() => {
    if (!currentPeriodDateRange.start) return "";
    const parseAsLocalDate = (dateString: string) => new Date(dateString + 'T00:00:00');
    const startDate = parseAsLocalDate(currentPeriodDateRange.start);
    
    if (selectedPeriod === 'daily') {
      return startDate.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    if (selectedPeriod === 'weekly') {
      const endDate = parseAsLocalDate(currentPeriodDateRange.end);
      const options: Intl.DateTimeFormatOptions = { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      };
      return `Week: ${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, options)}`;
    }
    
    return `Month: ${startDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
  }, [selectedPeriod, currentPeriodDateRange]);

  return {
    // State
    selectedPeriod,
    currentVisibleStartDate,
    activeDragItem,
    actionFeedbackMessage,
    selectedColumnTheme,
    showAddChoreModal,
    addChoreDefaultDate,
    editingChore,
    
    // Setters
    setActiveDragItem,
    setActionFeedbackMessage,
    setShowAddChoreModal,
    setAddChoreDefaultDate,
    setEditingChore,
    
    // Computed values
    currentPeriodDateRange,
    visibleDates,
    currentPeriodDisplayString,
    
    // Navigation
    dateNavigationHandlers,
    
    // Actions
    handleOpenAddChore,
    handleCloseAddChore,
    handleChoreCreated,
    handleEditChore,
    handleCloseEditChore,
    formatDateHeader,
    parseSwimlaneId,
  };
};
