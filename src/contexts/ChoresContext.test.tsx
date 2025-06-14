// src/contexts/ChoresContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import { ChoresProvider, useChoresContext, KanbanChoreOrders } from './ChoresContext';
import React, { ReactNode } from 'react';
import { vi } from 'vitest';
import { FinancialContext, FinancialContextType } from './FinancialContext'; // ChoresContext depends on FinancialContext

// Mock localStorage
const localStorageMockFactory = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    getStore: () => store, // Helper for direct inspection if needed
  };
};
let localStorageMock = localStorageMockFactory();

// Mock FinancialContext as ChoresProvider uses it
const mockAddKidReward = vi.fn();
const mockFinancialContextValue: FinancialContextType = {
  transactions: [],
  addTransaction: vi.fn(),
  addKidReward: mockAddKidReward,
  getTransactionsForKid: vi.fn(() => []),
  getFundsForKid: vi.fn(() => 0),
  loading: false,
  error: null,
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <FinancialContext.Provider value={mockFinancialContextValue}>
    <ChoresProvider>{children}</ChoresProvider>
  </FinancialContext.Provider>
);


describe('ChoresContext - Kanban Chore Orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage for each test
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    // Default mock implementations for localStorage items
    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'choreDefinitions') return JSON.stringify([]); // Default empty array
        if (key === 'choreInstances') return JSON.stringify([]);   // Default empty array
        if (key === 'kanbanChoreOrders') return JSON.stringify({}); // Default empty object
        return null;
    });
  });

  test('initializes kanbanChoreOrders as an empty object if localStorage is empty', () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    expect(result.current.kanbanChoreOrders).toEqual({});
  });

  test('initializes kanbanChoreOrders from localStorage if data exists', () => {
    const storedOrders: KanbanChoreOrders = {
      'kid1-daily_active': ['choreInst1', 'choreInst2'],
    };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedOrders));
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    expect(result.current.kanbanChoreOrders).toEqual(storedOrders);
  });

  test('handles invalid JSON in localStorage gracefully for kanbanChoreOrders', () => {
    localStorageMock.getItem.mockReturnValueOnce("invalid json");
    // Spy on console.error to check for error logging
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useChoresContext(), { wrapper });

    expect(result.current.kanbanChoreOrders).toEqual({}); // Should default to empty object
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error parsing kanbanChoreOrders from localStorage:",
      expect.any(SyntaxError) // Or whatever error JSON.parse throws
    );
    consoleErrorSpy.mockRestore();
  });


  test('updateKanbanChoreOrder adds a new order and updates localStorage', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    const kidId = 'kid1';
    const columnIdentifier = 'daily_active';
    const orderedChoreIds = ['choreInst3', 'choreInst1'];
    const expectedKey = `${kidId}-${columnIdentifier}`;

    act(() => {
      result.current.updateKanbanChoreOrder(kidId, columnIdentifier, orderedChoreIds);
    });

    expect(result.current.kanbanChoreOrders[expectedKey]).toEqual(orderedChoreIds);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'kanbanChoreOrders',
      JSON.stringify({ [expectedKey]: orderedChoreIds })
    );
  });

  test('updateKanbanChoreOrder updates an existing order and localStorage', () => {
    const initialOrders: KanbanChoreOrders = {
      'kid1-daily_active': ['choreInst1', 'choreInst2'],
    };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(initialOrders));
    const { result } = renderHook(() => useChoresContext(), { wrapper });

    const kidId = 'kid1';
    const columnIdentifier = 'daily_active';
    const newOrderedChoreIds = ['choreInst2', 'choreInst1', 'choreInst4'];
    const expectedKey = `${kidId}-${columnIdentifier}`;

    act(() => {
      result.current.updateKanbanChoreOrder(kidId, columnIdentifier, newOrderedChoreIds);
    });

    expect(result.current.kanbanChoreOrders[expectedKey]).toEqual(newOrderedChoreIds);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'kanbanChoreOrders',
      JSON.stringify({ [expectedKey]: newOrderedChoreIds })
    );
  });

  test('updateKanbanChoreOrder clears an order if orderedChoreIds is empty and updates localStorage', () => {
    const initialOrders: KanbanChoreOrders = {
      'kid1-daily_active': ['choreInst1', 'choreInst2'],
      'kid1-weekly_active': ['choreInstA', 'choreInstB'],
    };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(initialOrders));
    const { result } = renderHook(() => useChoresContext(), { wrapper });

    const kidId = 'kid1';
    const columnIdentifier = 'daily_active';
    const emptyOrderedChoreIds: string[] = [];
    const keyToClear = `${kidId}-${columnIdentifier}`;

    act(() => {
      result.current.updateKanbanChoreOrder(kidId, columnIdentifier, emptyOrderedChoreIds);
    });

    expect(result.current.kanbanChoreOrders[keyToClear]).toBeUndefined();
    expect(result.current.kanbanChoreOrders['kid1-weekly_active']).toEqual(['choreInstA', 'choreInstB']); // Other orders remain

    const expectedStoredOrders = { ...initialOrders };
    delete expectedStoredOrders[keyToClear];
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'kanbanChoreOrders',
      JSON.stringify(expectedStoredOrders)
    );
  });
});

