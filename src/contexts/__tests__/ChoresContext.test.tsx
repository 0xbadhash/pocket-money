// src/contexts/__tests__/ChoresContext.test.tsx
import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { ChoresProvider, useChoresContext, ChoresContext } from '../ChoresContext';
import { FinancialContext, FinancialContextType } from '../FinancialContext'; // For mocking
import type { ChoreDefinition, ChoreInstance } from '../../types'; // Corrected path
import type { ChoreContextType as ActualChoresContextType } from '../ChoresContext'; // Will be fixed next
// Kid type is not directly used in this file after review, ChoreDefinition has assignedKidId as string.
// import type { Kid } from '../../types';
import * as choreUtils from '../../utils/choreUtils'; // For mocking generateChoreInstances

// Mock generateChoreInstances
jest.mock('../../utils/choreUtils', () => ({
  ...jest.requireActual('../../utils/choreUtils'), // Import and retain default behavior
  generateChoreInstances: jest.fn(), // Mock specific function
}));

// Mock FinancialContext
const mockAddKidReward = jest.fn();
const mockFinancialContextValue: FinancialContextType = {
  financialData: { currentBalance: 0, transactions: [] },
  addFunds: jest.fn(),
  addTransaction: jest.fn(),
  addKidReward: mockAddKidReward,
};

// Test component to access context values
let capturedContextState: ActualChoresContextType | null = null;
const TestConsumerComponent = () => {
  capturedContextState = useChoresContext();
  return null;
};

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <FinancialContext.Provider value={mockFinancialContextValue}>
      <ChoresProvider>
        {ui}
        <TestConsumerComponent />
      </ChoresProvider>
    </FinancialContext.Provider>
  );
};

