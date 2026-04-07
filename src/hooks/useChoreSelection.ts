import { useState, useCallback } from 'react';

/**
 * Return type for the useChoreSelection hook.
 */
export interface UseChoreSelectionReturn {
  /** Array of selected chore instance IDs. */
  selectedInstanceIds: string[];
  /** Toggles selection state for a chore instance. */
  toggleSelection: (instanceId: string, isSelected: boolean) => void;
  /** Clears all selected chore instances. */
  clearSelection: () => void;
  /** Direct setter for selected instance IDs (useful for batch operations). */
  setSelectedInstanceIds: React.Dispatch<React.SetStateAction<string[]>>;
}

/**
 * A custom hook for managing chore instance selection state.
 * @returns Object containing selection state and control functions
 */
export const useChoreSelection = (): UseChoreSelectionReturn => {
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([]);

  const toggleSelection = useCallback(
    (instanceId: string, newIsSelectedState: boolean) => {
      setSelectedInstanceIds((prevSelectedIds) => {
        if (newIsSelectedState) {
          return prevSelectedIds.includes(instanceId)
            ? prevSelectedIds
            : [...prevSelectedIds, instanceId];
        }
        return prevSelectedIds.filter((id) => id !== instanceId);
      });
    },
    []
  );

  const clearSelection = useCallback(() => {
    setSelectedInstanceIds([]);
  }, []);

  return {
    selectedInstanceIds,
    toggleSelection,
    clearSelection,
    setSelectedInstanceIds,
  };
};