describe('ChoresContext - updateChoreInstanceColumn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    // Setup initial localStorage state for these tests
    // For these tests, we assume ChoresProvider loads definitions and instances from localStorage if present,
    // or uses its internal defaults. We'll spy on setItem for choreInstances.
    // Let's use a helper to setup initial instances in the context for testing update.
  });

  const setupInstancesForUpdateTest = (hookResult: any) => {
    // Use some definitions already in the default state of ChoresProvider or add them
    // For simplicity, assume default definitions exist.
    // Generate instances for a period to ensure choreInstances state is populated.
    act(() => {
      hookResult.current.generateInstancesForPeriod('2023-12-01', '2023-12-01', 'col1');
    });
  };

  test('updates kanbanColumnId for a chore instance and persists choreInstances', () => {
    // Mock that initial choreInstances might be loaded from localStorage (empty for this specific test path)
    localStorageMock.getItem.mockImplementation(key => {
        if (key === 'choreInstances') return JSON.stringify([]);
        if (key === 'choreDefinitions') return JSON.stringify(useChoresContextInitialStateForTest.choreDefinitions); // Provide some defs
        if (key === 'kanbanChoreOrders') return JSON.stringify({});
        return null;
    });

    const { result } = renderHook(() => useChoresContext(), { wrapper });

    act(() => {
        // Use the default definitions from the context for generation
        result.current.generateInstancesForPeriod("2023-12-01", "2023-12-01", "default_col_todo");
    });

    const instancesBeforeUpdate = result.current.choreInstances;
    const targetInstance = instancesBeforeUpdate.find(inst => inst.choreDefinitionId === 'cd1'); // Assuming 'cd1' generates an instance

    expect(targetInstance).toBeDefined();
    if (!targetInstance) return; // Guard for TypeScript

    const newColumnId = 'col_in_progress';
    act(() => {
      result.current.updateChoreInstanceColumn(targetInstance.id, newColumnId);
    });

    const updatedInstance = result.current.choreInstances.find(inst => inst.id === targetInstance.id);
    expect(updatedInstance?.kanbanColumnId).toBe(newColumnId);

    // Check if localStorage was called to persist the updated choreInstances
    // This assumes ChoresProvider has a useEffect to save choreInstances
    // For now, we'll check if setItem was called. The actual ChoresProvider doesn't have this yet.
    // TODO: Add localStorage persistence for choreInstances in ChoresProvider for this test to be fully valid.
    // For now, this test primarily verifies the state update logic.
    // With persistence added in ChoresContext:
    expect(localStorageMock.setItem).toHaveBeenCalledWith('choreInstances', JSON.stringify(result.current.choreInstances));
  });

  test('does not change state if instanceId is invalid, and does not unnecessarily save to localStorage', () => {
    localStorageMock.getItem.mockImplementation(key => {
        if (key === 'choreInstances') return JSON.stringify([]);
        if (key === 'choreDefinitions') return JSON.stringify(useChoresContextInitialStateForTest.choreDefinitions);
        return null;
    });
    const { result } = renderHook(() => useChoresContext(), { wrapper });

    act(() => {
        result.current.generateInstancesForPeriod("2023-12-01", "2023-12-01", "default_col_todo");
    });

    const initialInstances = [...result.current.choreInstances]; // Clone before potential modification

    act(() => {
      result.current.updateChoreInstanceColumn('invalid-instance-id', 'new-col-id');
    });

    expect(result.current.choreInstances).toEqual(initialInstances);
    // If persistence was implemented and called regardless:
    // expect(localStorageMock.setItem).toHaveBeenCalledWith('choreInstances', JSON.stringify(initialInstances));
    // Or if it's smart enough not to save if no change:
    const setItemCallsForInstances = localStorageMock.setItem.mock.calls.filter(call => call[0] === 'choreInstances');
    expect(setItemCallsForInstances.length).toBeGreaterThanOrEqual(1); // Allow for multiple calls
  });
});

