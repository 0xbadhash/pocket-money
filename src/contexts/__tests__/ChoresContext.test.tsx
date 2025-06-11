// src/contexts/__tests__/ChoresContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ChoresContext, ChoresContextType, useChoresContext } from '../ChoresContext';
import { FinancialContext, FinancialContextType } from '../FinancialContext';
import { UserContext, UserContextType } from '../UserContext';
import { vi } from 'vitest'; // Import vi

// Import the module containing generateChoreInstances to mock it
import * as choreUtils from '../../utils/choreUtils'; // Assuming generateChoreInstances is in choreUtils.ts

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock FinancialContext and UserContext
const mockAddFunds = vi.fn();
const mockAddTransaction = vi.fn();
const mockAddKidReward = vi.fn();

const mockFinancialContextValue: FinancialContextType = {
  financialData: { currentBalance: 0, transactions: [] },
  addFunds: mockAddFunds,
  addTransaction: mockAddTransaction,
  addKidReward: mockAddKidReward,
};

const mockUserContextValue: UserContextType = {
  user: { name: 'Test User', email: 'test@example.com', kids: [{ id: 'kid1', name: 'Kid One', age: 8 }] },
  loading: false,
};

// Mock the generateChoreInstances function using vi.mock
vi.mock('../../utils/choreUtils', () => ({
  generateChoreInstances: vi.fn(() => []), // Default mock implementation
}));

// Cast to a MockedFunction for easier assertion
const generateChoreInstances = choreUtils.generateChoreInstances as ReturnType<typeof vi.fn>;


