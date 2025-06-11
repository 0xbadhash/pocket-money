import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ChoresProvider, useChoresContext } from '../ChoresContext'; // Import ChoresProvider
import { FinancialContext, FinancialContextType } from '../FinancialContext';
import { UserContext, UserContextType } from '../UserContext';
import { vi } from 'vitest';
import type { ChoreDefinition, ChoreInstance, SubTask } from '../../types';
import * as choreUtils from '../../utils/choreUtils';

// Constants for localStorage keys from ChoresContext
const CHORE_DEFINITIONS_STORAGE_KEY = 'familyTaskManagerChoreDefinitions';
const CHORE_INSTANCES_STORAGE_KEY = 'familyTaskManagerChoreInstances';

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
const mockAddKidReward = vi.fn();
const mockFinancialContextValue: FinancialContextType = {
  financialData: { currentBalance: 0, transactions: [] },
  addFunds: vi.fn(),
  addTransaction: vi.fn(),
  addKidReward: mockAddKidReward,
};

const mockUserContextValue: UserContextType = {
  user: { name: 'Test User', email: 'test@example.com', kids: [{ id: 'kid1', name: 'Kid One', age: 8 }] },
  loading: false,
};

// Mock the generateChoreInstances function
vi.mock('../../utils/choreUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof choreUtils>();
  return {
    ...actual, // Spread actual module to keep other exports if any
    generateChoreInstances: vi.fn(() => []), // Default mock implementation
  };
});

const generateChoreInstancesMock = choreUtils.generateChoreInstances as ReturnType<typeof vi.fn>;