describe('ChoresContext', () => {
  beforeEach(() => {
    // Reset mocks and captured state before each test
    mockAddKidReward.mockClear();
    capturedContextState = null;
    // Potentially reset localStorage if ChoresProvider uses it for initialization,
    // though current implementation does not show this.
  });

  it('initializes with default chore definitions and empty instances', () => {
    renderWithProviders(<div />);
    expect(capturedContextState).not.toBeNull();
    expect(capturedContextState?.choreDefinitions.length).toBeGreaterThan(0); // Assuming default definitions exist
    expect(capturedContextState?.choreInstances.length).toBe(0); // Initially empty
  });

  describe('addChoreDefinition', () => {
    it('should add a new chore definition to the state', () => {
      renderWithProviders(<div />);
      const initialDefinitionsCount = capturedContextState?.choreDefinitions.length || 0;

      const newChoreData: Omit<ChoreDefinition, 'id' | 'isComplete'> = {
        title: 'Test New Chore',
        assignedKidId: 'kid_a',
        dueDate: '2024-01-01',
        rewardAmount: 5,
        recurrenceType: null,
      };

      act(() => {
        capturedContextState?.addChoreDefinition(newChoreData);
      });

      expect(capturedContextState?.choreDefinitions.length).toBe(initialDefinitionsCount + 1);
      const addedChore = capturedContextState?.choreDefinitions.find((def: ChoreDefinition) => def.title === 'Test New Chore');
      expect(addedChore).toBeDefined();
      expect(addedChore?.isComplete).toBe(false); // New definitions are active
      expect(addedChore?.assignedKidId).toBe('kid_a');
      expect(addedChore?.rewardAmount).toBe(5);
    });

    it('should correctly add a chore definition with optional fields (description, tags, subTasks)', () => {
      renderWithProviders(<div />);

      const newChoreData: Omit<ChoreDefinition, 'id' | 'isComplete'> = {
        title: 'Complex Chore',
        description: 'This is a detailed description.',
        assignedKidId: 'kid_b',
        dueDate: '2024-02-01',
        rewardAmount: 10,
        recurrenceType: 'daily',
        recurrenceEndDate: '2024-02-05',
        tags: ['test', 'complex'],
        subTasks: [{ id: 'st1', title: 'Subtask 1', isComplete: false }],
      };

      act(() => {
        capturedContextState?.addChoreDefinition(newChoreData);
      });

      const addedChore = capturedContextState?.choreDefinitions.find((def: ChoreDefinition) => def.title === 'Complex Chore');
      expect(addedChore).toBeDefined();
      expect(addedChore?.description).toBe('This is a detailed description.');
      expect(addedChore?.tags).toEqual(['test', 'complex']);
      expect(addedChore?.subTasks?.length).toBe(1);
      expect(addedChore?.subTasks?.[0].title).toBe('Subtask 1');
      expect(addedChore?.recurrenceType).toBe('daily');
    });
  });
  // More tests will be added here for each function

  describe('toggleChoreInstanceComplete', () => {
    const choreDefId = 'def1';
    const instanceId = `${choreDefId}_2024-01-15`;
    const kidId = 'kid_test';
    const reward = 5;

    const sampleDefinition: ChoreDefinition = {
      id: choreDefId,
      title: 'Test Chore for Toggling',
      assignedKidId: kidId,
      dueDate: '2024-01-15',
      rewardAmount: reward,
      isComplete: false, // Not used by instance completion directly
      recurrenceType: 'daily',
      recurrenceEndDate: '2024-01-16'
    };

    const sampleInstance: ChoreInstance = {
      id: instanceId,
      choreDefinitionId: choreDefId,
      instanceDate: '2024-01-15',
      isComplete: false,
    };

    beforeEach(() => {
      // Reset the mock before each test in this suite
      (choreUtils.generateChoreInstances as jest.Mock).mockClear();
      mockAddKidReward.mockClear(); // Also clear financial context mock

      // Setup initial state with the definition
      // We need to reach into the provider's state or re-render.
      // For simplicity here, we assume the definition is added,
      // and generateChoreInstances will be controlled.
    });

    it('should toggle an instance to complete and call addKidReward if applicable', () => {
      // Mock generateChoreInstances to return our sample instance
      (choreUtils.generateChoreInstances as jest.Mock).mockReturnValue([sampleInstance]);

      renderWithProviders(<div />); // Initial render

      // Add the definition that the instance refers to
      act(() => {
        capturedContextState?.addChoreDefinition(sampleDefinition);
      });

      // Trigger instance generation
      act(() => {
        capturedContextState?.generateInstancesForPeriod('2024-01-15', '2024-01-15');
      });

      // Verify instance is there and not complete
      let targetInstance = capturedContextState?.choreInstances.find((inst: ChoreInstance) => inst.id === instanceId);
      expect(targetInstance).toBeDefined();
      expect(targetInstance?.isComplete).toBe(false);

      // Toggle complete
      act(() => {
        capturedContextState?.toggleChoreInstanceComplete(instanceId);
      });

      targetInstance = capturedContextState?.choreInstances.find((inst: ChoreInstance) => inst.id === instanceId);
      expect(targetInstance?.isComplete).toBe(true);
      expect(mockAddKidReward).toHaveBeenCalledTimes(1);
      expect(mockAddKidReward).toHaveBeenCalledWith(
        kidId,
        reward,
        `${sampleDefinition.title} (${sampleInstance.instanceDate})`
      );
    });

    it('should toggle an instance to incomplete and not call addKidReward if it was already complete', () => {
      const completedInstance = { ...sampleInstance, isComplete: true };
      (choreUtils.generateChoreInstances as jest.Mock).mockReturnValue([completedInstance]);

      renderWithProviders(<div />);
      act(() => {
        capturedContextState?.addChoreDefinition(sampleDefinition);
      });
      act(() => {
        capturedContextState?.generateInstancesForPeriod('2024-01-15', '2024-01-15');
      });

      // Toggle incomplete
      act(() => {
        capturedContextState?.toggleChoreInstanceComplete(instanceId);
      });

      const targetInstance = capturedContextState?.choreInstances.find((inst: ChoreInstance) => inst.id === instanceId);
      expect(targetInstance?.isComplete).toBe(false);
      expect(mockAddKidReward).not.toHaveBeenCalled();
    });

    it('should not call addKidReward if rewardAmount is 0 or undefined', () => {
      const noRewardDefinition = { ...sampleDefinition, rewardAmount: 0 };
      (choreUtils.generateChoreInstances as jest.Mock).mockReturnValue([sampleInstance]);

      renderWithProviders(<div />);
      act(() => {
        capturedContextState?.addChoreDefinition(noRewardDefinition); // Add definition with no reward
      });
      act(() => {
        capturedContextState?.generateInstancesForPeriod('2024-01-15', '2024-01-15');
      });

      act(() => {
        capturedContextState?.toggleChoreInstanceComplete(instanceId);
      });

      expect(mockAddKidReward).not.toHaveBeenCalled();
    });

    it('should not call addKidReward if assignedKidId is undefined', () => {
      const unassignedDefinition = { ...sampleDefinition, assignedKidId: undefined };
      (choreUtils.generateChoreInstances as jest.Mock).mockReturnValue([sampleInstance]);

      renderWithProviders(<div />);
      act(() => {
        capturedContextState?.addChoreDefinition(unassignedDefinition);
      });
      act(() => {
        capturedContextState?.generateInstancesForPeriod('2024-01-15', '2024-01-15');
      });

      act(() => {
        capturedContextState?.toggleChoreInstanceComplete(instanceId);
      });
      expect(mockAddKidReward).not.toHaveBeenCalled();
    });

    it('should log a warning if instanceId is not found', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      renderWithProviders(<div />);

      act(() => {
        capturedContextState?.toggleChoreInstanceComplete('non_existent_instance_id');
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith('Chore instance with ID non_existent_instance_id not found.');
      consoleWarnSpy.mockRestore();
    });
  });

  describe('generateInstancesForPeriod', () => {
    const def1: ChoreDefinition = {
      id: 'def_daily', title: 'Daily chore', assignedKidId: 'k1', rewardAmount: 1,
      isComplete: false, recurrenceType: 'daily', dueDate: '2024-01-01', recurrenceEndDate: '2024-01-03'
    };
    const def2: ChoreDefinition = {
      id: 'def_weekly', title: 'Weekly chore', assignedKidId: 'k2', rewardAmount: 2,
      isComplete: false, recurrenceType: 'weekly', recurrenceDay: 2, // Tuesday
      dueDate: '2024-01-01', recurrenceEndDate: '2024-01-10'
    };
     const def_onetime: ChoreDefinition = {
      id: 'def_onetime', title: 'One time chore', assignedKidId: 'k1', rewardAmount: 1,
      isComplete: false, recurrenceType: null, dueDate: '2024-01-05'
    };

    const instance1_day1: ChoreInstance = { id: 'def_daily_2024-01-01', choreDefinitionId: 'def_daily', instanceDate: '2024-01-01', isComplete: false };
    const instance1_day2_completed: ChoreInstance = { id: 'def_daily_2024-01-02', choreDefinitionId: 'def_daily', instanceDate: '2024-01-02', isComplete: true };
    const instance1_day3: ChoreInstance = { id: 'def_daily_2024-01-03', choreDefinitionId: 'def_daily', instanceDate: '2024-01-03', isComplete: false };
    const instance2_tue1: ChoreInstance = { id: 'def_weekly_2024-01-02', choreDefinitionId: 'def_weekly', instanceDate: '2024-01-02', isComplete: false };
    const instance2_tue2: ChoreInstance = { id: 'def_weekly_2024-01-09', choreDefinitionId: 'def_weekly', instanceDate: '2024-01-09', isComplete: false };
    const instance_onetime: ChoreInstance = { id: 'def_onetime_2024-01-05', choreDefinitionId: 'def_onetime', instanceDate: '2024-01-05', isComplete: false };


    beforeEach(() => {
      (choreUtils.generateChoreInstances as jest.Mock).mockClear();
      // Initialize context with some definitions for these tests
      renderWithProviders(<div />); // Initial render to get context
      act(() => {
        capturedContextState?.addChoreDefinition(def1);
        capturedContextState?.addChoreDefinition(def2);
        capturedContextState?.addChoreDefinition(def_onetime);
      });
    });

    it('should call choreUtils.generateChoreInstances and update choreInstances state', () => {
      const mockGeneratedInstances = [instance1_day1, instance1_day2_completed, instance2_tue1];
      (choreUtils.generateChoreInstances as jest.Mock).mockReturnValue(mockGeneratedInstances);

      act(() => {
        capturedContextState?.generateInstancesForPeriod('2024-01-01', '2024-01-07');
      });

      // Check if the mock was called with the current definitions and the period
      expect(choreUtils.generateChoreInstances).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'def_daily' }),
          expect.objectContaining({ id: 'def_weekly' }),
          expect.objectContaining({ id: 'def_onetime' })
        ]),
        '2024-01-01',
        '2024-01-07'
      );
      expect(capturedContextState?.choreInstances).toEqual(mockGeneratedInstances);
    });

    it('should preserve completion status of existing instances when regenerating for the same period', () => {
      // First generation
      (choreUtils.generateChoreInstances as jest.Mock).mockReturnValueOnce([instance1_day1, { ...instance1_day2_completed, isComplete: false }, instance1_day3]);
      act(() => {
        capturedContextState?.generateInstancesForPeriod('2024-01-01', '2024-01-03');
      });

      // Manually complete an instance using toggleChoreInstanceComplete
      act(() => {
        // Ensure the definition for instance1_day2_completed (def1) has reward for this to not be an issue
        capturedContextState?.toggleChoreInstanceComplete(instance1_day2_completed.id);
      });

      let completedInstance = capturedContextState?.choreInstances.find(i => i.id === instance1_day2_completed.id);
      expect(completedInstance?.isComplete).toBe(true);

      // Second generation for the same period, mock returns them as initially not complete
      (choreUtils.generateChoreInstances as jest.Mock).mockReturnValueOnce([
        {...instance1_day1, isComplete: false}, // Simulating fresh generation
        {...instance1_day2_completed, isComplete: false},
        {...instance1_day3, isComplete: false}
      ]);
      act(() => {
        capturedContextState?.generateInstancesForPeriod('2024-01-01', '2024-01-03');
      });

      // Verify the previously completed instance retains its status
      completedInstance = capturedContextState?.choreInstances.find(i => i.id === instance1_day2_completed.id);
      expect(completedInstance?.isComplete).toBe(true);
      // And others that were not completed remain not completed
      const day1Instance = capturedContextState?.choreInstances.find(i => i.id === instance1_day1.id);
      expect(day1Instance?.isComplete).toBe(false);
    });

    it('should filter out old instances not in the new generation period but keep those outside it', () => {
      // Instance outside the period we'll test with later
      const instance_outside_period = { id: 'def_daily_2023-12-31', choreDefinitionId: 'def_daily', instanceDate: '2023-12-31', isComplete: true };

      (choreUtils.generateChoreInstances as jest.Mock)
        .mockReturnValueOnce([instance_outside_period]) // Initial state setup
        .mockReturnValueOnce([instance1_day1, instance1_day2_completed]); // For the actual test period

      // Set up an initial state with an instance outside the main test period
      act(() => {
        capturedContextState?.generateInstancesForPeriod('2023-12-31', '2023-12-31');
      });
      expect(capturedContextState?.choreInstances).toEqual([instance_outside_period]);

      // Now generate for a new period
      act(() => {
        capturedContextState?.generateInstancesForPeriod('2024-01-01', '2024-01-02');
      });

      expect(capturedContextState?.choreInstances).toContainEqual(instance_outside_period);
      expect(capturedContextState?.choreInstances).toContainEqual(instance1_day1);
      expect(capturedContextState?.choreInstances).toContainEqual(instance1_day2_completed);
      expect(capturedContextState?.choreInstances.length).toBe(3);
    });
  });

  describe('toggleSubTaskComplete', () => {
    const choreDefIdWithSubtasks = 'def_with_subs';
    const subTaskId1 = 'st1';
    const subTaskId2 = 'st2';

    const definitionWithSubtasks: ChoreDefinition = {
      id: choreDefIdWithSubtasks,
      title: 'Chore with Subtasks',
      assignedKidId: 'k1',
      dueDate: '2024-03-01',
      rewardAmount: 3,
      isComplete: false,
      recurrenceType: null,
      subTasks: [
        { id: subTaskId1, title: 'Subtask 1', isComplete: false },
        { id: subTaskId2, title: 'Subtask 2', isComplete: false },
      ],
    };

    beforeEach(() => {
      // Initialize context with the definition
      renderWithProviders(<div />);
      act(() => {
        // Clear any default definitions if they might interfere by having same ID
        // For this test, let's assume capturedContextState.choreDefinitions can be reset or this is the only one.
        // A cleaner way would be to allow ChoresProvider to take initial definitions.
        // For now, we add if not present.
        if (!capturedContextState?.choreDefinitions.find(d => d.id === choreDefIdWithSubtasks)) {
          capturedContextState?.addChoreDefinition(definitionWithSubtasks);
        } else {
          // If it exists, ensure subtasks are reset (important for subsequent test runs in watch mode)
           const existingDef = capturedContextState?.choreDefinitions.find(d => d.id === choreDefIdWithSubtasks);
           if (existingDef) {
            existingDef.subTasks = definitionWithSubtasks.subTasks?.map(st => ({...st})); // Type for st can be inferred if subTasks is typed
           }
        }
      });
    });

    it('should toggle the completion status of a specified sub-task', () => {
      act(() => {
        capturedContextState?.toggleSubTaskComplete(choreDefIdWithSubtasks, subTaskId1);
      });

      let def = capturedContextState?.choreDefinitions.find((d: ChoreDefinition) => d.id === choreDefIdWithSubtasks);
      expect(def?.subTasks?.find(st => st.id === subTaskId1)?.isComplete).toBe(true); // Type for st can be inferred
      expect(def?.subTasks?.find(st => st.id === subTaskId2)?.isComplete).toBe(false); // Type for st can be inferred

      // Toggle it back
      act(() => {
        capturedContextState?.toggleSubTaskComplete(choreDefIdWithSubtasks, subTaskId1);
      });
      def = capturedContextState?.choreDefinitions.find((d: ChoreDefinition) => d.id === choreDefIdWithSubtasks);
      expect(def?.subTasks?.find(st => st.id === subTaskId1)?.isComplete).toBe(false); // Type for st can be inferred
    });

    it('should not affect other sub-tasks or chore definitions', () => {
      // Add another definition to ensure no cross-contamination
      const otherDefId = 'other_def';
      const otherDefinition: ChoreDefinition = {
        id: otherDefId, title: 'Another Chore', assignedKidId: 'k2', dueDate: '2024-03-01',
        rewardAmount: 1, isComplete: false, recurrenceType: null,
        subTasks: [{ id: 'st_other', title: 'Other Subtask', isComplete: false }]
      };
      act(() => {
        capturedContextState?.addChoreDefinition(otherDefinition);
      });

      act(() => {
        capturedContextState?.toggleSubTaskComplete(choreDefIdWithSubtasks, subTaskId1);
      });

      const mainDef = capturedContextState?.choreDefinitions.find((d: ChoreDefinition) => d.id === choreDefIdWithSubtasks);
      expect(mainDef?.subTasks?.find(st => st.id === subTaskId1)?.isComplete).toBe(true); // st inferred
      expect(mainDef?.subTasks?.find(st => st.id === subTaskId2)?.isComplete).toBe(false); // st inferred

      const otherDefUnchanged = capturedContextState?.choreDefinitions.find((d: ChoreDefinition) => d.id === otherDefId);
      expect(otherDefUnchanged?.subTasks?.[0]?.isComplete).toBe(false);
    });

    it('should do nothing if chore definition or sub-task ID is not found', () => {
       const originalDefinitions = JSON.parse(JSON.stringify(capturedContextState?.choreDefinitions));

      act(() => {
        capturedContextState?.toggleSubTaskComplete('non_existent_def_id', subTaskId1);
      });
      expect(capturedContextState?.choreDefinitions).toEqual(originalDefinitions);

      act(() => {
        capturedContextState?.toggleSubTaskComplete(choreDefIdWithSubtasks, 'non_existent_subtask_id');
      });
      expect(capturedContextState?.choreDefinitions).toEqual(originalDefinitions);
    });
  });

  describe('getChoreDefinitionsForKid', () => {
    const kid1 = 'kid_uno';
    const kid2 = 'kid_dos';
    const defKid1_1: ChoreDefinition = { id: 'def_k1_1', title: 'Kid1 Chore 1', assignedKidId: kid1, dueDate: '2024-01-01', rewardAmount: 1, isComplete: false, recurrenceType: null };
    const defKid1_2: ChoreDefinition = { id: 'def_k1_2', title: 'Kid1 Chore 2', assignedKidId: kid1, dueDate: '2024-01-02', rewardAmount: 1, isComplete: false, recurrenceType: null };
    const defKid2_1: ChoreDefinition = { id: 'def_k2_1', title: 'Kid2 Chore 1', assignedKidId: kid2, dueDate: '2024-01-03', rewardAmount: 1, isComplete: false, recurrenceType: null };
    const defUnassigned: ChoreDefinition = { id: 'def_un', title: 'Unassigned Chore', assignedKidId: undefined, dueDate: '2024-01-04', rewardAmount: 1, isComplete: false, recurrenceType: null };

    beforeEach(() => {
      renderWithProviders(<div />);
      act(() => {
        // Ensure a clean slate of definitions relevant to this test
        // This is a simplified way; ideally, ChoresProvider could accept initial state.
        const currentDefs = capturedContextState?.choreDefinitions || [];
        const idsToAdd = [defKid1_1.id, defKid1_2.id, defKid2_1.id, defUnassigned.id];
        const existingDefaultDefIds = currentDefs.filter((d: ChoreDefinition) => !idsToAdd.includes(d.id)).map((d: ChoreDefinition) => d.id);

        // A bit of a hack to reset state for the test - remove default definitions if they don't match what we are testing
        // This is because ChoresProvider initializes with its own set of default chores.
        // A more robust approach would be to allow ChoresProvider to be initialized with a specific set of chores for testing.
        if (existingDefaultDefIds.length > 0 && currentDefs.length !==4) { // Heuristic: if default + our test defs != current
            // This part is tricky as we cannot directly "remove" definitions.
            // For now, we accept default definitions might exist alongside.
            // The filter logic in getChoreDefinitionsForKid should still work.
        }

        if (!currentDefs.find((d: ChoreDefinition) => d.id === defKid1_1.id)) capturedContextState?.addChoreDefinition(defKid1_1);
        if (!currentDefs.find((d: ChoreDefinition) => d.id === defKid1_2.id)) capturedContextState?.addChoreDefinition(defKid1_2);
        if (!currentDefs.find((d: ChoreDefinition) => d.id === defKid2_1.id)) capturedContextState?.addChoreDefinition(defKid2_1);
        if (!currentDefs.find((d: ChoreDefinition) => d.id === defUnassigned.id)) capturedContextState?.addChoreDefinition(defUnassigned);
      });
    });

    it('should return only chore definitions assigned to the specified kidId', () => {
      const kid1Chores = capturedContextState?.getChoreDefinitionsForKid(kid1);
      expect(kid1Chores?.length).toBe(2);
      expect(kid1Chores).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'def_k1_1' }),
        expect.objectContaining({ id: 'def_k1_2' }),
      ]));

      const kid2Chores = capturedContextState?.getChoreDefinitionsForKid(kid2);
      expect(kid2Chores?.length).toBe(1);
      expect(kid2Chores).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'def_k2_1' }),
      ]));
    });

    it('should return an empty array if no chores are assigned to the kidId', () => {
      const noKidChores = capturedContextState?.getChoreDefinitionsForKid('non_existent_kid');
      expect(noKidChores?.length).toBe(0);
    });

    it('should not include unassigned chores when a specific kidId is requested', () => {
        const kid1Chores = capturedContextState?.getChoreDefinitionsForKid(kid1);
        expect(kid1Chores?.find((c: ChoreDefinition) => c.id === 'def_un')).toBeUndefined();
    });
  });
});
