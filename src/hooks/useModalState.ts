import { useState, useCallback } from 'react';

export interface UseModalStateReturn {
  isModalVisible: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const useModalState = (initialVisible: boolean = false): UseModalStateReturn => {
  const [isModalVisible, setIsModalVisible] = useState<boolean>(initialVisible);

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
