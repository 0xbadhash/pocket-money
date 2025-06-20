// src/contexts/ChoresContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import { ChoresProvider, useChoresContext } from './ChoresContext';
import React, { ReactNode } from 'react';
import { describe, it, test, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { FinancialContext, FinancialContextType } from './FinancialContext';
import type { ChoreInstance, ChoreDefinition, MatrixKanbanCategory } from '../types';

// Mock localStorage
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

const initialTestDefinitions: ChoreDefinition[] = [
    {
      id: 'cd1', title: 'Clean Room (Daily)', assignedKidId: 'kid_a', dueDate: '2023-12-01',
      rewardAmount: 1, isComplete: false, recurrenceType: 'daily' as const, recurrenceEndDate: '2023-12-05',
      tags: ['cleaning', 'indoor'],
      subTasks: [ { id: 'st1_1', title: 'Make bed', isComplete: false }, { id: 'st1_2', title: 'Tidy desk', isComplete: false }, { id: 'st1_3', title: 'Vacuum floor', isComplete: false } ],
      earlyStartDate: undefined,
      updatedAt: new Date('2023-01-01T00:00:00.000Z').toISOString(), // Ensure this field exists for tests that need it
      // Add other fields like createdAt if they are non-optional in your type
      createdAt: new Date('2023-01-01T00:00:00.000Z').toISOString(),
    }
];

describe('ChoresContext - Persistence and Basic Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'choreDefinitions') return JSON.stringify(initialTestDefinitions);
        if (key === 'choreInstances') return JSON.stringify([]);
        return null;
    });
  });

  test('addChoreDefinition persists updated choreDefinitions to localStorage including earlyStartDate', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    const newDefData = {
      title: 'New Test Def', assignedKidId: 'kid_a', rewardAmount: 10,
      earlyStartDate: '2024-01-01', dueDate: '2024-01-05'
    };
    act(() => { result.current.addChoreDefinition(newDefData); });
    const addedDef = result.current.choreDefinitions.find(def => def.title === 'New Test Def');
    expect(addedDef).toBeDefined();
    expect(addedDef?.earlyStartDate).toBe('2024-01-01');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('choreDefinitions', JSON.stringify(result.current.choreDefinitions));
  });

  test('toggleChoreInstanceComplete persists updated choreInstances to localStorage and processes reward', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    act(() => { result.current.generateInstancesForPeriod("2023-12-01", "2023-12-01"); });
    const instanceToToggle = result.current.choreInstances.find(inst => inst.choreDefinitionId === 'cd1');
    expect(instanceToToggle).toBeDefined();
    if (!instanceToToggle) return;
    expect(instanceToToggle.isComplete).toBe(false);
    act(() => { result.current.toggleChoreInstanceComplete(instanceToToggle.id); });
    const updatedInstance = result.current.choreInstances.find(inst => inst.id === instanceToToggle.id);
    expect(updatedInstance?.isComplete).toBe(true);
    expect(mockAddKidReward).toHaveBeenCalledWith('kid_a', 1, expect.stringContaining(initialTestDefinitions[0].title));
    expect(localStorageMock.setItem).toHaveBeenCalledWith('choreInstances', JSON.stringify(result.current.choreInstances));
  });

  test('generateInstancesForPeriod persists updated choreInstances to localStorage', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    act(() => { result.current.generateInstancesForPeriod("2023-12-01", "2023-12-02"); });
    expect(result.current.choreInstances.length).toBeGreaterThan(0);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('choreInstances', JSON.stringify(result.current.choreInstances));
  });
});

