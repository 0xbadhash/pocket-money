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

// Commenting out tests for removed features: KanbanChoreOrders and updateChoreInstanceColumn
/*
describe('ChoresContext - Kanban Chore Orders', () => {
  // ... tests for kanbanChoreOrders ...
});

describe('ChoresContext - updateChoreInstanceColumn', () => {
  // ... tests for updateChoreInstanceColumn (now legacy) ...
});
*/

describe('ChoresContext - Persistence and Basic Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'choreDefinitions') return JSON.stringify(useChoresContextInitialStateForTest.choreDefinitions);
        if (key === 'choreInstances') return JSON.stringify([]);
        return null;
    });
  });

  test('addChoreDefinition persists updated choreDefinitions to localStorage', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    const newDefData = { title: 'New Test Def', assignedKidId: 'kid_a', rewardAmount: 10, earlyStartDate: '2024-01-01', dueDate: '2024-01-05' };

    act(() => {
      result.current.addChoreDefinition(newDefData);
    });

    const addedDef = result.current.choreDefinitions.find(def => def.title === 'New Test Def');
    expect(addedDef).toBeDefined();
    expect(addedDef?.earlyStartDate).toBe('2024-01-01');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('choreDefinitions', JSON.stringify(result.current.choreDefinitions));
  });

  // toggleSubtaskCompletionOnInstance is on instances now, not definitions directly.
  // This test needs to be adapted or moved if subtask toggling persistence is tested.
  // For now, focusing on direct context function tests.

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
        if (key === 'choreDefinitions') return JSON.stringify(useChoresContextInitialStateForTest.choreDefinitions);
        if (key === 'choreInstances') return JSON.stringify([]);
        return null;
    });
  });

  test('generateInstancesForPeriod assigns "TO_DO" categoryStatus by default if no defaultCategory is passed', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    act(() => {
      result.current.generateInstancesForPeriod("2023-12-01", "2023-12-01");
    });
    const generatedInstances = result.current.choreInstances;
    expect(generatedInstances.length).toBeGreaterThan(0);
    generatedInstances.forEach(instance => {
      if (instance.choreDefinitionId === 'cd1') {
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
        { id: 'cd1_2023-12-01', choreDefinitionId: 'cd1', instanceDate: '2023-12-01', categoryStatus: 'COMPLETED', isComplete: true, subtaskCompletions: {} }
    ];
    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'choreDefinitions') return JSON.stringify(useChoresContextInitialStateForTest.choreDefinitions);
        if (key === 'choreInstances') return JSON.stringify(existingInstances);
        return null;
    });
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    act(() => {
      result.current.generateInstancesForPeriod("2023-12-01", "2023-12-01", 'TO_DO');
    });
    const finalInstances = result.current.choreInstances;
    const targetInstance = finalInstances.find(inst => inst.id === 'cd1_2023-12-01');
    expect(targetInstance).toBeDefined();
    expect(targetInstance?.categoryStatus).toBe('COMPLETED');
  });

  test('generateInstancesForPeriod considers earlyStartDate if before dueDate', () => {
    const definitionsWithEarlyStart = [
      { ...useChoresContextInitialStateForTest.choreDefinitions[0], id: 'cd_early', dueDate: '2023-12-05', earlyStartDate: '2023-12-01', recurrenceType: null },
      { ...useChoresContextInitialStateForTest.choreDefinitions[0], id: 'cd_normal', dueDate: '2023-12-03', recurrenceType: null },
      { ...useChoresContextInitialStateForTest.choreDefinitions[0], id: 'cd_early_after_due', dueDate: '2023-12-01', earlyStartDate: '2023-12-05', recurrenceType: null }, // early start is ignored
    ];
     localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'choreDefinitions') return JSON.stringify(definitionsWithEarlyStart);
        if (key === 'choreInstances') return JSON.stringify([]);
        return null;
    });
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    act(() => {
      result.current.generateInstancesForPeriod("2023-12-01", "2023-12-05");
    });
    const instances = result.current.choreInstances;
    // cd_early should have an instance on 2023-12-01 because of earlyStartDate
    expect(instances.find(inst => inst.choreDefinitionId === 'cd_early' && inst.instanceDate === '2023-12-01')).toBeDefined();
    // cd_normal should have an instance on 2023-12-03
    expect(instances.find(inst => inst.choreDefinitionId === 'cd_normal' && inst.instanceDate === '2023-12-03')).toBeDefined();
    // cd_early_after_due should generate based on its dueDate '2023-12-01'
    expect(instances.find(inst => inst.choreDefinitionId === 'cd_early_after_due' && inst.instanceDate === '2023-12-01')).toBeDefined();
    expect(instances.find(inst => inst.choreDefinitionId === 'cd_early_after_due' && inst.instanceDate === '2023-12-05')).toBeUndefined(); // Should not use earlyStartDate if it's after dueDate for generation start
  });
});

describe('ChoresContext - Individual Item Updates', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock = localStorageMockFactory();
        Object.defineProperty(window, 'localStorage', { value: localStorageMock });
        const initialDefinitions = [
            { ...useChoresContextInitialStateForTest.choreDefinitions[0], id: 'defToUpdate', rewardAmount: 5 }
        ];
        const initialInstances = [
            { id: 'instToUpdate', choreDefinitionId: 'defToUpdate', instanceDate: '2024-01-15', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {} }
        ];
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'choreDefinitions') return JSON.stringify(initialDefinitions);
            if (key === 'choreInstances') return JSON.stringify(initialInstances);
            return null;
        });
    });

    test('updateChoreDefinition updates rewardAmount', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        act(() => {
            result.current.updateChoreDefinition('defToUpdate', { rewardAmount: 100 });
        });
        const updatedDef = result.current.choreDefinitions.find(d => d.id === 'defToUpdate');
        expect(updatedDef?.rewardAmount).toBe(100);
    });

    test('updateChoreInstanceField updates instanceDate', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const newDate = '2024-01-20';
        act(() => {
            result.current.updateChoreInstanceField('instToUpdate', 'instanceDate', newDate);
        });
        const updatedInst = result.current.choreInstances.find(i => i.id === 'instToUpdate');
        expect(updatedInst?.instanceDate).toBe(newDate);
    });
});