describe('ChoresContext', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorageMock.clear();
    mockAddKidReward.mockClear();
    generateChoreInstancesMock.mockClear().mockReturnValue([]); // Reset and provide default mock
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  // Updated renderChoresContextHook to use the actual ChoresProvider
  const renderChoresContextHook = () => {
    return renderHook(() => useChoresContext(), {
      wrapper: ({ children }) => (
        <UserContext.Provider value={mockUserContextValue}>
          <FinancialContext.Provider value={mockFinancialContextValue}>
            <ChoresProvider>
              {children}
            </ChoresProvider>
          </FinancialContext.Provider>
        </UserContext.Provider>
      ),
    });
  };

  it('initializes with default chore definitions and empty instances when localStorage is empty', () => {
    const { result } = renderChoresContextHook();

    // Provider loads default definitions if localStorage is empty
    expect(result.current.choreDefinitions.length).toBe(5); // Assuming 5 default chores
    expect(result.current.choreDefinitions[0].title).toBe('Clean Room (Daily)'); // Check one default
    expect(result.current.choreInstances).toEqual([]);

    expect(localStorageMock.getItem).toHaveBeenCalledWith(CHORE_DEFINITIONS_STORAGE_KEY);
    expect(localStorageMock.getItem).toHaveBeenCalledWith(CHORE_INSTANCES_STORAGE_KEY);
  });

  describe('addChoreDefinition', () => {
    it('should add a new chore definition and save to localStorage', () => {
      const { result } = renderChoresContextHook();
      const initialDefCount = result.current.choreDefinitions.length;
      act(() => {
        result.current.addChoreDefinition({ title: 'New Chore', dueDate: '2024-01-01' });
      });
      expect(result.current.choreDefinitions.length).toBe(initialDefCount + 1);
      expect(result.current.choreDefinitions[0].title).toBe('New Chore'); // Prepends
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        CHORE_DEFINITIONS_STORAGE_KEY,
        expect.any(String)
      );
      // addChoreDefinition in the provider does not directly call generateChoreInstances
      expect(generateChoreInstancesMock).not.toHaveBeenCalled();
    });

    it('should correctly add a chore definition with optional fields (description, tags, subTasks with IDs)', () => {
      const { result } = renderChoresContextHook();
      const subTasks: SubTask[] = [{ id: 'st1', title: 'Subtask 1', isComplete: false }];
      act(() => {
        result.current.addChoreDefinition({
          title: 'Complex Chore',
          description: 'A detailed chore',
          dueDate: '2024-01-02',
          tags: ['home', 'daily'],
          subTasks: subTasks,
        });
      });

      const addedChore = result.current.choreDefinitions[0]; // Prepends
      expect(addedChore.title).toBe('Complex Chore');
      expect(addedChore.description).toBe('A detailed chore');
      expect(addedChore.tags).toEqual(['home', 'daily']);
      expect(addedChore.subTasks).toEqual(subTasks);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(CHORE_DEFINITIONS_STORAGE_KEY, expect.any(String));
    });
  });

  describe('toggleChoreInstanceComplete', () => {
    const mockChoreDefinition: ChoreDefinition = {
      id: 'choreDef1', title: 'Test Chore', rewardAmount: 5, assignedKidId: 'kid1',
      isComplete: false, dueDate: '2024-01-01' // Added required fields
    };
    const mockChoreInstance: ChoreInstance = {
      id: 'instance1', choreDefinitionId: 'choreDef1', isComplete: false, instanceDate: '2024-07-01',
      title: 'Test Chore', // Added required title
    };

    beforeEach(() => {
      // Set initial state for definitions and instances directly in the hook's scope
      // This simulates the provider loading them.
      localStorageMock.setItem(CHORE_DEFINITIONS_STORAGE_KEY, JSON.stringify([mockChoreDefinition]));
      localStorageMock.setItem(CHORE_INSTANCES_STORAGE_KEY, JSON.stringify([mockChoreInstance]));
    });

    it('should toggle an instance to complete and call addKidReward with correct description', () => {
      const { result, rerender } = renderChoresContextHook();
       // Ensure initial state is loaded
      expect(result.current.choreInstances.find(i => i.id === 'instance1')?.isComplete).toBe(false);

      act(() => {
        result.current.toggleChoreInstanceComplete('instance1');
      });
      rerender(); // Rerender to get updated state from context

      const updatedInstance = result.current.choreInstances.find(i => i.id === 'instance1');
      expect(updatedInstance?.isComplete).toBe(true);
      expect(mockAddKidReward).toHaveBeenCalledWith('kid1', 5, `${mockChoreDefinition.title} (${mockChoreInstance.instanceDate})`);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(CHORE_INSTANCES_STORAGE_KEY, expect.any(String));
    });

    it('should toggle an instance to incomplete and not call addKidReward', () => {
      const initiallyCompleteInstance = { ...mockChoreInstance, isComplete: true };
      localStorageMock.setItem(CHORE_INSTANCES_STORAGE_KEY, JSON.stringify([initiallyCompleteInstance]));
      const { result, rerender } = renderChoresContextHook();
       expect(result.current.choreInstances.find(i => i.id === 'instance1')?.isComplete).toBe(true);


      act(() => {
        result.current.toggleChoreInstanceComplete('instance1');
      });
      rerender();

      const updatedInstance = result.current.choreInstances.find(i => i.id === 'instance1');
      expect(updatedInstance?.isComplete).toBe(false);
      expect(mockAddKidReward).not.toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(CHORE_INSTANCES_STORAGE_KEY, expect.any(String));
    });

    it('should not call addKidReward if rewardAmount is 0 or undefined', () => {
      const choreDefNoReward = { ...mockChoreDefinition, rewardAmount: 0 };
      localStorageMock.setItem(CHORE_DEFINITIONS_STORAGE_KEY, JSON.stringify([choreDefNoReward]));
      const { result } = renderChoresContextHook();
      act(() => {
        result.current.toggleChoreInstanceComplete('instance1');
      });
      expect(mockAddKidReward).not.toHaveBeenCalled();
    });


    it('should log a warning if instanceId is not found', () => {
      const { result } = renderChoresContextHook(); // mockChoreInstance is loaded via setup
      act(() => {
        result.current.toggleChoreInstanceComplete('nonExistentInstance');
      });
      // State should remain based on what was loaded via localStorage in beforeEach
      expect(result.current.choreInstances.find(i => i.id === 'instance1')).toBeDefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Chore instance with ID nonExistentInstance not found.');
    });
  });

  describe('generateInstancesForPeriod', () => {
    it('should call choreUtils.generateChoreInstances and update choreInstances state', () => {
      const mockGenerated: ChoreInstance[] = [{ id: 'newInst1', choreDefinitionId: 'def1', instanceDate: '2024-07-01', isComplete: false, title: 'New' }];
      generateChoreInstancesMock.mockReturnValue(mockGenerated);
      const { result } = renderChoresContextHook();
      const initialDefinitions = result.current.choreDefinitions; // Capture definitions used by provider

      act(() => {
        result.current.generateInstancesForPeriod('2024-07-01', '2024-07-31');
      });
      expect(generateChoreInstancesMock).toHaveBeenCalledWith(
        initialDefinitions, // Definitions from the provider's state
        '2024-07-01',
        '2024-07-31'
        // The utility function itself is not passed existing instances by the provider
      );
      expect(result.current.choreInstances).toEqual(mockGenerated); // Assumes no complex merging for this simple case
      expect(localStorageMock.setItem).toHaveBeenCalledWith(CHORE_INSTANCES_STORAGE_KEY, expect.any(String));
    });

    it('should preserve completion status of existing instances when regenerating', () => {
      const existingInstanceId = 'instMatched';
      const existingInstances: ChoreInstance[] = [
        { id: existingInstanceId, choreDefinitionId: 'def1', instanceDate: '2024-07-10', isComplete: true, title: 'Matched Old' },
        { id: 'instNotMatched', choreDefinitionId: 'def2', instanceDate: '2024-07-11', isComplete: false, title: 'Not Matched Old' },
      ];
      localStorageMock.setItem(CHORE_INSTANCES_STORAGE_KEY, JSON.stringify(existingInstances));

      const newGeneratedFromUtil: ChoreInstance[] = [
        { id: existingInstanceId, choreDefinitionId: 'def1', instanceDate: '2024-07-10', isComplete: false, title: 'Matched New' }, // Same ID, different completion
        { id: 'instNewlyGenerated', choreDefinitionId: 'def3', instanceDate: '2024-07-12', isComplete: false, title: 'Newly Made' },
      ];
      generateChoreInstancesMock.mockReturnValue(newGeneratedFromUtil);

      const { result } = renderChoresContextHook();
      const initialDefinitions = result.current.choreDefinitions; // Capture definitions

      act(() => {
        result.current.generateInstancesForPeriod('2024-07-01', '2024-07-31');
      });

      expect(generateChoreInstancesMock).toHaveBeenCalledWith(initialDefinitions, '2024-07-01', '2024-07-31');

      const finalInstances = result.current.choreInstances;
      const matchedInstance = finalInstances.find(i => i.id === existingInstanceId);
      expect(matchedInstance?.isComplete).toBe(true); // Completion preserved
      expect(matchedInstance?.title).toBe('Matched New'); // Other details updated

      expect(finalInstances.find(i => i.id === 'instNewlyGenerated')).toBeDefined();
      // instNotMatched (from original localStorage) should be gone as it was in the period but not in new generation
      expect(finalInstances.find(i => i.id === 'instNotMatched')).toBeUndefined();
      expect(localStorageMock.setItem).toHaveBeenCalledWith(CHORE_INSTANCES_STORAGE_KEY, expect.any(String));
    });
  });


  describe('toggleSubTaskComplete', () => {
    const initialChoreDefWithSubtasks: ChoreDefinition = {
      id: 'choreDef1', title: 'Chore with Subtasks', dueDate: '2024-01-01', isComplete: false,
      subTasks: [
        { id: 'subtask1', title: 'Subtask A', isComplete: false },
        { id: 'subtask2', title: 'Subtask B', isComplete: false },
      ],
    };

    beforeEach(() => {
      // Set a definition with subtasks in localStorage before each test in this block
      localStorageMock.setItem(CHORE_DEFINITIONS_STORAGE_KEY, JSON.stringify([initialChoreDefWithSubtasks]));
    });

    it('should toggle the completion status of a specified sub-task', () => {
      const { result, rerender } = renderChoresContextHook();
      // Ensure initial state is loaded
      expect(result.current.choreDefinitions.find(c => c.id === 'choreDef1')?.subTasks?.[0].isComplete).toBe(false);

      act(() => {
        result.current.toggleSubTaskComplete('choreDef1', 'subtask1');
      });
      rerender(); // Rerender to get updated state

      const updatedChore = result.current.choreDefinitions.find(c => c.id === 'choreDef1');
      expect(updatedChore?.subTasks?.find(st => st.id === 'subtask1')?.isComplete).toBe(true);
      expect(updatedChore?.subTasks?.find(st => st.id === 'subtask2')?.isComplete).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(CHORE_DEFINITIONS_STORAGE_KEY, expect.any(String));
    });

    it('should do nothing and not warn if chore definition or sub-task ID is not found (provider behavior)', () => {
      const { result } = renderChoresContextHook();
      const initialDefinitions = result.current.choreDefinitions; // Definitions loaded by provider

      act(() => {
        result.current.toggleSubTaskComplete('nonExistentChore', 'subtask1');
      });
      expect(result.current.choreDefinitions).toEqual(initialDefinitions);
      expect(consoleWarnSpy).not.toHaveBeenCalledWith('Chore definition with ID nonExistentChore not found.');

      act(() => {
        result.current.toggleSubTaskComplete('choreDef1', 'nonExistentSubtask');
      });
      expect(result.current.choreDefinitions).toEqual(initialDefinitions);
      expect(consoleWarnSpy).not.toHaveBeenCalledWith('Sub-task with ID nonExistentSubtask not found for choreDef1.');
      // Check that setItem was not called unnecessarily (if state didn't change)
      // Note: useEffect in provider will call setItem if definitions object reference changes, even if content is same.
      // This specific check might be too strict depending on how setChoreDefinitions is implemented.
      // For now, we assume if no change, no setItem.
    });
  });

  describe('getChoreDefinitionsForKid', () => {
    // Using default definitions from ChoresProvider for these tests
    // Default definitions include kid_a and kid_b assignments.

    it('should return only chore definitions assigned to the specified kidId', () => {
      const { result } = renderChoresContextHook(); // Uses default definitions
      const kidAChoreTitles = result.current.getChoreDefinitionsForKid('kid_a').map(c => c.title);
      // From default data in ChoresProvider.tsx:
      // cd1: 'Clean Room (Daily)' -> kid_a
      // cd3: 'Do Homework (One-off)' -> kid_a
      // cd4: 'Take out trash (Monthly 15th)' -> kid_a
      // cd5: 'Feed Cat (Daily)' -> kid_a
      expect(kidAChoreTitles).toContain('Clean Room (Daily)');
      expect(kidAChoreTitles).toContain('Do Homework (One-off)');
      expect(kidAChoreTitles.length).toBe(4); // Based on default data

      const kidBChoreTitles = result.current.getChoreDefinitionsForKid('kid_b').map(c => c.title);
      // cd2: 'Walk the Dog (Weekly Sat)' -> kid_b
      expect(kidBChoreTitles).toContain('Walk the Dog (Weekly Sat)');
      expect(kidBChoreTitles.length).toBe(1);
    });

    it('should return an empty array if no chores are assigned to the kidId', () => {
      const { result } = renderChoresContextHook();
      const nonExistentKidChores = result.current.getChoreDefinitionsForKid('nonExistentKid');
      expect(nonExistentKidChores).toEqual([]);
    });

    it('should not include unassigned chores when a specific kidId is requested', () => {
      // Add an unassigned chore to test this specifically, as defaults might all be assigned
      const unassignedDef: ChoreDefinition = { id: 'unassigned1', title: 'Unassigned Task', dueDate: '2024-01-01', isComplete: false, assignedKidId: undefined };
      localStorageMock.setItem(CHORE_DEFINITIONS_STORAGE_KEY, JSON.stringify([
        ...JSON.parse(localStorageMock.getItem(CHORE_DEFINITIONS_STORAGE_KEY) || '[]'), // Keep defaults
        unassignedDef
      ]));

      const { result } = renderChoresContextHook(); // Reloads with the unassigned chore
      const kidAChoreDefs = result.current.getChoreDefinitionsForKid('kid_a');
      expect(kidAChoreDefs.some(def => def.id === 'unassigned1')).toBe(false);
    });
  });
});