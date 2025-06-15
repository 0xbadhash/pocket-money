import { useState, useCallback } from 'react';

export interface UseChoreSelectionReturn {
  selectedInstanceIds: string[];
  toggleSelection: (instanceId: string, isSelected: boolean) => void;
  clearSelection: () => void;
  setSelectedInstanceIds: React.Dispatch<React.SetStateAction<string[]>>;
}

export const useChoreSelection = (): UseChoreSelectionReturn => {
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([]);

  const toggleSelection = useCallback((instanceId: string, newIsSelectedState: boolean) => {
    setSelectedInstanceIds(prevSelectedIds => {
      if (newIsSelectedState) {
        return prevSelectedIds.includes(instanceId) ? prevSelectedIds : [...prevSelectedIds, instanceId];
      } else {
        return prevSelectedIds.filter(id => id !== instanceId);
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedInstanceIds([]);
  }, []);

  return {
    selectedInstanceIds,
    toggleSelection,
    clearSelection,
    setSelectedInstanceIds, // Expose setter for effects like clearing on kid change
  };
};
