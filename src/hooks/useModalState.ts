import { useState, useCallback } from 'react';

/**
 * Return type for the useModalState hook.
 */
export interface UseModalStateReturn {
  /** Whether the modal is currently visible. */
  isModalVisible: boolean;
  /** Opens the modal. */
  openModal: () => void;
  /** Closes the modal. */
  closeModal: () => void;
}

/**
 * A custom hook for managing modal visibility state.
 * @param initialVisible - Initial visibility state of the modal (defaults to false)
 * @returns Object containing visibility state and control functions
 */
export const useModalState = (initialVisible = false): UseModalStateReturn => {
  const [isModalVisible, setIsModalVisible] = useState(initialVisible);

  const openModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  return {
    isModalVisible,
    openModal,
    closeModal,
  };
};
