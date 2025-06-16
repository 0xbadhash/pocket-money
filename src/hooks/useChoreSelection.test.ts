import { describe, it, test, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChoreSelection } from './useChoreSelection';

describe('useChoreSelection Hook', () => {
  test('initializes with an empty array for selectedInstanceIds', () => {
    const { result } = renderHook(() => useChoreSelection());
    expect(result.current.selectedInstanceIds).toEqual([]);
  });

  describe('toggleSelection action', () => {
    test('adds an ID if it is not already selected and shouldBeSelected is true', () => {
      const { result } = renderHook(() => useChoreSelection());
      act(() => {
        result.current.toggleSelection('id1', true);
      });
      expect(result.current.selectedInstanceIds).toEqual(['id1']);
    });

    test('adds multiple IDs', () => {
      const { result } = renderHook(() => useChoreSelection());
      act(() => {
        result.current.toggleSelection('id1', true);
      });
      act(() => {
        result.current.toggleSelection('id2', true);
      });
      expect(result.current.selectedInstanceIds).toEqual(['id1', 'id2']);
    });

    test('removes an ID if it is selected and shouldBeSelected is false', () => {
      const { result } = renderHook(() => useChoreSelection());
      act(() => {
        result.current.toggleSelection('id1', true);
      });
      act(() => {
        result.current.toggleSelection('id2', true);
      });
      act(() => {
        result.current.toggleSelection('id1', false);
      });
      expect(result.current.selectedInstanceIds).toEqual(['id2']);
    });

    test('does not add an ID if it is already selected and shouldBeSelected is true', () => {
      const { result } = renderHook(() => useChoreSelection());
      act(() => {
        result.current.toggleSelection('id1', true);
      });
      act(() => {
        result.current.toggleSelection('id1', true); // Attempt to add again
      });
      expect(result.current.selectedInstanceIds).toEqual(['id1']);
    });

    test('does not remove an ID if it is not selected and shouldBeSelected is false', () => {
      const { result } = renderHook(() => useChoreSelection());
      act(() => {
        result.current.toggleSelection('id1', true);
      });
      act(() => {
        result.current.toggleSelection('id2', false); // Attempt to remove non-existent
      });
      expect(result.current.selectedInstanceIds).toEqual(['id1']);
    });

    test('handles toggling all items off', () => {
      const { result } = renderHook(() => useChoreSelection());
      act(() => result.current.toggleSelection('id1', true));
      act(() => result.current.toggleSelection('id2', true));
      act(() => result.current.toggleSelection('id1', false));
      act(() => result.current.toggleSelection('id2', false));
      expect(result.current.selectedInstanceIds).toEqual([]);
    });
  });

  describe('clearSelection action', () => {
    test('clears all selected IDs', () => {
      const { result } = renderHook(() => useChoreSelection());
      act(() => {
        result.current.toggleSelection('id1', true);
      });
      act(() => {
        result.current.toggleSelection('id2', true);
      });
      expect(result.current.selectedInstanceIds).toEqual(['id1', 'id2']); // Pre-condition
      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedInstanceIds).toEqual([]);
    });

    test('does nothing if no IDs are selected', () => {
      const { result } = renderHook(() => useChoreSelection());
      expect(result.current.selectedInstanceIds).toEqual([]); // Pre-condition
      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedInstanceIds).toEqual([]);
    });
  });

  describe('setSelectedInstanceIds action', () => {
    test('directly sets the selectedInstanceIds array', () => {
      const { result } = renderHook(() => useChoreSelection());
      const newSelection = ['idA', 'idB', 'idC'];
      act(() => {
        result.current.setSelectedInstanceIds(newSelection);
      });
      expect(result.current.selectedInstanceIds).toEqual(newSelection);
      // Ensure it's a new array reference for immutability if that's important, though not explicitly tested here
      // expect(result.current.selectedInstanceIds).not.toBe(newSelection); // This would fail if not cloned
    });

    test('can set to an empty array', () => {
      const { result } = renderHook(() => useChoreSelection());
      // First, add some items
      act(() => {
        result.current.toggleSelection('id1', true);
      });
      expect(result.current.selectedInstanceIds).toEqual(['id1']);

      // Then set to empty
      act(() => {
        result.current.setSelectedInstanceIds([]);
      });
      expect(result.current.selectedInstanceIds).toEqual([]);
    });
  });
});
