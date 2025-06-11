// src/ui/kanban_components/KidKanbanBoard.test.tsx
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KidKanbanBoard from './KidKanbanBoard';
import { ChoresContext, ChoresContextType } from '../../contexts/ChoresContext';
import type { ChoreInstance, ChoreDefinition, KanbanColumn as KanbanColumnType } from '../../types';
import { vi } from 'vitest';
import { getTodayDateString, getWeekRange, getMonthRange } from '../../utils/dateUtils'; // For checking generateInstancesForPeriod calls
import type { DragStartEvent, DragEndEvent, Active, Over, DragCancelEvent } from '@dnd-kit/core';


// Mock Child Component: KanbanColumn
const mockKanbanColumn = vi.fn(({ column, theme }) => (
  <div data-testid={`mock-kanban-column-${column.id}`} data-theme={theme}>
    <h3>{column.title}</h3>
    {/* Render chore IDs to check order and presence */}
    {column.chores.map((c: ChoreInstance) => <div key={c.id} data-testid={`chore-${c.id}`}>{c.id} ({c.isComplete ? 'C' : 'A'})</div>)}
  </div>
));
vi.mock('./KanbanColumn', () => ({
  default: mockKanbanColumn,
}));

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

// Mock dnd-kit
let dndContextProps: any = {};
const mockDragOverlay = vi.fn(({ children }) => children ? <div data-testid="drag-overlay-content">{children}</div> : null);

vi.mock('@dnd-kit/core', async (importOriginal) => {
    const actual = await importOriginal() as object;
    return {
        ...actual,
        DndContext: vi.fn((props) => {
            dndContextProps = props; // Capture props
            return <>{props.children}</>;
        }),
        useSensor: vi.fn(),
        useSensors: vi.fn(() => []),
        DragOverlay: mockDragOverlay // Use the spy mock for DragOverlay
    };
});
vi.mock('@dnd-kit/sortable', async (importOriginal) => {
    const actual = await importOriginal() as object;
    return {
        ...actual,
        sortableKeyboardCoordinates: vi.fn(),
        arrayMove: vi.fn((arr, from, to) => {
            const newArr = [...arr];
            if (from < 0 || from >= newArr.length || to < 0 || to >= newArr.length) return newArr; // bounds check
            const [moved] = newArr.splice(from, 1);
            newArr.splice(to, 0, moved);
            return newArr;
        })
    };
});

// Mock ChoresContext
const mockGenerateInstancesForPeriod = vi.fn();
const mockToggleChoreInstanceComplete = vi.fn();