describe('ChoresContext - Matrix Kanban Instance Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'choreDefinitions') return JSON.stringify(initialTestDefinitions);
        if (key === 'choreInstances') return JSON.stringify([]);
        return null;
    });
  });

  test('generateInstancesForPeriod assigns "TO_DO" categoryStatus by default if no defaultCategory is passed', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    act(() => { result.current.generateInstancesForPeriod("2023-12-01", "2023-12-01"); });
    const instanceForCd1 = result.current.choreInstances.find(inst => inst.choreDefinitionId === 'cd1');
    expect(instanceForCd1).toBeDefined();
    expect(instanceForCd1?.categoryStatus).toBe('TO_DO');
  });

  test('generateInstancesForPeriod assigns a specific MatrixKanbanCategory if defaultCategory is passed', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    act(() => { result.current.generateInstancesForPeriod("2023-12-01", "2023-12-01", 'IN_PROGRESS'); });
    const instanceForCd1 = result.current.choreInstances.find(inst => inst.choreDefinitionId === 'cd1');
    expect(instanceForCd1).toBeDefined();
    expect(instanceForCd1?.categoryStatus).toBe('IN_PROGRESS');
  });

  test('generateInstancesForPeriod preserves existing instance data (like categoryStatus and isComplete)', () => {
    const existingInstanceId = initialTestDefinitions[0].id + "_2023-12-01";
    const existingInstances: ChoreInstance[] = [
        { id: existingInstanceId, choreDefinitionId: initialTestDefinitions[0].id, instanceDate: '2023-12-01', categoryStatus: 'COMPLETED', isComplete: true, subtaskCompletions: {} }
    ];
    // This mockImplementation specific to the test might have issues if ChoresProvider initializes too early.
    // localStorageMock.getItem.mockImplementation((key: string) => {
    //     if (key === 'choreDefinitions') return JSON.stringify(initialTestDefinitions);
    //     if (key === 'choreInstances') return JSON.stringify(existingInstances);
    //     return null;
    // });

    // Use mockReturnValueOnce to ensure these values are returned for the provider's initialization
    localStorageMock.getItem
      .mockReturnValueOnce(JSON.stringify(initialTestDefinitions)) // For choreDefinitions
      .mockReturnValueOnce(JSON.stringify(existingInstances));  // For choreInstances

    const { result } = renderHook(() => useChoresContext(), { wrapper });

    // Optional: Verify loaded state immediately after render
    // console.log('[TEST_DEBUG] Instances loaded in context:', JSON.stringify(result.current.choreInstances));

    act(() => { result.current.generateInstancesForPeriod("2023-12-01", "2023-12-01", 'TO_DO'); });
    const targetInstance = result.current.choreInstances.find(inst => inst.id === existingInstanceId);
    expect(targetInstance).toBeDefined();
    expect(targetInstance?.categoryStatus).toBe('COMPLETED');
    expect(targetInstance?.isComplete).toBe(true);
  });

  test('generateInstancesForPeriod considers earlyStartDate if before dueDate for non-recurring chore', () => {
    const definitionsWithEarlyStart: ChoreDefinition[] = [
      { ...initialTestDefinitions[0], id: 'cd_early', dueDate: '2023-12-05', earlyStartDate: '2023-12-01', recurrenceType: null, isComplete: false, createdAt:'', updatedAt:'' },
      { ...initialTestDefinitions[0], id: 'cd_normal', dueDate: '2023-12-03', earlyStartDate: undefined, recurrenceType: null, isComplete: false, createdAt:'', updatedAt:'' },
      { ...initialTestDefinitions[0], id: 'cd_early_after_due', dueDate: '2023-12-01', earlyStartDate: '2023-12-05', recurrenceType: null, isComplete: false, createdAt:'', updatedAt:'' },
    ];
     localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'choreDefinitions') return JSON.stringify(definitionsWithEarlyStart);
        if (key === 'choreInstances') return JSON.stringify([]);
        return null;
    });
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    act(() => { result.current.generateInstancesForPeriod("2023-12-01", "2023-12-05"); });
    const instances = result.current.choreInstances;
    const earlyInstance = instances.find(inst => inst.choreDefinitionId === 'cd_early');
    expect(earlyInstance).toBeDefined();
    expect(earlyInstance?.instanceDate).toBe('2023-12-01');
    const normalInstance = instances.find(inst => inst.choreDefinitionId === 'cd_normal');
    expect(normalInstance).toBeDefined();
    expect(normalInstance?.instanceDate).toBe('2023-12-03');
    const earlyAfterDueInstance = instances.find(inst => inst.choreDefinitionId === 'cd_early_after_due');
    expect(earlyAfterDueInstance).toBeDefined();
    expect(earlyAfterDueInstance?.instanceDate).toBe('2023-12-01');
  });
});

