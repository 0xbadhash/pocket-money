import { describe, it, test, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

vi.mock('./DateColumnView', () => ({
  default: vi.fn(() => <div data-testid="date-column-view-mock">DateColumnView</div>),
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChoresContext, ChoresContextType } from '../../contexts/ChoresContext';
import { UserContext, UserContextType as AppUserContextType } from '../../contexts/UserContext';
import KidKanbanBoard from './KidKanbanBoard';
import DateColumnView from './DateColumnView'; // Import the mocked version
import type { ChoreDefinition, ChoreInstance, KanbanColumnConfig, Kid, MatrixKanbanCategory } from '../../types';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import userEvent from '@testing-library/user-event';
import { getTodayDateString } from '../../utils/dateUtils';

// Mock dnd-kit
let dndContextProps: any = {};
vi.mock('@dnd-kit/core', async (importOriginal) => {
    const actual = await importOriginal() as object;
    return {
        ...actual,
        DndContext: vi.fn((props) => {
            dndContextProps = props;
            return <>{props.children}</>;
        }),
        useSensor: vi.fn(),
        useSensors: vi.fn(() => []),
        DragOverlay: vi.fn(({ children }: { children: React.ReactNode }) => children ? <div data-testid="drag-overlay-content">{children}</div> : null)
    };
});
vi.mock('@dnd-kit/sortable', async (importOriginal) => {
  const actual = await importOriginal() as object;
  return {
    ...actual,
    sortableKeyboardCoordinates: vi.fn(),
    arrayMove: vi.fn((arr) => arr),
    SortableContext: vi.fn((props: any) => <>{props.children}</>)
  };
});

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

const mockBaseChoresContextValue: Partial<ChoresContextType> = {
  choreDefinitions: [], choreInstances: [],
  generateInstancesForPeriod: vi.fn(), updateChoreInstanceCategory: vi.fn(),
  getChoreDefinitionsForKid: vi.fn(() => []), toggleChoreInstanceComplete: vi.fn(),
  toggleSubtaskCompletionOnInstance: vi.fn(), toggleChoreDefinitionActiveState: vi.fn(),
  updateChoreDefinition: vi.fn(), updateChoreInstanceField: vi.fn(),
  batchToggleCompleteChoreInstances: vi.fn(), batchUpdateChoreInstancesCategory: vi.fn(),
  batchAssignChoreDefinitionsToKid: vi.fn(), addChoreDefinition: vi.fn(),
};

const mockBaseUserContextValue: Partial<AppUserContextType> = {
  user: { id: 'user1', username: 'Test User', email: '', kids: [{id: 'kid1', name: 'Test Kid', kanbanColumnConfigs: []}]},
  loading: false, error: null, getKanbanColumnConfigs: vi.fn(() => []),
  login: vi.fn(), logout: vi.fn(), updateUser: vi.fn(), addKid: vi.fn(), updateKid: vi.fn(), deleteKid: vi.fn(),
  addKanbanColumnConfig: vi.fn(), updateKanbanColumnConfig: vi.fn(), deleteKanbanColumnConfig: vi.fn(), reorderKanbanColumnConfigs: vi.fn(),
};

// Legacy tests commented out
// describe('KidKanbanBoard - Rendering and Basic Interactions (Part 1)', () => { ... });
// describe('KidKanbanBoard - Drag and Drop Event Handling (Part 2)', () => { ... });

describe('KidKanbanBoard - Matrix View', () => {
  let mockMatrixChoresContext: ChoresContextType;
  let mockMatrixUserContext: AppUserContextType;
  let mockMatrixChoreInstances: ChoreInstance[];
  let mockMatrixChoreDefinitions: ChoreDefinition[];
  let mockMatrixSwimlaneConfigs: KanbanColumnConfig[];
  let visibleTestDates: Date[];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
    localStorageMock.getItem.mockReturnValue(null);

    const todayForTest = new Date();
    todayForTest.setHours(0,0,0,0);
    const todayStr = todayForTest.toISOString().split('T')[0];

    visibleTestDates = [];
    const startDateForVisible = new Date(todayForTest);
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDateForVisible);
      day.setDate(startDateForVisible.getDate() + i);
      visibleTestDates.push(day);
    }

    mockMatrixChoreDefinitions = [
      { id: 'def1_matrix', title: 'Matrix Chore 1', assignedKidId: 'kid_matrix', isComplete: false, dueDate: todayStr, recurrenceType: null, subTasks: [], tags: [], rewardAmount: 1, earlyStartDate: undefined, updatedAt: '', createdAt: '' },
      { id: 'def2_matrix', title: 'Matrix Chore 2', assignedKidId: 'kid_matrix', isComplete: false, dueDate: todayStr, recurrenceType: null, subTasks: [], tags: [], rewardAmount: 2, earlyStartDate: undefined, updatedAt: '', createdAt: '' },
    ];
    mockMatrixChoreInstances = [
      { id: 'inst1_matrix', choreDefinitionId: 'def1_matrix', instanceDate: todayStr, isComplete: false, categoryStatus: 'TO_DO', subtaskCompletions: {} },
      { id: 'inst2_matrix', choreDefinitionId: 'def2_matrix', instanceDate: todayStr, isComplete: false, categoryStatus: 'IN_PROGRESS', subtaskCompletions: {} },
    ];
    mockMatrixSwimlaneConfigs = [
      { id: 'swim1', kidId: 'kid_matrix', title: 'To Do Tasks', order: 0, color: '#FF0000', createdAt: 't', updatedAt: 't' },
      { id: 'swim2', kidId: 'kid_matrix', title: 'In Progress Tasks', order: 1, color: '#00FF00', createdAt: 't', updatedAt: 't' },
      { id: 'swim3', kidId: 'kid_matrix', title: 'Done Tasks', order: 2, color: '#0000FF', createdAt: 't', updatedAt: 't' },
    ];

    mockMatrixChoresContext = {
      ...mockBaseChoresContextValue,
      choreDefinitions: mockMatrixChoreDefinitions,
      choreInstances: mockMatrixChoreInstances,
      getChoreDefinitionsForKid: vi.fn((kidId: string) => mockMatrixChoreDefinitions.filter(d => d.assignedKidId === kidId)),
      generateInstancesForPeriod: vi.fn(),
      updateChoreInstanceCategory: vi.fn(),
    } as ChoresContextType;

    mockMatrixUserContext = {
      ...mockBaseUserContextValue,
      user: {
        id: 'user_matrix', username: 'Matrix User', email: 'matrix@example.com',
        kids: [{ id: 'kid_matrix', name: 'Matrix Kid', kanbanColumnConfigs: mockMatrixSwimlaneConfigs, age: 0, totalFunds:0 }],
        settings: {}, createdAt: '', updatedAt: '',
      },
      getKanbanColumnConfigs: vi.fn((kidId: string) => {
        const currentContextUser = mockMatrixUserContext.user;
        const kid = currentContextUser?.kids.find(k => k.id === kidId);
        return kid?.kanbanColumnConfigs || [];
      }),
    } as AppUserContextType;
  });

  const renderMatrixBoard = (kidId = 'kid_matrix') => {
    return render(
      <UserContext.Provider value={mockMatrixUserContext}>
        <ChoresContext.Provider value={mockMatrixChoresContext}>
          <KidKanbanBoard kidId={kidId} />
        </ChoresContext.Provider>
      </UserContext.Provider>
    );
  };

  test('renders the matrix grid with date headers and swimlanes', () => {
    renderMatrixBoard();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    const mockCalls = (DateColumnView as ReturnType<typeof vi.fn>).mock.calls.length;
    const expectedDateColumnViewCalls = 7 * mockMatrixSwimlaneConfigs.length;
    // Account for React StrictMode double renders in dev/test
    const isStrictModeDoubleRender = mockCalls === expectedDateColumnViewCalls * 2;
    const isNormalRender = mockCalls === expectedDateColumnViewCalls;
    expect(isStrictModeDoubleRender || isNormalRender).toBe(true);
  });

  test('passes correct swimlaneConfig and date to DateColumnView for each date and swimlane', () => {
    renderMatrixBoard();

    mockMatrixSwimlaneConfigs.forEach(expectedSwimlaneConfig => {
      visibleTestDates.forEach(expectedDateObj => {
        const expectedDateString = expectedDateObj.toISOString().split('T')[0];

        const matchingCall = (DateColumnView as ReturnType<typeof vi.fn>).mock.calls.find(call => {
          const props = call[0];
          const callDateString = props.date.toISOString().split('T')[0];
          return props.swimlaneConfig.id === expectedSwimlaneConfig.id && callDateString === expectedDateString;
        });

        expect(matchingCall).toBeDefined(); // Ensure a call for this specific date & swimlane exists
        if (matchingCall) {
          const props = matchingCall[0];
          expect(props.kidId).toBe('kid_matrix');
          expect(props.swimlaneConfig.id).toBe(expectedSwimlaneConfig.id);
          expect(props.swimlaneConfig.title).toBe(expectedSwimlaneConfig.title);
          expect(props.swimlaneConfig.color).toBe(expectedSwimlaneConfig.color);
          expect(props.selectedInstanceIds).toEqual([]);
          expect(props.onToggleSelection).toBeInstanceOf(Function);
          expect(props.onEditChore).toBeInstanceOf(Function);
          // expect(props.getSwimlaneId).toBeInstanceOf(Function); // Prop is commented out in KidKanbanBoard.tsx
        }
      });
    });
  });

  test('Kid selection buttons are rendered and functional', async () => {
    const user = userEvent.setup();
    const kid2MatrixSwimlaneConfigs: KanbanColumnConfig[] = [
      { id: 'swim_kid2_1', kidId: 'kid_matrix_2', title: 'Kid 2 To Do', order: 0, color: '#ABCDEF', createdAt: 't', updatedAt: 't' },
    ];
    if (!mockMatrixUserContext.user) throw new Error("mockMatrixUserContext.user is null");
    mockMatrixUserContext.user.kids.push({ id: 'kid_matrix_2', name: 'Matrix Kid Two', kanbanColumnConfigs: kid2MatrixSwimlaneConfigs, age: 0, totalFunds:0 });

    (mockMatrixUserContext.getKanbanColumnConfigs as ReturnType<typeof vi.fn>).mockImplementation((kidId: string) => {
        if (kidId === 'kid_matrix') return mockMatrixSwimlaneConfigs;
        if (kidId === 'kid_matrix_2') return kid2MatrixSwimlaneConfigs;
        return [];
    });

    renderMatrixBoard('kid_matrix');

    expect(screen.getByRole('button', { name: 'Matrix Kid' })).toBeInTheDocument();
    const kidTwoButton = screen.getByRole('button', { name: 'Matrix Kid Two' });
    expect(kidTwoButton).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Matrix Kid' })).toHaveStyle('font-weight: bold');
    expect(kidTwoButton).not.toHaveStyle('font-weight: bold');

    await user.click(kidTwoButton);

    expect(kidTwoButton).toHaveStyle('font-weight: bold');
    expect(screen.getByRole('button', { name: 'Matrix Kid' })).not.toHaveStyle('font-weight: bold');
    expect(mockMatrixUserContext.getKanbanColumnConfigs).toHaveBeenCalledWith('kid_matrix_2');
  });
});
