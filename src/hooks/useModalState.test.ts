import { renderHook, act } from '@testing-library/react';
import { useModalState } from './useModalState';

describe('useModalState Hook', () => {
  test('initializes isModalVisible to false by default', () => {
    const { result } = renderHook(() => useModalState());
    expect(result.current.isModalVisible).toBe(false);
  });

  test('initializes isModalVisible to true if initialState is true', () => {
    const { result } = renderHook(() => useModalState(true));
    expect(result.current.isModalVisible).toBe(true);
  });

  describe('openModal action', () => {
    test('sets isModalVisible to true when called and initially false', () => {
      const { result } = renderHook(() => useModalState(false));
      act(() => {
        result.current.openModal();
      });
      expect(result.current.isModalVisible).toBe(true);
    });

    test('keeps isModalVisible true when called and already true', () => {
      const { result } = renderHook(() => useModalState(true));
      act(() => {
        result.current.openModal();
      });
      expect(result.current.isModalVisible).toBe(true);
    });
  });

  describe('closeModal action', () => {
    test('sets isModalVisible to false when called and initially true', () => {
      const { result } = renderHook(() => useModalState(true));
      act(() => {
        result.current.closeModal();
      });
      expect(result.current.isModalVisible).toBe(false);
    });

    test('keeps isModalVisible false when called and already false', () => {
      const { result } = renderHook(() => useModalState(false));
      act(() => {
        result.current.closeModal();
      });
      expect(result.current.isModalVisible).toBe(false);
    });
  });

  test('openModal and closeModal work sequentially', () => {
    const { result } = renderHook(() => useModalState());
    expect(result.current.isModalVisible).toBe(false); // Initial

    act(() => result.current.openModal());
    expect(result.current.isModalVisible).toBe(true); // After open

    act(() => result.current.closeModal());
    expect(result.current.isModalVisible).toBe(false); // After close

    act(() => result.current.openModal());
    expect(result.current.isModalVisible).toBe(true); // After re-open
  });
});