describe('ChoresContext - Individual Item Updates', () => {
    let currentInitialDefinitions: ChoreDefinition[];
    let currentInitialInstances: ChoreInstance[];
    const defToUpdateId = 'defToUpdate';
    const instToUpdateId = 'instToUpdate';

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock = localStorageMockFactory();
        Object.defineProperty(window, 'localStorage', { value: localStorageMock });
        currentInitialDefinitions = [ { ...initialTestDefinitions[0], id: defToUpdateId, rewardAmount: 5, updatedAt: new Date('2024-01-01T10:00:00.000Z').toISOString() }];
        currentInitialInstances = [ { id: instToUpdateId, choreDefinitionId: defToUpdateId, instanceDate: '2024-01-15', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {} }];
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'choreDefinitions') return JSON.stringify(currentInitialDefinitions);
            if (key === 'choreInstances') return JSON.stringify(currentInitialInstances);
            return null;
        });
    });

    test('updateChoreDefinition updates rewardAmount and updatedAt timestamp', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const originalDef = result.current.choreDefinitions.find(d => d.id === defToUpdateId);
        const originalUpdatedAt = originalDef?.updatedAt;
        expect(originalUpdatedAt).toBeDefined(); // Ensure definition and its updatedAt are loaded
        await act(async () => { await result.current.updateChoreDefinition(defToUpdateId, { rewardAmount: 100 }); });
        const updatedDef = result.current.choreDefinitions.find(d => d.id === defToUpdateId);
        expect(updatedDef?.rewardAmount).toBe(100);
        expect(updatedDef?.updatedAt).not.toBe(originalUpdatedAt);
        if (updatedDef?.updatedAt && originalUpdatedAt) {
            expect(new Date(updatedDef.updatedAt).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());
        }
    });

    test('updateChoreInstanceField updates instanceDate', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const newDate = '2024-01-20';
        await act(async () => { await result.current.updateChoreInstanceField(instToUpdateId, 'instanceDate', newDate); });
        const updatedInst = result.current.choreInstances.find(i => i.id === instToUpdateId);
        expect(updatedInst?.instanceDate).toBe(newDate);
    });

    test('updateChoreInstanceField sets overriddenRewardAmount on an instance', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const newReward = 7.77;
        // Ensure the field is not set initially or is different
        const originalInstance = result.current.choreInstances.find(i => i.id === instToUpdateId);
        expect(originalInstance?.overriddenRewardAmount).toBeUndefined();

        await act(async () => { await result.current.updateChoreInstanceField(instToUpdateId, 'overriddenRewardAmount', newReward); });

        const updatedInst = result.current.choreInstances.find(i => i.id === instToUpdateId);
        expect(updatedInst?.overriddenRewardAmount).toBe(newReward);
    });

    test('updateChoreInstanceField clears overriddenRewardAmount when set to undefined', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const initialReward = 8.88;

        // First set an override
        await act(async () => { await result.current.updateChoreInstanceField(instToUpdateId, 'overriddenRewardAmount', initialReward); });
        let updatedInst = result.current.choreInstances.find(i => i.id === instToUpdateId);
        expect(updatedInst?.overriddenRewardAmount).toBe(initialReward);

        // Then clear it
        await act(async () => { await result.current.updateChoreInstanceField(instToUpdateId, 'overriddenRewardAmount', undefined); });
        updatedInst = result.current.choreInstances.find(i => i.id === instToUpdateId);
        expect(updatedInst?.overriddenRewardAmount).toBeUndefined();
    });
});

