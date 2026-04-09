// src/hooks/useChoreActivityLog.ts
import { useCallback } from 'react';
import type { ChoreInstance } from '../types';
import { useUserContext } from '../contexts/UserContext';

type ActivityLogEntry = { 
  timestamp: string; 
  action: string; 
  userId?: string; 
  userName?: string; 
  details?: string; 
};

/**
 * Custom hook for managing activity logging for chore instances.
 * Extracts activity log logic from ChoresContext for better composability.
 */
export function useChoreActivityLog() {
  const { user } = useUserContext();

  /**
   * Create an activity log entry
   */
  const createLogEntry = useCallback((
    action: string,
    userId?: string,
    userName?: string,
    details?: string
  ): ActivityLogEntry => {
    return {
      timestamp: new Date().toISOString(),
      action,
      userId: userId || user?.id || 'system_user',
      userName: userName || user?.username || 'System',
      details,
    };
  }, [user]);

  /**
   * Add a log entry to an instance, returning a new instance with updated activity log
   */
  const addLogToInstance = useCallback((
    instance: ChoreInstance,
    action: string,
    userId?: string,
    userName?: string,
    details?: string
  ): ChoreInstance => {
    const logEntry = createLogEntry(action, userId, userName, details);
    const existingLog = Array.isArray(instance.activityLog) ? instance.activityLog : [];
    return {
      ...instance,
      activityLog: [logEntry, ...existingLog],
    };
  }, [createLogEntry]);

  /**
   * Log a status change event
   */
  const logStatusChange = useCallback((
    instance: ChoreInstance,
    newStatusTitle: string,
    userId?: string,
    userName?: string
  ): ChoreInstance => {
    return addLogToInstance(
      instance,
      'Status Changed',
      userId,
      userName,
      `to '${newStatusTitle}'`
    );
  }, [addLogToInstance]);

  /**
   * Log a subtask toggle event
   */
  const logSubtaskToggle = useCallback((
    instance: ChoreInstance,
    subtaskTitle: string,
    isComplete: boolean,
    userId?: string,
    userName?: string
  ): ChoreInstance => {
    return addLogToInstance(
      instance,
      'Subtask Toggled',
      userId,
      userName,
      `'${subtaskTitle}' to ${isComplete ? 'Complete' : 'Incomplete'}`
    );
  }, [addLogToInstance]);

  /**
   * Log a completion toggle event
   */
  const logCompletionToggle = useCallback((
    instance: ChoreInstance,
    isMarkingComplete: boolean,
    userId?: string,
    userName?: string
  ): ChoreInstance => {
    return addLogToInstance(
      instance,
      isMarkingComplete ? 'Marked Complete' : 'Marked Incomplete',
      userId,
      userName
    );
  }, [addLogToInstance]);

  /**
   * Log a priority change event
   */
  const logPriorityChange = useCallback((
    instance: ChoreInstance,
    newPriority: string,
    userId?: string,
    userName?: string
  ): ChoreInstance => {
    return addLogToInstance(
      instance,
      'Priority Changed',
      userId,
      userName,
      `to ${newPriority || 'Default'}`
    );
  }, [addLogToInstance]);

  /**
   * Log a date change event
   */
  const logDateChange = useCallback((
    instance: ChoreInstance,
    newDate: string,
    userId?: string,
    userName?: string
  ): ChoreInstance => {
    return addLogToInstance(
      instance,
      'Date Changed',
      userId,
      userName,
      `to ${newDate}`
    );
  }, [addLogToInstance]);

  /**
   * Log a reward change event
   */
  const logRewardChange = useCallback((
    instance: ChoreInstance,
    newAmount: number,
    userId?: string,
    userName?: string
  ): ChoreInstance => {
    return addLogToInstance(
      instance,
      'Reward Changed',
      userId,
      userName,
      `to $${newAmount.toFixed(2)}`
    );
  }, [addLogToInstance]);

  return {
    createLogEntry,
    addLogToInstance,
    logStatusChange,
    logSubtaskToggle,
    logCompletionToggle,
    logPriorityChange,
    logDateChange,
    logRewardChange,
  };
}
