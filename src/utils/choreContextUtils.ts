// src/utils/choreContextUtils.ts
import type { ChoreDefinition, ChoreInstance, KanbanColumnConfig, SubTask } from '../types';

/**
 * Creates an activity log entry for tracking changes to chore instances
 */
export const createActivityLogEntry = (
  action: string,
  userId: string,
  userName: string,
  details?: string
) => ({
  timestamp: new Date().toISOString(),
  action,
  userId,
  userName,
  details,
});

/**
 * Returns a record with all subtasks marked as complete
 */
export const getAllSubtasksComplete = (subTasks: SubTask[] | undefined): Record<string, boolean> => {
  const allTrueSubtasks: Record<string, boolean> = {};
  (subTasks || []).forEach(st => {
    allTrueSubtasks[st.id] = true;
  });
  return allTrueSubtasks;
};

/**
 * Determines initial subtask completions from a chore definition
 */
export const getInitialSubtaskCompletions = (definition: ChoreDefinition): Record<string, boolean> => {
  const initialSubtaskCompletions: Record<string, boolean> = {};
  if (definition?.subTasks) {
    definition.subTasks.forEach(st => {
      initialSubtaskCompletions[st.id] = st.isComplete || false;
    });
  }
  return initialSubtaskCompletions;
};

/**
 * Finds a column configuration by its completion status
 */
export const findColumnByCompletionStatus = (
  columns: KanbanColumnConfig[],
  isCompleted: boolean
): KanbanColumnConfig | undefined => {
  return columns.find(col => col.isCompletedColumn === isCompleted);
};

/**
 * Checks if all subtasks in a definition are complete based on instance completions
 */
export const areAllSubtasksComplete = (
  subTasks: SubTask[] | undefined,
  completions: Record<string, boolean>
): boolean => {
  if (!subTasks || subTasks.length === 0) return true;
  return subTasks.every(st => !!completions[st.id]);
};

/**
 * Normalizes a date string to YYYY-MM-DD format
 */
export const normalizeDateString = (dateString: string): string => {
  const date = new Date(dateString);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().split('T')[0];
};

/**
 * Creates a new chore instance with default values
 */
export const createChoreInstance = (
  definition: ChoreDefinition,
  instanceDate: string,
  defaultCategoryStatus: string = ''
): ChoreInstance => {
  return {
    id: `${definition.id}_${instanceDate}`,
    choreDefinitionId: definition.id,
    instanceDate,
    isComplete: false,
    categoryStatus: defaultCategoryStatus,
    subtaskCompletions: getInitialSubtaskCompletions(definition),
    previousSubtaskCompletions: undefined,
    priority: definition.priority,
    instanceComments: [],
    isSkipped: false,
    activityLog: [
      createActivityLogEntry('Instance Created', 'system', 'System'),
    ],
    instanceDescription: undefined,
  };
};