describe('ChoresContext - Batch Operations', () => {
    let batchInitialDefinitions: ChoreDefinition[];
    let batchInitialInstances: ChoreInstance[];

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock = localStorageMockFactory();
        Object.defineProperty(window, 'localStorage', { value: localStorageMock });
        batchInitialDefinitions = [
            { ...initialTestDefinitions[0], id: 'def_batch1', title: "Batch Chore 1", assignedKidId: 'kid_A', rewardAmount: 10, updatedAt: new Date().toISOString() },
            { ...initialTestDefinitions[0], id: 'def_batch2', title: "Batch Chore 2", assignedKidId: 'kid_A', rewardAmount: 5, updatedAt: new Date().toISOString() },
            { ...initialTestDefinitions[0], id: 'def_batch3', title: "Batch Chore 3", assignedKidId: 'kid_B', updatedAt: new Date().toISOString() },
        ];
        batchInitialInstances = [
            { id: 'inst_batch1', choreDefinitionId: 'def_batch1', instanceDate: '2024-02-01', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {} },
            { id: 'inst_batch2', choreDefinitionId: 'def_batch2', instanceDate: '2024-02-01', categoryStatus: 'IN_PROGRESS', isComplete: false, subtaskCompletions: {} },
            { id: 'inst_batch3', choreDefinitionId: 'def_batch3', instanceDate: '2024-02-01', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {} },
            { id: 'inst_batch4_completed', choreDefinitionId: 'def_batch1', instanceDate: '2024-02-02', categoryStatus: 'COMPLETED', isComplete: true, subtaskCompletions: {} },
        ];
        localStorageMock.getItem.mockImplementation((key: string) => {
            if (key === 'choreDefinitions') return JSON.stringify(batchInitialDefinitions);
            if (key === 'choreInstances') return JSON.stringify(batchInitialInstances);
            return null;
        });
    });

    test('batchToggleCompleteChoreInstances marks multiple instances as complete with rewards and category change', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const idsToComplete = ['inst_batch1', 'inst_batch2'];
        await act(async () => { await result.current.batchToggleCompleteChoreInstances(idsToComplete, true); });
        const finalInstances = result.current.choreInstances;
        const inst1 = finalInstances.find(i => i.id === 'inst_batch1');
        const inst2 = finalInstances.find(i => i.id === 'inst_batch2');
        expect(inst1?.isComplete).toBe(true);
        expect(inst1?.categoryStatus).toBe('COMPLETED');
        expect(inst2?.isComplete).toBe(true);
        expect(inst2?.categoryStatus).toBe('COMPLETED');
        expect(mockAddKidReward).toHaveBeenCalledTimes(2);
        expect(mockAddKidReward).toHaveBeenCalledWith('kid_A', 10, expect.stringContaining(batchInitialDefinitions.find(d=>d.id==='def_batch1')!.title));
        expect(mockAddKidReward).toHaveBeenCalledWith('kid_A', 5, expect.stringContaining(batchInitialDefinitions.find(d=>d.id==='def_batch2')!.title));
    });

    test('batchToggleCompleteChoreInstances marks multiple instances as incomplete and updates category', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const idsToIncomplete = ['inst_batch4_completed'];
         await act(async () => { await result.current.batchToggleCompleteChoreInstances(idsToIncomplete, false); });
        const instance = result.current.choreInstances.find(i=>i.id === 'inst_batch4_completed');
        expect(instance?.isComplete).toBe(false);
        expect(instance?.categoryStatus).toBe('IN_PROGRESS');
        expect(mockAddKidReward).not.toHaveBeenCalled();
    });

    test('batchUpdateChoreInstancesCategory updates category for multiple instances', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const idsToUpdate = ['inst_batch1', 'inst_batch3'];
        await act(async () => { await result.current.batchUpdateChoreInstancesCategory(idsToUpdate, 'IN_PROGRESS'); });
        const instances = result.current.choreInstances;
        expect(instances.find(i=>i.id === 'inst_batch1')?.categoryStatus).toBe('IN_PROGRESS');
        expect(instances.find(i=>i.id === 'inst_batch3')?.categoryStatus).toBe('IN_PROGRESS');
        expect(instances.find(i=>i.id === 'inst_batch2')?.categoryStatus).toBe('IN_PROGRESS');
        expect(instances.find(i=>i.id === 'inst_batch4_completed')?.categoryStatus).toBe('COMPLETED');
    });

    test('batchAssignChoreDefinitionsToKid reassigns multiple definitions', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const defIdsToAssign = ['def_batch1', 'def_batch2'];
        const newKid = 'kid_C';
        const originalDef3Kid = result.current.choreDefinitions.find(d=>d.id === 'def_batch3')?.assignedKidId;
        await act(async () => { await result.current.batchAssignChoreDefinitionsToKid(defIdsToAssign, newKid); });
        const definitions = result.current.choreDefinitions;
        expect(definitions.find(d=>d.id === 'def_batch1')?.assignedKidId).toBe(newKid);
        expect(definitions.find(d=>d.id === 'def_batch2')?.assignedKidId).toBe(newKid);
        expect(definitions.find(d=>d.id === 'def_batch3')?.assignedKidId).toBe(originalDef3Kid);
    });

     test('batchAssignChoreDefinitionsToKid unassigns if newKidId is null', async () => {
        const { result } = renderHook(() => useChoresContext(), { wrapper });
        const defIdsToUnassign = ['def_batch1'];
        await act(async () => { await result.current.batchAssignChoreDefinitionsToKid(defIdsToUnassign, null); });
        const definition = result.current.choreDefinitions.find(d=>d.id === 'def_batch1');
        expect(definition?.assignedKidId).toBeUndefined();
    });
});

