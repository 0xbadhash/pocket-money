// src/contexts/UserContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import { UserProvider, useUserContext, User } from './UserContext';
import type { Kid, KanbanColumnConfig } from '../types';
import React, { ReactNode } from 'react';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMockFactory = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    getStore: () => store,
  };
};
let localStorageMock = localStorageMockFactory();

const wrapper = ({ children }: { children: ReactNode }) => (
  <UserProvider>{children}</UserProvider>
);

const initialKidData: Omit<Kid, 'id' | 'kanbanColumnConfigs' | 'totalFunds'> & { totalFunds?: number } = {
    name: 'Test Kid',
    age: 8,
    avatarFilename: 'avatar.png',
};


describe('UserContext - Kanban Column Config Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    // Always return null for userData to start with no kids
    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'userData') return null;
        return null;
    });
  });

  test('addKid creates default Kanban column configurations for the new kid and persists', () => {
    const { result } = renderHook(() => useUserContext(), { wrapper });

    act(() => {
      result.current.addKid(initialKidData);
    });

    const userWithNewKid = result.current.user;
    expect(userWithNewKid?.kids).toHaveLength(1); // Assuming defaultUser in context starts with 0 kids or is null
    const newKid = userWithNewKid?.kids[0];
    expect(newKid?.kanbanColumnConfigs).toBeDefined();
    expect(newKid?.kanbanColumnConfigs).toHaveLength(3);

    const defaultTitles = ['To Do', 'In Progress', 'Done'];
    newKid?.kanbanColumnConfigs?.forEach((config, index) => {
      expect(config.title).toBe(defaultTitles[index]);
      expect(config.order).toBe(index);
      expect(config.kidId).toBe(newKid.id);
      expect(config.createdAt).toBeDefined();
      expect(config.updatedAt).toBeDefined();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('userData', JSON.stringify(userWithNewKid));
  });

  test('addKanbanColumnConfig adds a new column and persists', () => {
    const { result } = renderHook(() => useUserContext(), { wrapper });
    let kidId: string;

    act(() => {
      result.current.addKid({ name: 'Kid For Columns' }); // Add a kid first
      kidId = result.current.user?.kids[0].id as string;
    });

    const newColumnTitle = 'Backlog';
    act(() => {
      result.current.addKanbanColumnConfig(kidId, newColumnTitle);
    });

    const kidConfigs = result.current.getKanbanColumnConfigs(kidId);
    // Default 3 + 1 new = 4
    expect(kidConfigs).toHaveLength(4);
    const newConfig = kidConfigs.find(c => c.title === newColumnTitle);
    expect(newConfig).toBeDefined();
    expect(newConfig?.order).toBe(3); // Appended to the end of defaults
    expect(newConfig?.kidId).toBe(kidId);
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(3); // Initial User, Add Kid, Add Column Config
  });

  test('getKanbanColumnConfigs returns sorted columns or empty array', () => {
    const { result } = renderHook(() => useUserContext(), { wrapper });
    let kidId: string;

    act(() => {
      result.current.addKid({ name: 'Sortable Kid' });
      kidId = result.current.user?.kids[0].id as string;
    });

    // Defaults are already sorted by order 0, 1, 2
    let configs = result.current.getKanbanColumnConfigs(kidId);
    expect(configs).toHaveLength(3);
    expect(configs[0].order).toBe(0);
    expect(configs[1].order).toBe(1);
    expect(configs[2].order).toBe(2);

    // Test with an unsorted list internally (if possible, or rely on reorder test)
    // For now, we trust the sort in getKanbanColumnConfigs.

    expect(result.current.getKanbanColumnConfigs('non_existent_kid')).toEqual([]);
  });

  test('updateKanbanColumnConfig updates a column title and persists', () => {
    const { result } = renderHook(() => useUserContext(), { wrapper });
    let kidId: string;
    act(() => {
      result.current.addKid({ name: 'Editable Kid' });
      kidId = result.current.user?.kids[0].id as string;
    });

    let configs = result.current.getKanbanColumnConfigs(kidId);
    const firstConfig = configs[0];
    const updatedTitle = 'Updated To Do';
    const updatedConfigData: KanbanColumnConfig = { ...firstConfig, title: updatedTitle };

    act(() => {
      result.current.updateKanbanColumnConfig(updatedConfigData);
    });

    configs = result.current.getKanbanColumnConfigs(kidId);
    const refetchedConfig = configs.find(c => c.id === firstConfig.id);
    expect(refetchedConfig?.title).toBe(updatedTitle);
    expect(refetchedConfig?.updatedAt).not.toBe(firstConfig.updatedAt);
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(3);
  });

  test('deleteKanbanColumnConfig removes a column, re-calculates order, and persists', () => {
    const { result } = renderHook(() => useUserContext(), { wrapper });
    let kidId: string;
    act(() => {
      result.current.addKid({ name: 'Deletable Kid' });
      kidId = result.current.user?.kids[0].id as string;
    }); // Kid has 3 default columns

    let configs = result.current.getKanbanColumnConfigs(kidId);
    const configToDelete = configs[1]; // "In Progress", order 1

    act(() => {
      result.current.deleteKanbanColumnConfig(kidId, configToDelete.id);
    });

    configs = result.current.getKanbanColumnConfigs(kidId);
    expect(configs).toHaveLength(2);
    expect(configs.find(c => c.id === configToDelete.id)).toBeUndefined();
    expect(configs[0].title).toBe('To Do');
    expect(configs[0].order).toBe(0);
    expect(configs[1].title).toBe('Done');
    expect(configs[1].order).toBe(1); // Order recalculated
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(3);
  });

  test('reorderKanbanColumnConfigs updates column orders and persists', () => {
    const { result } = renderHook(() => useUserContext(), { wrapper });
    let kidId: string;
    act(() => {
      result.current.addKid({ name: 'Reorderable Kid' });
      kidId = result.current.user?.kids[0].id as string;
    }); // Kid has "To Do"(0), "In Progress"(1), "Done"(2)

    let originalConfigs = result.current.getKanbanColumnConfigs(kidId);

    // New desired visual order: Done, To Do, In Progress
    const reorderedInitialState: KanbanColumnConfig[] = [
        originalConfigs.find(c => c.title === 'Done')!,
        originalConfigs.find(c => c.title === 'To Do')!,
        originalConfigs.find(c => c.title === 'In Progress')!,
    ];

    // The function expects `orderedConfigs` to be the full list for the kid,
    // and it will re-assign the .order property based on the new array indices.
    act(() => {
      result.current.reorderKanbanColumnConfigs(kidId, reorderedInitialState);
    });

    const finalConfigs = result.current.getKanbanColumnConfigs(kidId);
    expect(finalConfigs).toHaveLength(3);
    expect(finalConfigs[0].title).toBe('Done');
    expect(finalConfigs[0].order).toBe(0);
    expect(finalConfigs[1].title).toBe('To Do');
    expect(finalConfigs[1].order).toBe(1);
    expect(finalConfigs[2].title).toBe('In Progress');
    expect(finalConfigs[2].order).toBe(2);
    expect(finalConfigs[0].updatedAt).not.toBe(originalConfigs.find(c=>c.id === finalConfigs[0].id)?.updatedAt);
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(3);
  });

  test('loads persisted kanbanColumnConfigs for a kid on init', () => {
    const kidWithConfigs: Kid = {
      id: 'kidWithSettings', name: 'Persisted Kid', kanbanColumnConfigs: [
        { id: 'cfg1', kidId: 'kidWithSettings', title: 'Custom Col 1', order: 0, createdAt: 'sometime', updatedAt: 'sometime' },
        { id: 'cfg2', kidId: 'kidWithSettings', title: 'Custom Col 2', order: 1, createdAt: 'sometime', updatedAt: 'sometime' },
      ], totalFunds: 0, avatarFilename: ''
    };
    const persistedUser: User = {
      id: 'userPersisted', username: 'Persisted User', email: 'p@example.com', kids: [kidWithConfigs]
    };
    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'userData') return JSON.stringify(persistedUser);
        return null;
    });

    const { result } = renderHook(() => useUserContext(), { wrapper });

    const loadedConfigs = result.current.getKanbanColumnConfigs('kidWithSettings');
    expect(loadedConfigs).toHaveLength(2);
    expect(loadedConfigs[0].title).toBe('Custom Col 1');
    expect(loadedConfigs[1].title).toBe('Custom Col 2');
  });

});