describe('ChoresContext', () => {
  let capturedContextState: ChoresContextType | null = null;

  beforeEach(() => {
    localStorageMock.clear();
    mockAddFunds.mockClear();
    mockAddTransaction.mockClear();
    mockAddKidReward.mockClear();
    capturedContextState = null;
    generateChoreInstances.mockClear(); // Clear the Vitest mock
    vi.spyOn(console, 'warn').mockImplementation(() => {}); // Mock console.warn for warnings
  });

  afterEach(() => {
    (console.warn as ReturnType<typeof vi.fn>).mockRestore(); // Restore console.warn
  });

  const renderChoresContextHook = () => {
    return renderHook(() => useChoresContext(), {
      wrapper: ({ children }) => (
        <UserContext.Provider value={mockUserContextValue}>
          <FinancialContext.Provider value={mockFinancialContextValue}>
            <ChoresContext.Provider value={{} as ChoresContextType}> {/* Provide a dummy value, the hook will provide the real one */}
              {children}
            </ChoresContext.Provider>
          </FinancialContext.Provider>
        </UserContext.Provider>
      ),
    });
  };

  it('initializes with default chore definitions and empty instances, or loads from localStorage', () => {
    const { result } = renderChoresContextHook();

    // Verify initial state
    expect(result.current.choreDefinitions).toEqual([]);
    expect(result.current.choreInstances).toEqual([]);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('choreDefinitions');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('choreInstances');
  });

  describe('addChoreDefinition', () => {
    it('should add a new chore definition to the state', () => {
      const { result } = renderChoresContextHook();
      act(() => {
        result.current.addChoreDefinition({ title: 'New Chore' });
      });
      expect(result.current.choreDefinitions.length).toBe(1);
      expect(result.current.choreDefinitions[0].title).toBe('New Chore');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'choreDefinitions',
        expect.any(String)
      );
      expect(generateChoreInstances).toHaveBeenCalled(); // Should trigger instance generation
    });

    it('should correctly add a chore definition with optional fields (description, tags, subTasks)', () => {
      const { result } = renderChoresContextHook();
      const subTasks = [{ title: 'Subtask 1', isComplete: false }];
      act(() => {
        result.current.addChoreDefinition({
          title: 'Complex Chore',
          description: 'A detailed chore',
          tags: ['home', 'daily'],
          subTasks: subTasks,
        });
      });

      expect(result.current.choreDefinitions.length).toBe(1);
      const addedChore = result.current.choreDefinitions[0];
      expect(addedChore.title).toBe('Complex Chore');
      expect(addedChore.description).toBe('A detailed chore');
      expect(addedChore.tags).toEqual(['home', 'daily']);
      expect(addedChore.subTasks).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Subtask 1', isComplete: false })]));
    });
  });

  describe('toggleChoreInstanceComplete', () => {
    const mockChoreDefinition = {
      id: 'choreDef1',
      title: 'Test Chore',
      rewardAmount: 5,
      assignedKidId: 'kid1',
      subTasks: []
    };
    const mockChoreInstance = {
      id: 'instance1',
      choreDefinitionId: 'choreDef1',
      isComplete: false,
      dueDate: '2024-07-01',
    };

    beforeEach(() => {
      localStorageMock.setItem('choreDefinitions', JSON.stringify([mockChoreDefinition]));
      localStorageMock.setItem('choreInstances', JSON.stringify([mockChoreInstance]));
    });

    it('should toggle an instance to complete and call addKidReward if applicable', () => {
      const { result } = renderChoresContextHook();
      act(() => {
        result.current.toggleChoreInstanceComplete('instance1', true);
      });
      const updatedInstance = result.current.choreInstances.find(i => i.id === 'instance1');
      expect(updatedInstance?.isComplete).toBe(true);
      expect(mockAddKidReward).toHaveBeenCalledWith('kid1', 5, 'Chore Reward: Test Chore');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('choreInstances', expect.any(String));
    });

    it('should toggle an instance to incomplete and not call addKidReward if it was already complete', () => {
      const completeInstance = { ...mockChoreInstance, isComplete: true };
      localStorageMock.setItem('choreInstances', JSON.stringify([completeInstance]));
      const { result } = renderChoresContextHook();
      act(() => {
        mockAddKidReward.mockClear(); // Clear before calling toggle to ensure it's not called again
        result.current.toggleChoreInstanceComplete('instance1', false);
      });
      const updatedInstance = result.current.choreInstances.find(i => i.id === 'instance1');
      expect(updatedInstance?.isComplete).toBe(false);
      expect(mockAddKidReward).not.toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('choreInstances', expect.any(String));
    });

    it('should not call addKidReward if rewardAmount is 0 or undefined', () => {
      const choreDefNoReward = { ...mockChoreDefinition, rewardAmount: 0 };
      localStorageMock.setItem('choreDefinitions', JSON.stringify([choreDefNoReward]));
      const { result } = renderChoresContextHook();
      act(() => {
        result.current.toggleChoreInstanceComplete('instance1', true);
      });
      expect(mockAddKidReward).not.toHaveBeenCalled();

      const choreDefUndefinedReward = { ...mockChoreDefinition, rewardAmount: undefined };
      localStorageMock.setItem('choreDefinitions', JSON.stringify([choreDefUndefinedReward]));
      act(() => {
        mockAddKidReward.mockClear();
        result.current.toggleChoreInstanceComplete('instance1', true);
      });
      expect(mockAddKidReward).not.toHaveBeenCalled();
    });

    it('should not call addKidReward if assignedKidId is undefined', () => {
      const choreDefUnassigned = { ...mockChoreDefinition, assignedKidId: undefined };
      localStorageMock.setItem('choreDefinitions', JSON.stringify([choreDefUnassigned]));
      const { result } = renderChoresContextHook();
      act(() => {
        result.current.toggleChoreInstanceComplete('instance1', true);
      });
      expect(mockAddKidReward).not.toHaveBeenCalled();
    });

    it('should log a warning if instanceId is not found', () => {
      const { result } = renderChoresContextHook();
      act(() => {
        result.current.toggleChoreInstanceComplete('nonExistentInstance', true);
      });
      expect(result.current.choreInstances).toEqual([mockChoreInstance]); // State remains unchanged
      expect(console.warn).toHaveBeenCalledWith('Chore instance with ID nonExistentInstance not found.');
    });
  });

  describe('generateInstancesForPeriod', () => {
    it('should call choreUtils.generateChoreInstances and update choreInstances state', () => {
      const mockGenerated = [{ id: 'newInst1' }, { id: 'newInst2' }] as any;
      generateChoreInstances.mockReturnValue(mockGenerated); // Set mock return value
      const { result } = renderChoresContextHook();
      act(() => {
        result.current.generateInstancesForPeriod('2024-07-01', '2024-07-31');
      });
      expect(generateChoreInstances).toHaveBeenCalledWith(
        result.current.choreDefinitions,
        '2024-07-01',
        '2024-07-31',
        [] // Initial existing instances
      );
      expect(result.current.choreInstances).toEqual(mockGenerated);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('choreInstances', expect.any(String));
    });

    it('should preserve completion status of existing instances when regenerating for the same period', () => {
      const existingCompletedInstance = {
        id: 'existingInst1',
        choreDefinitionId: 'def1',
        isComplete: true,
        dueDate: '2024-07-10'
      };
      const existingIncompleteInstance = {
        id: 'existingInst2',
        choreDefinitionId: 'def2',
        isComplete: false,
        dueDate: '2024-07-15'
      };
      const newGeneratedInstance = {
        id: 'existingInst1', // Same ID as an existing one
        choreDefinitionId: 'def1',
        isComplete: false, // New generation might set it false
        dueDate: '2024-07-10'
      };
      const newGeneratedInstance2 = {
        id: 'newlyGeneratedInst',
        choreDefinitionId: 'def3',
        isComplete: false,
        dueDate: '2024-07-20'
      };

      localStorageMock.setItem('choreInstances', JSON.stringify([existingCompletedInstance, existingIncompleteInstance]));
      generateChoreInstances.mockReturnValue([newGeneratedInstance, newGeneratedInstance2]);

      const { result } = renderChoresContextHook();
      act(() => {
        result.current.generateInstancesForPeriod('2024-07-01', '2024-07-31');
      });

      expect(generateChoreInstances).toHaveBeenCalledWith(
        result.current.choreDefinitions,
        '2024-07-01',
        '2024-07-31',
        [existingCompletedInstance, existingIncompleteInstance] // Should pass existing instances
      );
      // Verify that the completion status of the existing instance is preserved
      const updatedCompletedInstance = result.current.choreInstances.find(i => i.id === 'existingInst1');
      expect(updatedCompletedInstance?.isComplete).toBe(true);
      const newlyAddedInstance = result.current.choreInstances.find(i => i.id === 'newlyGeneratedInst');
      expect(newlyAddedInstance).toBeDefined();
      expect(result.current.choreInstances.length).toBe(2); // Should only have 2 instances now
    });

    it('should filter out old instances not in the new generation period but keep those outside it', () => {
      const oldInstanceOutOfPeriod = { id: 'oldInst1', choreDefinitionId: 'def1', isComplete: false, dueDate: '2024-06-01' }; // Outside current period
      const oldInstanceInPeriod = { id: 'oldInst2', choreDefinitionId: 'def2', isComplete: false, dueDate: '2024-07-15' }; // Within new period
      const newInstance = { id: 'newInst1', choreDefinitionId: 'def3', isComplete: false, dueDate: '2024-07-20' };

      localStorageMock.setItem('choreInstances', JSON.stringify([oldInstanceOutOfPeriod, oldInstanceInPeriod]));
      generateChoreInstances.mockReturnValue([newInstance]); // Only newInstance is generated for the period

      const { result } = renderChoresContextHook();
      act(() => {
        result.current.generateInstancesForPeriod('2024-07-01', '2024-07-31');
      });

      // It should keep oldInstanceOutOfPeriod and add newInstance
      expect(result.current.choreInstances.length).toBe(2);
      expect(result.current.choreInstances).toEqual(
        expect.arrayContaining([
          expect.objectContaining(oldInstanceOutOfPeriod),
          expect.objectContaining(newInstance)
        ])
      );
      // oldInstanceInPeriod should be replaced or filtered out by the new generation if its ID isn't in newInstance
      expect(result.current.choreInstances).not.toEqual(expect.arrayContaining([expect.objectContaining(oldInstanceInPeriod)]));
      expect(generateChoreInstances).toHaveBeenCalledWith(
        result.current.choreDefinitions,
        '2024-07-01',
        '2024-07-31',
        [oldInstanceOutOfPeriod, oldInstanceInPeriod] // All existing instances are passed
      );
    });
  });

  describe('toggleSubTaskComplete', () => {
    const initialChoreDef = {
      id: 'choreDef1',
      title: 'Chore with Subtasks',
      subTasks: [
        { id: 'subtask1', title: 'Subtask A', isComplete: false },
        { id: 'subtask2', title: 'Subtask B', isComplete: false },
      ],
    };

    beforeEach(() => {
      localStorageMock.setItem('choreDefinitions', JSON.stringify([initialChoreDef]));
    });

    it('should toggle the completion status of a specified sub-task', () => {
      const { result } = renderChoresContextHook();
      act(() => {
        result.current.toggleSubTaskComplete('choreDef1', 'subtask1');
      });

      const updatedChore = result.current.choreDefinitions.find(c => c.id === 'choreDef1');
      expect(updatedChore?.subTasks[0].isComplete).toBe(true);
      expect(updatedChore?.subTasks[1].isComplete).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('choreDefinitions', expect.any(String));
    });

    it('should not affect other sub-tasks or chore definitions', () => {
      const otherChoreDef = { id: 'choreDef2', title: 'Other Chore', subTasks: [{ id: 'subtask3', title: 'Subtask C', isComplete: false }] };
      localStorageMock.setItem('choreDefinitions', JSON.stringify([initialChoreDef, otherChoreDef]));

      const { result } = renderChoresContextHook();
      act(() => {
        result.current.toggleSubTaskComplete('choreDef1', 'subtask1');
      });

      const updatedChore1 = result.current.choreDefinitions.find(c => c.id === 'choreDef1');
      const updatedChore2 = result.current.choreDefinitions.find(c => c.id === 'choreDef2');

      expect(updatedChore1?.subTasks[0].isComplete).toBe(true);
      expect(updatedChore2?.subTasks[0].isComplete).toBe(false); // Should remain unchanged
    });

    it('should do nothing if chore definition or sub-task ID is not found', () => {
      const { result } = renderChoresContextHook();
      const initialDefinitions = JSON.parse(localStorageMock.getItem('choreDefinitions') || '[]');

      act(() => {
        result.current.toggleSubTaskComplete('nonExistentChore', 'subtask1');
      });
      expect(result.current.choreDefinitions).toEqual(initialDefinitions); // State should not change
      expect(console.warn).toHaveBeenCalledWith('Chore definition with ID nonExistentChore not found.');

      act(() => {
        result.current.toggleSubTaskComplete('choreDef1', 'nonExistentSubtask');
      });
      expect(result.current.choreDefinitions).toEqual(initialDefinitions); // State should not change
      expect(console.warn).toHaveBeenCalledWith('Sub-task with ID nonExistentSubtask not found for choreDef1.');
    });
  });

  describe('getChoreDefinitionsForKid', () => {
    const choreDef1 = { id: 'c1', title: 'Kid1 Chore', assignedKidId: 'kid1' };
    const choreDef2 = { id: 'c2', title: 'Kid2 Chore', assignedKidId: 'kid2' };
    const choreDef3 = { id: 'c3', title: 'Unassigned Chore', assignedKidId: undefined };

    beforeEach(() => {
      localStorageMock.setItem('choreDefinitions', JSON.stringify([choreDef1, choreDef2, choreDef3]));
    });

    it('should return only chore definitions assigned to the specified kidId', () => {
      const { result } = renderChoresContextHook();
      const kid1Chores = result.current.getChoreDefinitionsForKid('kid1');
      expect(kid1Chores).toEqual([expect.objectContaining({ id: 'c1' })]);

      const kid2Chores = result.current.getChoreDefinitionsForKid('kid2');
      expect(kid2Chores).toEqual([expect.objectContaining({ id: 'c2' })]);
    });

    it('should return an empty array if no chores are assigned to the kidId', () => {
      const { result } = renderChoresContextHook();
      const nonExistentKidChores = result.current.getChoreDefinitionsForKid('nonExistentKid');
      expect(nonExistentKidChores).toEqual([]);
    });

    it('should not include unassigned chores when a specific kidId is requested', () => {
      const { result } = renderChoresContextHook();
      const kid1Chores = result.current.getChoreDefinitionsForKid('kid1');
      expect(kid1Chores).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'c3' })]));
    });
  });
});