describe('ChoresContext - updateChoreSeries', () => {
  let seriesTestDefinitions: ChoreDefinition[];
  let seriesTestInstances: ChoreInstance[];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    seriesTestDefinitions = [
      {
        id: 'seriesDef1', title: 'Morning Routine', assignedKidId: 'kid_series', dueDate: '2024-03-01',
        rewardAmount: 2, isComplete: false, recurrenceType: 'daily', recurrenceEndDate: '2024-03-05', // 5 days
        subTasks: [{ id: 'st_s1', title: 'Brush Teeth', isComplete: false }],
        createdAt: '2024-02-01T00:00:00.000Z', updatedAt: '2024-02-01T00:00:00.000Z',
      },
      { // Another definition to ensure other definitions/instances are not affected
        id: 'otherDef', title: 'Evening Reading', assignedKidId: 'kid_series', dueDate: '2024-03-01',
        rewardAmount: 1, isComplete: false, recurrenceType: 'daily', recurrenceEndDate: '2024-03-02',
        createdAt: '2024-02-01T00:00:00.000Z', updatedAt: '2024-02-01T00:00:00.000Z',
      }
    ];
    // Initial instances for seriesDef1
    seriesTestInstances = [
      // Day before fromDate for seriesDef1
      { id: 'seriesDef1_2024-02-29', choreDefinitionId: 'seriesDef1', instanceDate: '2024-02-29', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {'st_s1': false} },
      { id: 'seriesDef1_2024-03-01', choreDefinitionId: 'seriesDef1', instanceDate: '2024-03-01', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {'st_s1': false} },
      { id: 'seriesDef1_2024-03-02', choreDefinitionId: 'seriesDef1', instanceDate: '2024-03-02', categoryStatus: 'IN_PROGRESS', isComplete: false, subtaskCompletions: {'st_s1': true} }, // Different status
      { id: 'seriesDef1_2024-03-03', choreDefinitionId: 'seriesDef1', instanceDate: '2024-03-03', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {'st_s1': false} },
      // Instances for otherDef
      { id: 'otherDef_2024-03-01', choreDefinitionId: 'otherDef', instanceDate: '2024-03-01', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {} },
      { id: 'otherDef_2024-03-02', choreDefinitionId: 'otherDef', instanceDate: '2024-03-02', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {} },
    ];

    // This mock will apply to all tests in this describe block unless overridden by mockReturnValueOnce chain
    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'choreDefinitions') return JSON.stringify(seriesTestDefinitions);
        if (key === 'choreInstances') return JSON.stringify(seriesTestInstances);
        return null;
    });
  });

  test('updates rewardAmount for a series and regenerates future instances', async () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    const fromDate = '2024-03-02'; // Edit occurs on this instance
    const newReward = 5;

    await act(async () => {
      await result.current.updateChoreSeries('seriesDef1', { rewardAmount: newReward }, fromDate, 'rewardAmount');
    });

    const updatedDef = result.current.choreDefinitions.find(d => d.id === 'seriesDef1');
    expect(updatedDef?.rewardAmount).toBe(newReward);

    const finalInstances = result.current.choreInstances;
    // Instance before fromDate should be untouched
    const instanceBefore = finalInstances.find(i => i.id === 'seriesDef1_2024-03-01');
    expect(instanceBefore).toBeDefined();
    // Note: updateChoreSeries does not change past instances' reflection of definition props.
    // The definition linked by choreDefinitionId is updated, but past instances are not re-evaluated.

    // Instances on/after fromDate for seriesDef1 should be new/regenerated.
    // Their reward is implicitly the new definition reward, as no override mechanism is tested here.
    // Check if instances from fromDate reflect new generation (e.g. TO_DO status)
    const instanceOnFromDate = finalInstances.find(i => i.choreDefinitionId === 'seriesDef1' && i.instanceDate === '2024-03-02');
    expect(instanceOnFromDate).toBeDefined();
    expect(instanceOnFromDate?.categoryStatus).toBe('TO_DO'); // Regenerated instances default to TO_DO

    const instanceAfterFromDate = finalInstances.find(i => i.choreDefinitionId === 'seriesDef1' && i.instanceDate === '2024-03-03');
    expect(instanceAfterFromDate).toBeDefined();
    expect(instanceAfterFromDate?.categoryStatus).toBe('TO_DO');

    // Check that other definition's instances are untouched
    expect(finalInstances.filter(i => i.choreDefinitionId === 'otherDef').length).toBe(2);
  });

  test('updates dueDate for a series, shifts future instances, and preserves past ones', async () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });

    const fromDateWhenEdited = '2024-03-02'; // The instance of this date was "edited"
    const newSeriesStartDate = '2024-03-04'; // Series now starts from this date

    // Initial state check
    expect(result.current.choreInstances.find(i => i.id === 'seriesDef1_2024-03-02')).toBeDefined();
    expect(result.current.choreInstances.find(i => i.id === 'seriesDef1_2024-03-03')).toBeDefined();

    await act(async () => {
      await result.current.updateChoreSeries('seriesDef1', { dueDate: newSeriesStartDate }, fromDateWhenEdited, 'dueDate');
    });

    const updatedDef = result.current.choreDefinitions.find(d => d.id === 'seriesDef1');
    expect(updatedDef?.dueDate).toBe(newSeriesStartDate);

    const finalInstances = result.current.choreInstances;

    // Instance before fromDateWhenEdited should be untouched
    const instanceBefore = finalInstances.find(i => i.id === 'seriesDef1_2024-03-01');
    expect(instanceBefore).toBeDefined();

    // Instances from the original series that were on or after fromDateWhenEdited should be gone
    expect(finalInstances.find(i => i.id === 'seriesDef1_2024-03-02')).toBeUndefined();
    expect(finalInstances.find(i => i.id === 'seriesDef1_2024-03-03')).toBeUndefined();

    // New instances should be generated from newSeriesStartDate
    // seriesDef1 runs until 2024-03-05. New start is 2024-03-04. So, 03-04, 03-05.
    const newInstance1 = finalInstances.find(i => i.choreDefinitionId === 'seriesDef1' && i.instanceDate === '2024-03-04');
    expect(newInstance1).toBeDefined();
    expect(newInstance1?.categoryStatus).toBe('TO_DO');

    const newInstance2 = finalInstances.find(i => i.choreDefinitionId === 'seriesDef1' && i.instanceDate === '2024-03-05');
    expect(newInstance2).toBeDefined();
    expect(newInstance2?.categoryStatus).toBe('TO_DO');

    // Ensure no instances for seriesDef1 exist for 2024-03-06 (beyond original recurrenceEndDate)
    expect(finalInstances.find(i => i.choreDefinitionId === 'seriesDef1' && i.instanceDate === '2024-03-06')).toBeUndefined();

    // Check that other definition's instances are untouched
    expect(finalInstances.filter(i => i.choreDefinitionId === 'otherDef').length).toBe(2);
  });
});

