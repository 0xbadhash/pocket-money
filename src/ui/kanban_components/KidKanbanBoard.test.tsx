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
const mockUpdateKanbanChoreOrder = vi.fn();
const mockUpdateChoreInstanceColumn = vi.fn(); // Mock for updating instance's column

const mockChoreDefinitions: ChoreDefinition[] = [
  { id: 'def1', title: 'Walk the Dog', assignedKidId: 'kid1', rewardAmount: 5, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  { id: 'def2', title: 'Clean Room', assignedKidId: 'kid1', rewardAmount: 10, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  { id: 'def3', title: 'Do Homework', assignedKidId: 'kid1', rewardAmount: 0, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  { id: 'def4', title: 'Wash Dishes', assignedKidId: 'kid2', rewardAmount: 3, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  // For custom order testing, ensure these are assigned to kid1
  { id: 'def5', title: 'Chore X (for custom order)', assignedKidId: 'kid1', rewardAmount: 1, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  { id: 'def6', title: 'Chore Y (for custom order)', assignedKidId: 'kid1', rewardAmount: 1, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  { id: 'def7', title: 'Chore Z (for custom order)', assignedKidId: 'kid1', rewardAmount: 1, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
];

const today = getTodayDateString();
let mockChoreInstancesData: ChoreInstance[];

const resetMockChoreInstances = () => {
    mockChoreInstancesData = [
        { id: 'inst1', choreDefinitionId: 'def1', instanceDate: today, isComplete: false },
        { id: 'inst2', choreDefinitionId: 'def2', instanceDate: today, isComplete: true },
        { id: 'inst3', choreDefinitionId: 'def3', instanceDate: today, isComplete: false },
        { id: 'inst4', choreDefinitionId: 'def4', instanceDate: today, isComplete: false },
        // For custom order testing
        { id: 'instX', choreDefinitionId: 'def5', instanceDate: today, isComplete: false },
        { id: 'instY', choreDefinitionId: 'def6', instanceDate: today, isComplete: false },
        { id: 'instZ', choreDefinitionId: 'def7', instanceDate: today, isComplete: false },
    ];
};

let mockKanbanChoreOrdersData: Record<string, string[]> = {};

const resetMockKanbanChoreOrders = () => {
    mockKanbanChoreOrdersData = {};
}

const mockContextValueFactory = (customOrders: Record<string, string[]> = {}) => ({
  choreDefinitions: mockChoreDefinitions,
  get choreInstances() { return mockChoreInstancesData; },
  kanbanChoreOrders: customOrders, // Use passed customOrders or default
  generateInstancesForPeriod: mockGenerateInstancesForPeriod,
  toggleChoreInstanceComplete: mockToggleChoreInstanceComplete,
  updateKanbanChoreOrder: mockUpdateKanbanChoreOrder,
  getDefinitionById: (id: string) => mockChoreDefinitions.find(d => d.id === id),
  getInstancesForDefinition: (defId: string) => mockChoreInstancesData.filter(i => i.choreDefinitionId === defId),
  updateChoreInstanceColumn: mockUpdateChoreInstanceColumn, // Add to factory
  loadingDefinitions: false, loadingInstances: false, errorDefinitions: null, errorInstances: null,
  addChoreDefinition: vi.fn(), updateChoreDefinition: vi.fn(), deleteChoreDefinition: vi.fn(),
  addChoreInstance: vi.fn(), updateChoreInstance: vi.fn(), deleteChoreInstance: vi.fn(),
  toggleSubTaskComplete: vi.fn(),
} as ChoresContextType);

// Mock UserContext for getKanbanColumnConfigs
const mockGetKanbanColumnConfigs = vi.fn();
const mockUserContextValue = {
    user: { id: 'user1', username: 'Test User', email: '', kids: [{id: 'kid1', name: 'Test Kid', kanbanColumnConfigs: []}]},
    loading: false,
    error: null,
    getKanbanColumnConfigs: mockGetKanbanColumnConfigs,
    // Add other UserContext functions as vi.fn() if needed by KidKanbanBoard directly or indirectly
    login: vi.fn(), logout: vi.fn(), updateUser: vi.fn(), addKid: vi.fn(), updateKid: vi.fn(), deleteKid: vi.fn(),
    addKanbanColumnConfig: vi.fn(), updateKanbanColumnConfig: vi.fn(), deleteKanbanColumnConfig: vi.fn(), reorderKanbanColumnConfigs: vi.fn(),
};
// Import UserContext to use its Provider
import { UserContext } from '../../contexts/UserContext';


const renderKidKanbanBoard = (
    kidId = 'kid1',
    choresContextVal = mockContextValueFactory(mockKanbanChoreOrdersData),
    userContextVal = { ...mockUserContextValue, getKanbanColumnConfigs: mockGetKanbanColumnConfigs }
) => {
  const freshChoresContext = {...choresContextVal, choreInstances: [...mockChoreInstancesData], kanbanChoreOrders: {...choresContextVal.kanbanChoreOrders}};

  // Ensure the specific kidId being tested exists in the mock user's kids array
  const kidExists = userContextVal.user?.kids.find(k => k.id === kidId);
  let finalUserContextVal = userContextVal;
  if (userContextVal.user && !kidExists) {
    finalUserContextVal = {
        ...userContextVal,
        user: {
            ...userContextVal.user,
            kids: [...userContextVal.user.kids, { id: kidId, name: `Test Kid ${kidId}`, kanbanColumnConfigs: [] }]
        }
    }
  }


  return render(
    <UserContext.Provider value={finalUserContextVal as UserContextType}>
      <ChoresContext.Provider value={freshChoresContext as ChoresContextType}>
        <KidKanbanBoard kidId={kidId} />
      </ChoresContext.Provider>
    </UserContext.Provider>
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
    resetMockChoreInstances();
    resetMockKanbanChoreOrders(); // Reset custom orders for each test
    dndContextProps = {};

    localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'kanban_columnTheme') return 'default';
        if (key === 'kanbanChoreOrders') return JSON.stringify(mockKanbanChoreOrdersData); // Use mutable mock data
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
    renderKidKanbanBoard('kid1');
    const activeColumnId = 'daily_active';
    const kidId = 'kid1';

    // Initial active chores for kid1, default order (inst1, inst3, instX, instY, instZ)
    // Let's say inst1, inst3, instX, instY, instZ are active
    const initialActiveChores = mockChoreInstancesData.filter(c => c.assignedKidId === kidId && !c.isComplete);
    const choreIds = initialActiveChores.map(c => c.id);


    const dragEndEvent: DragEndEvent = {
      active: createMockActive('instX', activeColumnId, 2, choreIds),
      over: createMockOver('instY', activeColumnId, 3, choreIds),
      delta: { x: 0, y: 0 },
      collisions: null,
    };

    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });

    const activeColumn = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)[0].column;
    // Expected: inst1, inst3, instY, instX, instZ (if instX moved over instY)
    // arrayMove(arr, 2, 3) on [inst1, inst3, instX, instY, instZ]
    // results in [inst1, inst3, instY, instX, instZ]
    const expectedOrder = ['inst1', 'inst3', 'instY', 'instX', 'instZ'];
    expect(activeColumn.chores.map((c: ChoreInstance) => c.id)).toEqual(expectedOrder);
    expect(mockUpdateKanbanChoreOrder).toHaveBeenCalledWith(kidId, activeColumnId, expectedOrder);
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

    // expect(mockToggleChoreInstanceComplete).toHaveBeenCalledWith('inst1'); // This is no longer called for column moves
    expect(mockUpdateChoreInstanceColumn).toHaveBeenCalledWith('inst1', dynamicCol2.id);

    const col1Data = mockKanbanColumn.mock.calls.find(call => call[0].column.id === dynamicCol1.id)[0].column;
    expect(col1Data.chores.find((c: ChoreInstance) => c.id === 'inst1')).toBeUndefined();

    const col2Data = mockKanbanColumn.mock.calls.find(call => call[0].column.id === dynamicCol2.id)[0].column;
    const movedItem = col2Data.chores.find((c: ChoreInstance) => c.id === 'inst1');
    expect(movedItem).toBeDefined();
    expect(movedItem.kanbanColumnId).toBe(dynamicCol2.id);
    // expect(movedItemInCompleted.isComplete).toBe(true); // Status is not changed by column move
  });

  // This test might need adjustment as isComplete is no longer tied to column suffixes.
  // It can test moving an item and ensure its isComplete status *doesn't* change,
  // and then separately test the toggle button on the card.
  // For now, focusing on the columnId update.
  test('handleDragEnd - moves item between dynamic columns and updates its kanbanColumnId (status unchanged)', () => {
    const kidId = 'kid1';
    const dynamicCol1: KanbanColumnConfig = { id: 'dynCol1', kidId, title: 'Dynamic Col 1', order: 0 };
    const dynamicCol2: KanbanColumnConfig = { id: 'dynCol2', kidId, title: 'Dynamic Col 2', order: 1 };
    mockGetKanbanColumnConfigs.mockReturnValue([dynamicCol1, dynamicCol2]);

    // Ensure inst2 (which is complete) is in dynCol1 initially
    mockChoreInstancesData = mockChoreInstancesData.map(inst =>
      inst.id === 'inst2' ? { ...inst, kanbanColumnId: dynamicCol1.id, isComplete: true } : inst
    );

    renderKidKanbanBoard(kidId, mockContextValueFactory(mockKanbanChoreOrdersData));

    const dragEndEvent: DragEndEvent = {
      active: createMockActive('inst2', dynamicCol1.id),
      over: createMockOver(dynamicCol2.id, dynamicCol2.id), // Drop on dynamicCol2
      delta: { x: 0, y: 0 },
      collisions: null,
    };

    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });

    expect(mockUpdateChoreInstanceColumn).toHaveBeenCalledWith('inst2', dynamicCol2.id);
    expect(mockToggleChoreInstanceComplete).not.toHaveBeenCalled(); // Explicitly check status NOT toggled by move

    const col1Data = mockKanbanColumn.mock.calls.find(call => call[0].column.id === dynamicCol1.id)[0].column;
    expect(col1Data.chores.find((c: ChoreInstance) => c.id === 'inst2')).toBeUndefined();

    const col2Data = mockKanbanColumn.mock.calls.find(call => call[0].column.id === dynamicCol2.id)[0].column;
    const movedItem = col2Data.chores.find((c: ChoreInstance) => c.id === 'inst2');
    expect(movedItem).toBeDefined();
    expect(movedItem.kanbanColumnId).toBe(dynamicCol2.id);
    expect(movedItem.isComplete).toBe(true); // isComplete status should remain unchanged by the move
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

  test('applies custom order from kanbanChoreOrders when sortBy is "instanceDate"', () => {
    const kidId = 'kid1';
    const activeColumnId = 'daily_active';
    const customOrder = ['instZ', 'instX', 'instY']; // Define a custom order for some of kid1's active chores

    // inst1, inst3 are other active chores for kid1 not in this custom order.
    // Default active order for kid1 if no custom: inst1, inst3, instX, instY, instZ (by ID or original add order)
    // Expected with custom: instZ, instX, instY, then inst1, inst3 (appended, sorted by date/default)

    mockKanbanChoreOrdersData[`${kidId}-${activeColumnId}`] = customOrder;

    renderKidKanbanBoard(kidId, mockContextValueFactory(mockKanbanChoreOrdersData));

    // Ensure sort is "My Order / Due Date" (which is 'instanceDate' internally)
    const sortBySelect = screen.getByLabelText(/Sort by:/i);
    expect(sortBySelect).toHaveValue('instanceDate');

    const activeColumn = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)[0].column;
    const renderedOrder = activeColumn.chores.map((c: ChoreInstance) => c.id);

    // Chores in customOrder should appear first, in that order.
    // Other chores (inst1, inst3) should appear after, sorted by default (e.g., instanceDate or their original order).
    // Assuming inst1 and inst3 are sorted by their ID here as instanceDate is same for all.
    const expectedRenderOrder = [...customOrder, 'inst1', 'inst3'];
    expect(renderedOrder).toEqual(expectedRenderOrder);
  });

  test('clears custom order for current columns when explicit sort is chosen', async () => {
    const user = userEvent.setup();
    const kidId = 'kid1';
    const activeColumnId = 'daily_active';
    const completedColumnId = 'daily_completed'; // Assuming this column might also be visible

    // Setup initial custom order
    mockKanbanChoreOrdersData[`${kidId}-${activeColumnId}`] = ['instZ', 'instX', 'instY'];
    mockKanbanChoreOrdersData[`${kidId}-${completedColumnId}`] = ['inst2']; // Example for completed

    renderKidKanbanBoard(kidId, mockContextValueFactory(mockKanbanChoreOrdersData));

    // Verify custom order is initially applied (sortBy is 'instanceDate' by default)
    let activeColumn = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)[0].column;
    expect(activeColumn.chores.map((c: ChoreInstance) => c.id)).toEqual(['instZ', 'instX', 'instY', 'inst1', 'inst3']);

    // User changes sort to "Title"
    const sortBySelect = screen.getByLabelText(/Sort by:/i);
    await user.selectOptions(sortBySelect, 'title');

    // Verify updateKanbanChoreOrder was called to clear orders for visible columns
    expect(mockUpdateKanbanChoreOrder).toHaveBeenCalledWith(kidId, activeColumnId, []);
    expect(mockUpdateKanbanChoreOrder).toHaveBeenCalledWith(kidId, completedColumnId, []);

    // Verify chores are now sorted by title (mockKanbanColumn receives chores sorted by KidKanbanBoard's useEffect)
    // Titles: WalkDog(def1,inst1), CleanRoom(def2,inst2), DoHomework(def3,inst3), ChoreX(def5,instX), ChoreY(def6,instY), ChoreZ(def7,instZ)
    // Active chores for kid1: inst1, inst3, instX, instY, instZ
    // Titles: WalkDog, DoHomework, ChoreX, ChoreY, ChoreZ
    // Expected ASC title order: ChoreX, ChoreY, ChoreZ, DoHomework, WalkDog
    activeColumn = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)[0].column;
    expect(activeColumn.chores.map((c: ChoreInstance) => c.id)).toEqual(['instX', 'instY', 'instZ', 'inst3', 'inst1']);
  });

  test('after explicit sort clears custom order, switching back to "My Order" uses default sort', async () => {
    const user = userEvent.setup();
    const kidId = 'kid1';
    const activeColumnId = 'daily_active';

    mockKanbanChoreOrdersData[`${kidId}-${activeColumnId}`] = ['instZ', 'instX', 'instY']; // Initial custom order

    const contextToUse = mockContextValueFactory(mockKanbanChoreOrdersData);
    renderKidKanbanBoard(kidId, contextToUse);

    const sortBySelect = screen.getByLabelText(/Sort by:/i);

    // 1. Apply explicit sort (e.g., Title), which should clear custom order for daily_active
    await user.selectOptions(sortBySelect, 'title');
    expect(mockUpdateKanbanChoreOrder).toHaveBeenCalledWith(kidId, activeColumnId, []);

    // Simulate the context actually clearing the order for the next step
    delete mockKanbanChoreOrdersData[`${kidId}-${activeColumnId}`];
    // Re-render or ensure context update propagates if `renderKidKanbanBoard` doesn't re-read mockKanbanChoreOrdersData directly
    // For this test, we will assume the effect of updateKanbanChoreOrder has cleared it from the perspective of ChoresContext

    // 2. User switches back to "My Order / Due Date"
    await user.selectOptions(sortBySelect, 'instanceDate');

    // Verify chores are now in default instanceDate order (all have same date, so original/ID order)
    // Active kid1 chores: inst1, inst3, instX, instY, instZ
    // Default order (assuming by ID as dates are same): inst1, inst3, instX, instY, instZ
    const activeColumn = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)[0].column;
    const defaultOrder = mockChoreInstancesData
        .filter(c => c.assignedKidId === kidId && !c.isComplete)
        .sort((a,b) => new Date(a.instanceDate).getTime() - new Date(b.instanceDate).getTime() || a.id.localeCompare(b.id)) // Example default sort
        .map(c => c.id);

    expect(activeColumn.chores.map((c: ChoreInstance) => c.id)).toEqual(defaultOrder);
  });

  test('calls generateInstancesForPeriod with default column ID from UserContext', () => {
    const kidId = 'kid1';
    const userCols: KanbanColumnConfig[] = [
      { id: 'col1_todo', kidId, title: 'To Do', order: 0, createdAt: '', updatedAt: '' },
      { id: 'col2_prog', kidId, title: 'In Progress', order: 1, createdAt: '', updatedAt: '' },
    ];
    mockGetKanbanColumnConfigs.mockReturnValue(userCols); // Mock UserContext to return these columns

    renderKidKanbanBoard(kidId);

    const todayStr = getTodayDateString();
    // Expect generateInstancesForPeriod to be called with the ID of the first column ('col1_todo')
    expect(mockGenerateInstancesForPeriod).toHaveBeenCalledWith(todayStr, todayStr, userCols[0].id);
  });

  test('displays a message and no columns if no columns are configured for the kid', () => {
    const kidId = 'kid_no_cols';
    mockGetKanbanColumnConfigs.mockReturnValue([]); // No columns configured

    renderKidKanbanBoard(kidId);

    // Check for the message
    expect(screen.getByText(/No Kanban columns are set up for this kid yet./i)).toBeInTheDocument();
    expect(screen.getByText(/Please go to Settings > Kanban Column Settings to configure them./i)).toBeInTheDocument();

    // Check that no KanbanColumn mocks were rendered
    expect(screen.queryByTestId(/mock-kanban-column-/)).not.toBeInTheDocument();
  });

  test('calls generateInstancesForPeriod with undefined default column ID if no columns configured', () => {
    const kidId = 'kid_no_cols_for_gen';
    mockGetKanbanColumnConfigs.mockReturnValue([]); // No columns configured

    renderKidKanbanBoard(kidId);

    const todayStr = getTodayDateString();
    expect(mockGenerateInstancesForPeriod).toHaveBeenCalledWith(todayStr, todayStr, undefined);
  });

  test('displays and clears action feedback message on successful inter-column drag', async () => {
    vi.useFakeTimers(); // Use fake timers for this test

    const kidId = 'kid1';
    const dynamicCol1: KanbanColumnConfig = { id: 'dynCol1', kidId, title: 'Column Alpha', order: 0, createdAt: 't', updatedAt: 't' };
    const dynamicCol2: KanbanColumnConfig = { id: 'dynCol2', kidId, title: 'Column Beta', order: 1, createdAt: 't', updatedAt: 't' };
    mockGetKanbanColumnConfigs.mockReturnValue([dynamicCol1, dynamicCol2]);

    // Ensure instX is in dynCol1 initially and has a definition for its title
    mockChoreInstancesData = mockChoreInstancesData.map(inst =>
      inst.id === 'instX' ? { ...inst, kanbanColumnId: dynamicCol1.id } : inst
    );
    const choreDefForInstX = mockChoreDefinitions.find(d => d.id === 'def5'); // 'Chore X (for custom order)'

    renderKidKanbanBoard(kidId, mockContextValueFactory(mockKanbanChoreOrdersData));

    // 1. Simulate Drag Start to populate activeDragItem
    const dragStartEvent: DragStartEvent = {
      active: createMockActive('instX', dynamicCol1.id),
    };
    act(() => {
      dndContextProps.onDragStart(dragStartEvent);
    });

    // 2. Simulate Drag End (moving instX from dynCol1 to dynCol2)
    const dragEndEvent: DragEndEvent = {
      active: createMockActive('instX', dynamicCol1.id),
      over: createMockOver(dynamicCol2.id, dynamicCol2.id), // Drop on dynCol2
      delta: { x: 0, y: 0 },
      collisions: null,
    };

    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });

    // 3. Verify feedback message appears
    const feedbackMessage = await screen.findByRole('status'); // role="status" was added
    expect(feedbackMessage).toBeInTheDocument();
    expect(feedbackMessage).toHaveTextContent(`${choreDefForInstX!.title} moved to ${dynamicCol2.title}.`);
    expect(feedbackMessage).toHaveClass('kanban-action-feedback');

    // 4. Advance timers to trigger message clearance
    act(() => {
      vi.advanceTimersByTime(3000); // Match the setTimeout duration in KidKanbanBoard
    });

    // 5. Verify feedback message is gone
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText(`${choreDefForInstX!.title} moved to ${dynamicCol2.title}.`)).not.toBeInTheDocument();

    vi.useRealTimers(); // Restore real timers
  });

});
