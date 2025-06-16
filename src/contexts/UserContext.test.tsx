// src/contexts/UserContext.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { UserProvider, useUserContext, User, UserContextType } from './UserContext';
import type { Kid, KanbanColumnConfig } from '../types';
import React, { ReactNode } from 'react';
import { describe, it, test, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

const localStorageMockFactory = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
  };
};
let localStorageMock = localStorageMockFactory();

const wrapper = ({ children }: { children: ReactNode }) => (
  <UserProvider>{children}</UserProvider>
);

const newKidData: Omit<Kid, 'id' | 'kanbanColumnConfigs' | 'totalFunds'> & { totalFunds?: number } = {
    name: 'Test New Kid',
    age: 8,
    avatarFilename: 'avatar.png',
};

describe('UserContext', () => {
  let initialUserKidCount = 0; // Will be set in beforeEach based on UserProvider's default

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock, writable: true, configurable: true
    });
    localStorageMock.getItem.mockReturnValue(null); // Ensures UserProvider uses its internal default user

    // Determine initial kid count from a fresh render
    const { result: tempResult } = renderHook(() => useUserContext(), { wrapper });
    initialUserKidCount = tempResult.current.user?.kids.length || 0;
  });

  describe('Kid Management', () => {
    test('initializes with a default user containing kids if localStorage is empty', () => {
      const { result } = renderHook(() => useUserContext(), { wrapper });
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.kids.length).toBe(initialUserKidCount); // Should be 2 from internal default
      // Default kids from UserProvider's internal setup do not get default configs via the useEffect
      // that looks for `storedUser`. They start with empty kanbanColumnConfigs.
      if (initialUserKidCount > 0 && result.current.user?.kids[0]) {
         const firstDefaultKidConfigs = result.current.getKanbanColumnConfigs(result.current.user.kids[0].id);
         expect(firstDefaultKidConfigs).toEqual([]);
      }
    });

    test('addKid adds a new kid with default Kanban column configurations', () => {
      const { result } = renderHook(() => useUserContext(), { wrapper });
      act(() => { result.current.addKid(newKidData); });

      const kids = result.current.user!.kids;
      expect(kids).toHaveLength(initialUserKidCount + 1);
      const addedKid = kids[initialUserKidCount]; // The newly added kid

      expect(addedKid.name).toBe(newKidData.name);
      expect(addedKid.kanbanColumnConfigs).toBeDefined();
      expect(addedKid.kanbanColumnConfigs).toHaveLength(3);
      const defaultTitles = ['To Do', 'In Progress', 'Done'];
      const defaultColors = ['#FFFFFF', '#FFFFE0', '#90EE90'];
      addedKid.kanbanColumnConfigs?.forEach((config, index) => {
        expect(config.title).toBe(defaultTitles[index]);
        expect(config.color).toBe(defaultColors[index]);
        expect(config.order).toBe(index);
        expect(config.kidId).toBe(addedKid.id);
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('userData', JSON.stringify(result.current.user));
    });
  });

  describe('Kanban Column Config Management', () => {
    let hookResult: { result: { current: UserContextType }, rerender: (props?: any) => void };
    let newKidId: string;

    beforeEach(async () => {
      const { result, rerender } = renderHook(() => useUserContext(), { wrapper });
      hookResult = { result, rerender };

      const initialKidCount = hookResult.result.current.user?.kids.length || 0;
      const existingKidIds = new Set(hookResult.result.current.user?.kids.map(k => k.id));

      act(() => {
        // Call addKid, we will get the ID from the state change, not its direct return value here
        hookResult.result.current.addKid({ name: 'ConfigTestKid', age: 5 });
      });

      // After act, the state should be updated. Now find the new kid.
      const updatedKids = hookResult.result.current.user?.kids;
      expect(updatedKids?.length).toBe(initialKidCount + 1); // Verify a kid was added

      // Find the kid that was not in existingKidIds
      const newlyAddedKid = updatedKids?.find(k => !existingKidIds.has(k.id));

      if (!newlyAddedKid) {
        throw new Error("Newly added kid 'ConfigTestKid' not found in state after addKid by ID diff.");
      }
      newKidId = newlyAddedKid.id;

      if (!newKidId) { // Should be redundant now but good for sanity
        throw new Error("Failed to obtain newKidId after addKid call.");
      }

      // Wait for the state update from addKid to be processed and default columns to be available
      await waitFor(() => {
        const kid = hookResult.result.current.user?.kids.find(k => k.id === newKidId);
        expect(kid).toBeDefined();
        // The default columns should be added directly by addKid
        const configs = hookResult.result.current.getKanbanColumnConfigs(newKidId);
        expect(configs?.length).toBe(3);
      });
    });

    test('getKanbanColumnConfigs returns 3 default sorted columns for a newly added kid', async () => {
      // newKidId is already added and state confirmed in beforeEach's waitFor
      const configs = hookResult.result.current.getKanbanColumnConfigs(newKidId);
      expect(configs).toHaveLength(3);
      expect(configs[0].order).toBe(0);
      expect(configs[0].title).toBe('To Do');
      expect(configs[1].order).toBe(1);
      expect(configs[1].title).toBe('In Progress');
      expect(configs[2].order).toBe(2);
      expect(configs[2].title).toBe('Done');
    });

    test('getKanbanColumnConfigs returns empty array for non-existent kid', async () => {
      // This test should ideally run in a separate context or ensure newKidId is not from its own beforeEach
      // For now, just use hookResult from the shared context.
      expect(hookResult.result.current.getKanbanColumnConfigs('non_existent_kid_id')).toEqual([]);
    });

    test('addKanbanColumnConfig adds a new column to a kid (who already has defaults)', async () => {
      const newColumnTitle = 'Backlog';
      const newColumnColor = '#AABBCC';
      act(() => { hookResult.result.current.addKanbanColumnConfig(newKidId, newColumnTitle, newColumnColor); });

      await waitFor(() => {
        const kidConfigs = hookResult.result.current.getKanbanColumnConfigs(newKidId);
        expect(kidConfigs).toHaveLength(4); // 3 defaults + 1 new
        const newConfig = kidConfigs.find(c => c.title === newColumnTitle);
        expect(newConfig).toBeDefined();
        expect(newConfig?.order).toBe(3);
        expect(newConfig?.kidId).toBe(newKidId);
        expect(newConfig?.color).toBe(newColumnColor);
      });
    });

    test('updateKanbanColumnConfig updates a column title and color', async () => {
      let configs = hookResult.result.current.getKanbanColumnConfigs(newKidId);
      const firstConfig = configs[0];
      expect(firstConfig).toBeDefined();

      const updatedTitle = 'Updated To Do';
      const updatedColor = '#FFCCDD';
      // Ensure kidId is correctly passed if it's part of the KanbanColumnConfig type for updates
      const updatedConfigData: KanbanColumnConfig = { ...firstConfig, kidId: newKidId, title: updatedTitle, color: updatedColor };

      act(() => { hookResult.result.current.updateKanbanColumnConfig(updatedConfigData); });

      await waitFor(() => {
        const updatedConfigs = hookResult.result.current.getKanbanColumnConfigs(newKidId);
        const refetchedConfig = updatedConfigs.find(c => c.id === firstConfig.id);
        expect(refetchedConfig?.title).toBe(updatedTitle);
        expect(refetchedConfig?.color).toBe(updatedColor);
        expect(refetchedConfig?.updatedAt).not.toBe(firstConfig.updatedAt);
      });
    });

    test('deleteKanbanColumnConfig removes a column and re-calculates order', async () => {
      let configs = hookResult.result.current.getKanbanColumnConfigs(newKidId);
      const configToDelete = configs[1];
      expect(configToDelete).toBeDefined();

      act(() => { hookResult.result.current.deleteKanbanColumnConfig(newKidId, configToDelete.id); });

      await waitFor(() => {
        const finalConfigs = hookResult.result.current.getKanbanColumnConfigs(newKidId);
        expect(finalConfigs).toHaveLength(2);
        expect(finalConfigs.find(c => c.id === configToDelete.id)).toBeUndefined();
        expect(finalConfigs[0].title).toBe('To Do');
        expect(finalConfigs[0].order).toBe(0);
        expect(finalConfigs[1].title).toBe('Done');
        expect(finalConfigs[1].order).toBe(1);
      });
    });

    test('reorderKanbanColumnConfigs updates column orders', async () => {
      let originalConfigs = hookResult.result.current.getKanbanColumnConfigs(newKidId);
      const reorderedState: KanbanColumnConfig[] = [
        originalConfigs.find(c => c.title === 'Done')!,
        originalConfigs.find(c => c.title === 'To Do')!,
        originalConfigs.find(c => c.title === 'In Progress')!,
      ].filter(Boolean) as KanbanColumnConfig[]; // filter(Boolean) removes undefined if find fails
      expect(reorderedState.length).toBe(3); // Ensure all configs were found

      act(() => { hookResult.result.current.reorderKanbanColumnConfigs(newKidId, reorderedState); });

      await waitFor(() => {
        const finalConfigs = hookResult.result.current.getKanbanColumnConfigs(newKidId);
        expect(finalConfigs[0].title).toBe('Done');
        expect(finalConfigs[0].order).toBe(0);
        expect(finalConfigs[1].title).toBe('To Do');
      expect(finalConfigs[1].order).toBe(1);
      expect(finalConfigs[2].title).toBe('In Progress');
      expect(finalConfigs[2].order).toBe(2);
      });
    });
  });

  describe('UserContext - Persisted Data', () => {
    test('loads persisted user data, including kanbanColumnConfigs for kids, and applies defaults for kids without configs', () => {
      const kidWithPersistedConfigs: Kid = {
        id: 'kidPersisted', name: 'Persisted Kid',
        kanbanColumnConfigs: [
          { id: 'pcfg1', kidId: 'kidPersisted', title: 'Persisted Custom 1', order: 0, color: '#111', createdAt: 't1', updatedAt: 't1' },
        ],
        totalFunds: 100, avatarFilename: 'avatarP.png'
      };
      const kidWithoutPersistedConfigs: Kid = {
        id: 'kidDefaulted', name: 'Defaulted Kid',
        kanbanColumnConfigs: [], // Empty, UserProvider useEffect should populate defaults for this *stored* kid
        totalFunds: 50, avatarFilename: 'avatarD.png'
      };
      const persistedUser: User = {
        id: 'userPersisted', username: 'Persisted User', email: 'p@example.com',
        kids: [kidWithPersistedConfigs, kidWithoutPersistedConfigs]
      };
      localStorageMock.getItem.mockImplementation((key: string) => {
          if (key === 'userData') return JSON.stringify(persistedUser);
          return null;
      });

      const { result } = renderHook(() => useUserContext(), { wrapper });

      const loadedKid1Configs = result.current.getKanbanColumnConfigs('kidPersisted');
      expect(loadedKid1Configs).toHaveLength(1); // Only the persisted one
      expect(loadedKid1Configs[0].title).toBe('Persisted Custom 1');

      const loadedKid2Configs = result.current.getKanbanColumnConfigs('kidDefaulted');
      expect(loadedKid2Configs).toHaveLength(3); // Should get default "To Do", "In Progress", "Done"
      expect(loadedKid2Configs[0].title).toBe('To Do');
      expect(loadedKid2Configs[0].color).toBe('#FFFFFF');
    });
  });
});