describe('ChoresContext - Instance Description and Comments Activity Log', () => {
  let testDefinitions: ChoreDefinition[];
  let testInstances: ChoreInstance[];
  const testUserId = 'userTest123';
  const testUserName = 'User Tester';


  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    testDefinitions = [
      { ...initialTestDefinitions[0], id: 'def_desc_comment', title: "Desc Comment Chore", assignedKidId: 'kid_A', rewardAmount: 10, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
    ];
    testInstances = [
      { id: 'inst_desc_comment1', choreDefinitionId: 'def_desc_comment', instanceDate: '2024-03-01', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {}, instanceComments: [], activityLog: [] },
    ];
    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'choreDefinitions') return JSON.stringify(testDefinitions);
        if (key === 'choreInstances') return JSON.stringify(testInstances);
        return null;
    });
     // Mock currentUser from UserContext for logActivity
     const mockUserContextValue = { user: { id: testUserId, username: testUserName, kids:[], email:'' } };
    (useUserContext as vi.Mock).mockReturnValue(mockUserContextValue);
  });

  test('generateInstancesForPeriod initializes instanceDescription as undefined', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    // Clear initial instances loaded from localStorage for this specific test, to check generation logic
    act(() => { result.current.choreInstances.length = 0; }); // A bit hacky, better to control initial load

    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'choreDefinitions') return JSON.stringify(testDefinitions);
        if (key === 'choreInstances') return JSON.stringify([]); // Start with no instances
        return null;
    });
     // Re-render or re-initialize if context relies on initial load.
     // For this test, assuming generateInstancesForPeriod will create from scratch.
     // This test is more about the shape of newly generated instances.

    act(() => { result.current.generateInstancesForPeriod("2024-03-01", "2024-03-01"); });

    const newInstance = result.current.choreInstances.find(inst => inst.choreDefinitionId === 'def_desc_comment');
    expect(newInstance).toBeDefined();
    expect(newInstance?.instanceDescription).toBeUndefined();
  });

  test('updateChoreInstanceField correctly updates instanceDescription and logs activity', async () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    const instanceId = 'inst_desc_comment1';
    const newDescription = "This is a specific note for this instance.";

    await act(async () => {
      await result.current.updateChoreInstanceField(instanceId, 'instanceDescription', newDescription);
    });

    const updatedInstance = result.current.choreInstances.find(i => i.id === instanceId);
    expect(updatedInstance?.instanceDescription).toBe(newDescription);
    expect(updatedInstance?.activityLog).toBeDefined();
    expect(updatedInstance?.activityLog?.length).toBeGreaterThan(0);
    const logEntry = updatedInstance?.activityLog?.[0];
    expect(logEntry?.action).toBe('Instance Description Updated');
    expect(logEntry?.userName).toBe(testUserName); // From mocked UserContext
    expect(logEntry?.details).toContain(newDescription.substring(0,30));
  });

  test('updateChoreInstanceField logs activity when instanceDescription is cleared', async () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    const instanceId = 'inst_desc_comment1';
    // First set a description
    await act(async () => { await result.current.updateChoreInstanceField(instanceId, 'instanceDescription', "Initial description"); });
    // Then clear it
    await act(async () => { await result.current.updateChoreInstanceField(instanceId, 'instanceDescription', ''); });

    const updatedInstance = result.current.choreInstances.find(i => i.id === instanceId);
    expect(updatedInstance?.instanceDescription).toBe('');
    const logEntry = updatedInstance?.activityLog?.[0]; // Clearing adds a new log entry at the beginning
    expect(logEntry?.action).toBe('Instance Description Updated');
    expect(logEntry?.details).toBe('cleared');
  });

  test('addCommentToInstance adds a comment and logs activity', async () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    const instanceId = 'inst_desc_comment1';
    const commentText = "This is a test comment.";

    await act(async () => {
      await result.current.addCommentToInstance(instanceId, commentText, testUserId, testUserName);
    });

    const updatedInstance = result.current.choreInstances.find(i => i.id === instanceId);
    expect(updatedInstance?.instanceComments).toBeDefined();
    expect(updatedInstance?.instanceComments?.length).toBe(1);
    const addedComment = updatedInstance?.instanceComments?.[0];
    expect(addedComment?.text).toBe(commentText);
    expect(addedComment?.userId).toBe(testUserId);
    expect(addedComment?.userName).toBe(testUserName);

    expect(updatedInstance?.activityLog).toBeDefined();
    expect(updatedInstance?.activityLog?.length).toBeGreaterThan(0);
    const logEntry = updatedInstance?.activityLog?.[0];
    expect(logEntry?.action).toBe('Comment Added');
    expect(logEntry?.userId).toBe(testUserId);
    expect(logEntry?.userName).toBe(testUserName);
    expect(logEntry?.details).toContain(commentText.substring(0,30));
  });
});