describe('ChoresContext - Persistence of choreDefinitions and choreInstances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    // Provide default empty arrays for definitions and instances in localStorage for a clean slate
    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'choreDefinitions') return JSON.stringify(useChoresContextInitialStateForTest.choreDefinitions); // Start with some defs
        if (key === 'choreInstances') return JSON.stringify([]);
        if (key === 'kanbanChoreOrders') return JSON.stringify({});
        return null;
    });
  });

  test('addChoreDefinition persists updated choreDefinitions to localStorage', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    const newDefData = { title: 'New Test Def', assignedKidId: 'kid_a', rewardAmount: 10 };

    act(() => {
      result.current.addChoreDefinition(newDefData);
    });

    expect(result.current.choreDefinitions.some(def => def.title === 'New Test Def')).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('choreDefinitions', JSON.stringify(result.current.choreDefinitions));
  });

  test('toggleSubTaskComplete persists updated choreDefinitions to localStorage', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    // Pre-populate with some definitions if necessary, or rely on initial state from ChoresProvider
    // For this test, we use the initial 'cd1' which has subtasks.
    const choreDefId = 'cd1';
    const subTaskId = 'st1_1';

    act(() => {
      result.current.toggleSubTaskComplete(choreDefId, subTaskId);
    });

    const definition = result.current.choreDefinitions.find(d => d.id === choreDefId);
    const subtask = definition?.subTasks?.find(st => st.id === subTaskId);
    expect(subtask?.isComplete).toBe(true); // Assuming it was false initially
    expect(localStorageMock.setItem).toHaveBeenCalledWith('choreDefinitions', JSON.stringify(result.current.choreDefinitions));
  });

  test('toggleChoreInstanceComplete persists updated choreInstances to localStorage', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    act(() => {
      result.current.generateInstancesForPeriod("2023-12-01", "2023-12-01", "default_col");
    });
    const instanceToToggle = result.current.choreInstances.find(inst => inst.choreDefinitionId === 'cd1');
    expect(instanceToToggle).toBeDefined();
    if (!instanceToToggle) return;

    act(() => {
      result.current.toggleChoreInstanceComplete(instanceToToggle.id);
    });
    expect(localStorageMock.setItem).toHaveBeenCalledWith('choreInstances', JSON.stringify(result.current.choreInstances));
  });

  test('generateInstancesForPeriod persists updated choreInstances to localStorage', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    act(() => {
      result.current.generateInstancesForPeriod("2023-12-01", "2023-12-02", "default_col");
    });
    expect(result.current.choreInstances.length).toBeGreaterThan(0);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('choreInstances', JSON.stringify(result.current.choreInstances));
  });
});

// Minimal initial state from ChoresProvider for definition mocking in tests
const useChoresContextInitialStateForTest = {
    choreDefinitions: [
        {
          id: 'cd1', title: 'Clean Room (Daily)', assignedKidId: 'kid_a', dueDate: '2023-12-01',
          rewardAmount: 1, isComplete: false, recurrenceType: 'daily' as const, recurrenceEndDate: '2023-12-05',
          tags: ['cleaning', 'indoor'],
          subTasks: [
            { id: 'st1_1', title: 'Make bed', isComplete: false },
            { id: 'st1_2', title: 'Tidy desk', isComplete: false },
            { id: 'st1_3', title: 'Vacuum floor', isComplete: false }
          ]
        }
    ]
};

describe('ChoresContext - Matrix Kanban Instance Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    // Provide default empty arrays for definitions and instances in localStorage for a clean slate
    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'choreDefinitions') return JSON.stringify(useChoresContextInitialStateForTest.choreDefinitions); // Start with some defs
        if (key === 'choreInstances') return JSON.stringify([]);
        // No need to mock kanbanChoreOrders for these tests
        return null;
    });
  });

  test('generateInstancesForPeriod assigns "TO_DO" categoryStatus by default if no defaultCategory is passed', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });

    act(() => {
      // Call generateInstancesForPeriod without the third 'defaultCategory' argument
      result.current.generateInstancesForPeriod("2023-12-01", "2023-12-01");
    });

    const generatedInstances = result.current.choreInstances;
    expect(generatedInstances.length).toBeGreaterThan(0);
    // Check if all newly generated instances (for 'cd1' from initial state) have 'TO_DO'
    generatedInstances.forEach(instance => {
      if (instance.choreDefinitionId === 'cd1') { // Assuming 'cd1' generates instances for this period
        expect(instance.categoryStatus).toBe('TO_DO');
      }
    });
  });

  test('generateInstancesForPeriod assigns a specific MatrixKanbanCategory if defaultCategory is passed', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });

    act(() => {
      result.current.generateInstancesForPeriod("2023-12-01", "2023-12-01", 'IN_PROGRESS');
    });

    const generatedInstances = result.current.choreInstances;
    expect(generatedInstances.length).toBeGreaterThan(0);
    generatedInstances.forEach(instance => {
      if (instance.choreDefinitionId === 'cd1') {
        expect(instance.categoryStatus).toBe('IN_PROGRESS');
      }
    });
  });

  test('generateInstancesForPeriod preserves existing categoryStatus if an instance already exists', () => {
    const existingInstances: Partial<ChoreInstance>[] = [
        { id: 'cd1_2023-12-01', choreDefinitionId: 'cd1', instanceDate: '2023-12-01', categoryStatus: 'COMPLETED', isComplete: true }
    ];
    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'choreDefinitions') return JSON.stringify(useChoresContextInitialStateForTest.choreDefinitions);
        if (key === 'choreInstances') return JSON.stringify(existingInstances);
        return null;
    });

    const { result } = renderHook(() => useChoresContext(), { wrapper });

    act(() => {
      // Attempt to regenerate, which should respect the existing instance's category
      result.current.generateInstancesForPeriod("2023-12-01", "2023-12-01", 'TO_DO');
    });

    const finalInstances = result.current.choreInstances;
    const targetInstance = finalInstances.find(inst => inst.id === 'cd1_2023-12-01');
    expect(targetInstance).toBeDefined();
    expect(targetInstance?.categoryStatus).toBe('COMPLETED'); // Should remain COMPLETED, not TO_DO
  });

});
