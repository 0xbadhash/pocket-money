// src/hooks/useKanbanColumns.ts
import { useCallback } from 'react';
import type { KanbanColumnConfig } from '../types';
import { useUserContext } from '../contexts/UserContext';

/**
 * Custom hook for managing Kanban column configurations for a specific kid.
 * Extracts Kanban config logic from UserContext for better composability.
 */
export function useKanbanColumns(kidId: string) {
  const { 
    getKanbanColumnConfigs, 
    addKanbanColumnConfig, 
    updateKanbanColumnConfig, 
    deleteKanbanColumnConfig,
    reorderKanbanColumnConfigs
  } = useUserContext();

  /**
   * Get sorted column configs for a kid
   */
  const columns = useCallback((): KanbanColumnConfig[] => {
    const configs = getKanbanColumnConfigs(kidId);
    return [...configs].sort((a, b) => a.order - b.order);
  }, [kidId, getKanbanColumnConfigs]);

  /**
   * Add a new column to the kid's Kanban board
   */
  const addColumn = useCallback(async (
    title: string, 
    color?: string, 
    isCompletedColumn?: boolean
  ): Promise<void> => {
    await addKanbanColumnConfig(kidId, title, color, isCompletedColumn);
  }, [kidId, addKanbanColumnConfig]);

  /**
   * Update an existing column configuration
   */
  const updateColumn = useCallback(async (
    updatedConfig: KanbanColumnConfig
  ): Promise<void> => {
    await updateKanbanColumnConfig(updatedConfig);
  }, [updateKanbanColumnConfig]);

  /**
   * Delete a column configuration
   */
  const deleteColumn = useCallback(async (
    configId: string
  ): Promise<void> => {
    await deleteKanbanColumnConfig(kidId, configId);
  }, [kidId, deleteKanbanColumnConfig]);

  /**
   * Reorder all columns for a kid
   */
  const reorderColumns = useCallback(async (
    orderedConfigs: KanbanColumnConfig[]
  ): Promise<void> => {
    await reorderKanbanColumnConfigs(kidId, orderedConfigs);
  }, [kidId, reorderKanbanColumnConfigs]);

  /**
   * Get the first column ID (useful for default assignment)
   */
  const firstColumnId = useCallback((): string | undefined => {
    const cols = columns();
    return cols.length > 0 ? cols[0].id : undefined;
  }, [columns]);

  /**
   * Check if a kid has any columns configured
   */
  const hasColumns = useCallback((): boolean => {
    return columns().length > 0;
  }, [columns]);

  return {
    columns,
    addColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    firstColumnId,
    hasColumns,
  };
}