describe('ChoresContext - Batch Operations', () => {
    let initialDefinitionsForBatch: typeof useChoresContextInitialStateForTest.choreDefinitions;
    let initialInstancesForBatch: ChoreInstance[];

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock = localStorageMockFactory();
        Object.defineProperty(window, 'localStorage', { value: localStorageMock });

        initialDefinitionsForBatch = [
            { ...useChoresContextInitialStateForTest.choreDefinitions[0], id: 'def_batch1', assignedKidId: 'kid_A', rewardAmount: 10 },
            { ...useChoresContextInitialStateForTest.choreDefinitions[0], id: 'def_batch2', assignedKidId: 'kid_A', rewardAmount: 5 },
            { ...useChoresContextInitialStateForTest.choreDefinitions[0], id: 'def_batch3', assignedKidId: 'kid_B' },
        ];
        initialInstancesForBatch = [
            { id: 'inst_batch1', choreDefinitionId: 'def_batch1', instanceDate: '2024-02-01', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {} },
            { id: 'inst_batch2', choreDefinitionId: 'def_batch2', instanceDate: '2024-02-01', categoryStatus: 'IN_PROGRESS', isComplete: false, subtaskCompletions: {} },
            { id: 'inst_batch3', choreDefinitionId: 'def_batch3', instanceDate: '2024-02-01', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {} },
            { id: 'inst_batch4_completed', choreDefinitionId: 'def_batch1', instanceDate: '2024-02-02', categoryStatus: 'COMPLETED', isComplete: true, subtaskCompletions: {} },
        ];
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'choreDefinitions') return JSON.stringify(initialDefinitionsForBatch);
            if (key === 'choreInstances') return JSON.stringify(initialInstancesForBatch);
            return null;
        });
    });

    test('batchToggleCompleteChoreInstances marks multiple instances as complete with rewards and category change', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const idsToComplete = ['inst_batch1', 'inst_batch2'];
        act(() => {
            result.current.batchToggleCompleteChoreInstances(idsToComplete, true);
        });
        const instances = result.current.choreInstances;
        expect(instances.find(i=>i.id === 'inst_batch1')?.isComplete).toBe(true);
        expect(instances.find(i=>i.id === 'inst_batch1')?.categoryStatus).toBe('COMPLETED');
        expect(instances.find(i=>i.id === 'inst_batch2')?.isComplete).toBe(true);
        expect(instances.find(i=>i.id === 'inst_batch2')?.categoryStatus).toBe('COMPLETED');
        expect(mockAddKidReward).toHaveBeenCalledTimes(2); // For inst_batch1 (reward 10) and inst_batch2 (reward 5)
        expect(mockAddKidReward).toHaveBeenCalledWith('kid_A', 10, expect.any(String));
        expect(mockAddKidReward).toHaveBeenCalledWith('kid_A', 5, expect.any(String));
    });

    test('batchToggleCompleteChoreInstances marks multiple instances as incomplete and updates category', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const idsToIncomplete = ['inst_batch4_completed']; // This one is initially complete
         act(() => {
            result.current.batchToggleCompleteChoreInstances(idsToIncomplete, false);
        });
        const instance = result.current.choreInstances.find(i=>i.id === 'inst_batch4_completed');
        expect(instance?.isComplete).toBe(false);
        expect(instance?.categoryStatus).toBe('IN_PROGRESS'); // Should move from COMPLETED
        expect(mockAddKidReward).not.toHaveBeenCalled();
    });

    test('batchUpdateChoreInstancesCategory updates category for multiple instances', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const idsToUpdate = ['inst_batch1', 'inst_batch3']; // Both TO_DO initially
        act(() => {
            result.current.batchUpdateChoreInstancesCategory(idsToUpdate, 'IN_PROGRESS');
        });
        const instances = result.current.choreInstances;
        expect(instances.find(i=>i.id === 'inst_batch1')?.categoryStatus).toBe('IN_PROGRESS');
        expect(instances.find(i=>i.id === 'inst_batch3')?.categoryStatus).toBe('IN_PROGRESS');
    });

    test('batchAssignChoreDefinitionsToKid reassigns multiple definitions', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const defIdsToAssign = ['def_batch1', 'def_batch2']; // Both assigned to kid_A
        const newKid = 'kid_C';
        act(() => {
            result.current.batchAssignChoreDefinitionsToKid(defIdsToAssign, newKid);
        });
        const definitions = result.current.choreDefinitions;
        expect(definitions.find(d=>d.id === 'def_batch1')?.assignedKidId).toBe(newKid);
        expect(definitions.find(d=>d.id === 'def_batch2')?.assignedKidId).toBe(newKid);
        expect(definitions.find(d=>d.id === 'def_batch3')?.assignedKidId).toBe('kid_B'); // Unchanged
    });
     test('batchAssignChoreDefinitionsToKid unassigns if newKidId is null', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const defIdsToUnassign = ['def_batch1'];
        act(() => {
            result.current.batchAssignChoreDefinitionsToKid(defIdsToUnassign, null);
        });
        const definition = result.current.choreDefinitions.find(d=>d.id === 'def_batch1');
        expect(definition?.assignedKidId).toBeUndefined();
    });
});