const mockChoreDefinitions: ChoreDefinition[] = [
  { id: 'def1', title: 'Walk the Dog', assignedKidId: 'kid1', rewardAmount: 5, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  { id: 'def2', title: 'Clean Room', assignedKidId: 'kid1', rewardAmount: 10, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  { id: 'def3', title: 'Do Homework', assignedKidId: 'kid1', rewardAmount: 0, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  { id: 'def4', title: 'Wash Dishes', assignedKidId: 'kid2', rewardAmount: 3, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
];

const today = getTodayDateString();
let mockChoreInstancesData: ChoreInstance[]; // Mutable for tests

const resetMockChoreInstances = () => {
    mockChoreInstancesData = [
        { id: 'inst1', choreDefinitionId: 'def1', instanceDate: today, isComplete: false },
        { id: 'inst2', choreDefinitionId: 'def2', instanceDate: today, isComplete: true },
        { id: 'inst3', choreDefinitionId: 'def3', instanceDate: today, isComplete: false },
        { id: 'inst4', choreDefinitionId: 'def4', instanceDate: today, isComplete: false },
    ];
};


const mockContextValue: ChoresContextType = {
  choreDefinitions: mockChoreDefinitions,
  get choreInstances() { return mockChoreInstancesData; }, // Use getter to ensure tests get updated data
  generateInstancesForPeriod: mockGenerateInstancesForPeriod,
  toggleChoreInstanceComplete: mockToggleChoreInstanceComplete,
  getDefinitionById: (id) => mockChoreDefinitions.find(d => d.id === id),
  getInstancesForDefinition: (defId) => mockChoreInstancesData.filter(i => i.choreDefinitionId === defId),
  loadingDefinitions: false, loadingInstances: false, errorDefinitions: null, errorInstances: null,
  addChoreDefinition: vi.fn(), updateChoreDefinition: vi.fn(), deleteChoreDefinition: vi.fn(),
  addChoreInstance: vi.fn(), updateChoreInstance: vi.fn(), deleteChoreInstance: vi.fn(),
  toggleSubTaskComplete: vi.fn(),
};

const renderKidKanbanBoard = (kidId = 'kid1', context = mockContextValue) => {
  // Ensure choreInstances in context is fresh for each render if modified by tests
  const freshContext = {...context, choreInstances: [...mockChoreInstancesData]};
  return render(
    <ChoresContext.Provider value={freshContext}>
      <KidKanbanBoard kidId={kidId} />
    </ChoresContext.Provider>
  );
};

// Helper for D&D event objects
const createMockActive = (id: string, containerId: string, index = 0, items: string[] = []): Active => ({
  id,
  data: { current: { sortable: { containerId, index, items } } },
  rect: { current: { initial: null, translated: null } },
});

const createMockOver = (id: string, containerId?: string, index = 0, items: string[] = []): Over => ({
  id,
  rect: { width: 0, height: 0, top: 0, left: 0 },
  data: { current: containerId ? { sortable: { containerId, index, items } } : {} },
  disabled: false,
});


describe('KidKanbanBoard - Rendering and Basic Interactions (Part 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'kanban_columnTheme') return 'default';
        return null;
    });
    resetMockChoreInstances(); // Reset instances for each test in this block too
    dndContextProps = {}; // Reset captured DndContext props
  });

  test('renders initial controls and calls generateInstancesForPeriod for today', () => {
    renderKidKanbanBoard();
    expect(screen.getByRole('button', { name: 'Daily' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Weekly' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Monthly' })).toBeEnabled();

    expect(screen.getByLabelText(/Filter by Reward:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sort by:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Column Theme:/i)).toBeInTheDocument();

    const todayStr = getTodayDateString();
    expect(mockGenerateInstancesForPeriod).toHaveBeenCalledWith(todayStr, todayStr);
  });

  test('renders columns and chores correctly for default (daily) period', () => {
    renderKidKanbanBoard('kid1');
    expect(screen.getByRole('heading', { name: 'Today - Active' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Today - Completed' })).toBeInTheDocument();

    const activeColumn = screen.getByTestId('mock-kanban-column-daily_active');
    expect(within(activeColumn).getByTestId('chore-inst1')).toHaveTextContent('inst1 (A)');
    expect(within(activeColumn).getByTestId('chore-inst3')).toHaveTextContent('inst3 (A)');
    expect(within(activeColumn).queryByTestId('chore-inst2')).not.toBeInTheDocument();
    expect(within(activeColumn).queryByTestId('chore-inst4')).not.toBeInTheDocument();

    const completedColumn = screen.getByTestId('mock-kanban-column-daily_completed');
    expect(within(completedColumn).getByTestId('chore-inst2')).toHaveTextContent('inst2 (C)');
    expect(within(completedColumn).queryByTestId('chore-inst1')).not.toBeInTheDocument();
  });

  test('period selection calls generateInstancesForPeriod and updates titles', async () => {
    const user = userEvent.setup();
    renderKidKanbanBoard();

    await user.click(screen.getByRole('button', { name: 'Weekly' }));
    const weekRange = getWeekRange(new Date());
    expect(mockGenerateInstancesForPeriod).toHaveBeenCalledWith(
      weekRange.start.toISOString().split('T')[0],
      weekRange.end.toISOString().split('T')[0]
    );
    expect(screen.getByRole('heading', { name: 'This Week - Active' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Monthly' }));
    const monthRange = getMonthRange(new Date());
    expect(mockGenerateInstancesForPeriod).toHaveBeenCalledWith(
      monthRange.start.toISOString().split('T')[0],
      monthRange.end.toISOString().split('T')[0]
    );
    expect(screen.getByRole('heading', { name: 'This Month - Active' })).toBeInTheDocument();
  });

  test('reward filter updates displayed chores', async () => {
    const user = userEvent.setup();
    renderKidKanbanBoard('kid1');

    let activeColumn = screen.getByTestId('mock-kanban-column-daily_active');
    expect(within(activeColumn).getByTestId('chore-inst1')).toBeInTheDocument();
    expect(within(activeColumn).getByTestId('chore-inst3')).toBeInTheDocument();

    const rewardFilterSelect = screen.getByLabelText(/Filter by Reward:/i);
    await user.selectOptions(rewardFilterSelect, 'has_reward');

    activeColumn = screen.getByTestId('mock-kanban-column-daily_active'); // Re-query after update
    expect(within(activeColumn).getByTestId('chore-inst1')).toBeInTheDocument();
    expect(within(activeColumn).queryByTestId('chore-inst3')).not.toBeInTheDocument();

    await user.selectOptions(rewardFilterSelect, 'no_reward');
    activeColumn = screen.getByTestId('mock-kanban-column-daily_active'); // Re-query
    expect(within(activeColumn).queryByTestId('chore-inst1')).not.toBeInTheDocument();
    expect(within(activeColumn).getByTestId('chore-inst3')).toBeInTheDocument();
  });

  test('sort option changes order of chores', async () => {
    const user = userEvent.setup();
    const sortTestInstances: ChoreInstance[] = [
      { id: 'c_inst', choreDefinitionId: 'def3', instanceDate: today, isComplete: false }, // Reward 0
      { id: 'a_inst', choreDefinitionId: 'def1', instanceDate: today, isComplete: false }, // Reward 5
      { id: 'b_inst', choreDefinitionId: 'def2', instanceDate: today, isComplete: false }, // Reward 10
    ];
    // Definitions need to match IDs used in sortTestInstances
    const customContext = { ...mockContextValue, choreInstances: [...sortTestInstances], choreDefinitions: [...mockChoreDefinitions] };
    renderKidKanbanBoard('kid1', customContext);

    const sortBySelect = screen.getByLabelText(/Sort by:/i);
    const sortDirectionButton = screen.getByRole('button', { name: /A-Z \/ Old-New ↓/i });

    await user.selectOptions(sortBySelect, 'title');
    let activeColumnChores = mockKanbanColumn.mock.calls.find(call => call[0].column.id === 'daily_active')[0].column.chores;
    // Titles: Walk the Dog (def1, a_inst), Clean Room (def2, b_inst), Do Homework (def3, c_inst)
    // Expected order for title ASC: Clean Room, Do Homework, Walk the Dog
    expect(activeColumnChores.map((c:ChoreInstance) => c.id)).toEqual(['b_inst', 'c_inst', 'a_inst']);

    await user.click(sortDirectionButton);
    activeColumnChores = mockKanbanColumn.mock.calls.find(call => call[0].column.id === 'daily_active')[0].column.chores;
    expect(activeColumnChores.map((c:ChoreInstance) => c.id)).toEqual(['a_inst', 'c_inst', 'b_inst']);

    await user.selectOptions(sortBySelect, 'rewardAmount'); // Default to DESC for reward
    activeColumnChores = mockKanbanColumn.mock.calls.find(call => call[0].column.id === 'daily_active')[0].column.chores;
    // Rewards: a_inst (5), b_inst (10), c_inst (0). DESC: b_inst, a_inst, c_inst
    expect(activeColumnChores.map((c:ChoreInstance) => c.id)).toEqual(['b_inst', 'a_inst', 'c_inst']);

    await user.click(screen.getByRole('button', { name: /High to Low ↓/i })); // Change to ASC
    activeColumnChores = mockKanbanColumn.mock.calls.find(call => call[0].column.id === 'daily_active')[0].column.chores;
    expect(activeColumnChores.map((c:ChoreInstance) => c.id)).toEqual(['c_inst', 'a_inst', 'b_inst']);
  });

  test('theme selection updates localStorage and column theme prop', async () => {
    const user = userEvent.setup();
    renderKidKanbanBoard();

    const themeSelect = screen.getByLabelText(/Column Theme:/i);
    await user.selectOptions(themeSelect, 'pastel');

    expect(localStorageMock.setItem).toHaveBeenCalledWith('kanban_columnTheme', 'pastel');
    const lastColumnCallArgs = mockKanbanColumn.mock.calls[mockKanbanColumn.mock.calls.length -1][0];
    expect(lastColumnCallArgs.theme).toBe('pastel');

    await user.selectOptions(themeSelect, 'ocean');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('kanban_columnTheme', 'ocean');
    const latestColumnCallArgs = mockKanbanColumn.mock.calls[mockKanbanColumn.mock.calls.length -1][0];
    expect(latestColumnCallArgs.theme).toBe('ocean');
  });
});


// Helper for queryByTestId within a container
import { queries, getQueriesForElement } from '@testing-library/dom';
function within(element: HTMLElement) {
  return getQueriesForElement(element, queries);
}

describe('KidKanbanBoard - Drag and Drop Event Handling (Part 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = localStorageMockFactory(); // Reset localStorage for each test
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
    resetMockChoreInstances(); // Reset chore instances for each D&D test
    dndContextProps = {}; // Reset captured DndContext props

    // Default theme for these tests
    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'kanban_columnTheme') return 'default';
        return null;
    });
  });

  test('handleDragStart sets activeDragItem and shows DragOverlay', () => {
    renderKidKanbanBoard('kid1');
    const dragStartEvent: DragStartEvent = {
      active: createMockActive('inst1', 'daily_active'),
    };

    act(() => {
      dndContextProps.onDragStart(dragStartEvent);
    });

    // Verify DragOverlay is called with children (meaning activeDragItem is set)
    expect(mockDragOverlay).toHaveBeenCalled();
    expect(screen.getByTestId('drag-overlay-content')).toBeInTheDocument();
    // Check if the correct card is in the overlay (mockKanbanCard renders title)
    const definitionForInst1 = mockChoreDefinitions.find(d => d.id === 'def1');
    expect(screen.getByTestId('drag-overlay-content')).toHaveTextContent(definitionForInst1!.title);
  });

  test('handleDragEnd clears activeDragItem and DragOverlay', () => {
    renderKidKanbanBoard('kid1');
    // First, simulate a drag start to set activeDragItem
    const dragStartEvent: DragStartEvent = { active: createMockActive('inst1', 'daily_active') };
    act(() => { dndContextProps.onDragStart(dragStartEvent); });
    expect(screen.getByTestId('drag-overlay-content')).toBeInTheDocument();

    // Now, simulate drag end
    const dragEndEvent: DragEndEvent = {
      active: createMockActive('inst1', 'daily_active'),
      over: createMockOver('inst3', 'daily_active'), // Dropping inst1 over inst3
      delta: { x: 0, y: 0 },
      collisions: null,
    };
    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });
    expect(screen.queryByTestId('drag-overlay-content')).not.toBeInTheDocument();
  });

  test('handleDragCancel clears activeDragItem and DragOverlay', () => {
    renderKidKanbanBoard('kid1');
    const dragStartEvent: DragStartEvent = { active: createMockActive('inst1', 'daily_active') };
    act(() => { dndContextProps.onDragStart(dragStartEvent); });
    expect(screen.getByTestId('drag-overlay-content')).toBeInTheDocument();

    const dragCancelEvent: DragCancelEvent = { // Structure might vary or not be needed if logic is simple
        active: dragStartEvent.active,
        // ... other properties if your handler uses them
    };
    act(() => {
      dndContextProps.onDragCancel(dragCancelEvent); // Call with event if your handler expects it
    });
    expect(screen.queryByTestId('drag-overlay-content')).not.toBeInTheDocument();
  });

  test('handleDragEnd - reorders items in the same column (active)', () => {
    renderKidKanbanBoard('kid1'); // inst1, inst3 are active
    const activeColumnId = 'daily_active';

    const dragEndEvent: DragEndEvent = {
      active: createMockActive('inst1', activeColumnId, 0, ['inst1', 'inst3']), // inst1 is dragged
      over: createMockOver('inst3', activeColumnId, 1, ['inst1', 'inst3']),   // over inst3
      delta: { x: 0, y: 0 },
      collisions: null,
    };

    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });

    const activeColumn = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)[0].column;
    expect(activeColumn.chores.map((c: ChoreInstance) => c.id)).toEqual(['inst3', 'inst1']);
  });

  test('handleDragEnd - moves item from active to completed column and updates status', () => {
    renderKidKanbanBoard('kid1'); // inst1 (active, incomplete), inst2 (completed, complete)
    const activeColId = 'daily_active';
    const completedColId = 'daily_completed';

    const dragEndEvent: DragEndEvent = {
      active: createMockActive('inst1', activeColId),       // Drag inst1 (incomplete)
      over: createMockOver(completedColId, completedColId), // Drop on completed column itself
      delta: { x: 0, y: 0 },
      collisions: null,
    };

    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });

    expect(mockToggleChoreInstanceComplete).toHaveBeenCalledWith('inst1');

    // Check local state update (item moved and status changed for immediate UI)
    const activeColumnData = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColId)[0].column;
    expect(activeColumnData.chores.find((c: ChoreInstance) => c.id === 'inst1')).toBeUndefined();

    const completedColumnData = mockKanbanColumn.mock.calls.find(call => call[0].column.id === completedColId)[0].column;
    const movedItemInCompleted = completedColumnData.chores.find((c: ChoreInstance) => c.id === 'inst1');
    expect(movedItemInCompleted).toBeDefined();
    expect(movedItemInCompleted.isComplete).toBe(true); // Status updated locally
  });

  test('handleDragEnd - moves item from completed to active column and updates status', () => {
    renderKidKanbanBoard('kid1'); // inst2 is initially complete
    const activeColId = 'daily_active';
    const completedColId = 'daily_completed';

    const dragEndEvent: DragEndEvent = {
      active: createMockActive('inst2', completedColId), // Drag inst2 (complete)
      over: createMockOver(activeColId, activeColId),     // Drop on active column
      delta: { x: 0, y: 0 },
      collisions: null,
    };

    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });

    expect(mockToggleChoreInstanceComplete).toHaveBeenCalledWith('inst2');

    const completedColumnData = mockKanbanColumn.mock.calls.find(call => call[0].column.id === completedColId)[0].column;
    expect(completedColumnData.chores.find((c: ChoreInstance) => c.id === 'inst2')).toBeUndefined();

    const activeColumnData = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColId)[0].column;
    const movedItemInActive = activeColumnData.chores.find((c: ChoreInstance) => c.id === 'inst2');
    expect(movedItemInActive).toBeDefined();
    expect(movedItemInActive.isComplete).toBe(false); // Status updated locally
  });


  test('handleDragEnd - no change if dropped on self and order is same', () => {
    renderKidKanbanBoard('kid1');
    const activeColumnId = 'daily_active';
    const initialActiveChores = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)[0].column.chores;

    const dragEndEvent: DragEndEvent = {
      active: createMockActive('inst1', activeColumnId, 0, ['inst1', 'inst3']),
      over: createMockOver('inst1', activeColumnId, 0, ['inst1', 'inst3']), // Dropped on self, same index
      delta: { x: 0, y: 0 },
      collisions: null,
    };

    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });

    const finalActiveChores = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)[0].column.chores;
    expect(finalActiveChores.map((c:ChoreInstance) => c.id)).toEqual(initialActiveChores.map((c:ChoreInstance) => c.id));
    expect(mockToggleChoreInstanceComplete).not.toHaveBeenCalled();
  });

  test('handleDragEnd - no action if dropped outside any droppable area (over is null)', () => {
    renderKidKanbanBoard('kid1');
    const initialColumnsState = JSON.stringify(mockKanbanColumn.mock.calls.map(call => call[0].column));


    const dragEndEvent: DragEndEvent = {
      active: createMockActive('inst1', 'daily_active'),
      over: null, // Dropped outside
      delta: { x: 0, y: 0 },
      collisions: null,
    };

    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });

    const finalColumnsState = JSON.stringify(mockKanbanColumn.mock.calls.map(call => call[0].column));
    expect(finalColumnsState).toEqual(initialColumnsState); // No change to columns
    expect(mockToggleChoreInstanceComplete).not.toHaveBeenCalled();
  });
});
