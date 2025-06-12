import { vi } from 'vitest';

// Declare mocks at the very top
// Use vi.hoisted() for mocks that need to be accessed within vi.mock factory functions
const mockSortableContextFn = vi.hoisted(() => vi.fn(({ children }) => <>{children}</>));
const mockDragOverlay = vi.hoisted(() => vi.fn(({ children }) => children ? <div data-testid="drag-overlay-content">{children}</div> : null));
const mockKanbanColumn = vi.hoisted(() => vi.fn(({ column, theme, instances, onChoreClick }) => (
  <div data-testid={`mock-kanban-column-${column.id}`} aria-label={`${column.title} column`}>
    <h2>{column.title}</h2>
    {/* <div>Theme: {theme}</div> */}
    {instances?.map((inst: ChoreInstance & { definition?: ChoreDefinition } ) => (
      <div key={inst.id} data-testid={`chore-${inst.id}`} onClick={() => onChoreClick?.(inst.id)}>
        {inst.definition?.title || inst.id} ({inst.isComplete ? 'C' : 'A'})
      </div>
    ))}
  </div>
)));

// No need for 'let mockKanbanColumn' or assignment here anymore

import { render, screen, within as rtlWithin } from '@testing-library/react';
import { ChoresContext } from '../../contexts/ChoresContext';
import { UserContext } from '../../contexts/UserContext';
import KidKanbanBoard from './KidKanbanBoard';
import type { ChoreDefinition, ChoreInstance, KanbanColumnConfig } from '../../types';
import '@testing-library/jest-dom';
import type { Active, Over } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import userEvent from '@testing-library/user-event';
import { act } from 'react'; // Updated import for act
import { getTodayDateString, getWeekRange, getMonthRange } from '../../utils/dateUtils';

// Mock dateUtils to control dates
vi.mock('../../utils/dateUtils', async (importOriginal) => {
  const actual = await importOriginal() as typeof import('../../utils/dateUtils');
  return {
    ...actual,
    getTodayDateString: vi.fn(() => '2024-01-01'), // Fixed date
    // getWeekRange and getMonthRange might also need to be adjusted if they use new Date() without args
  };
});

// src/ui/kanban_components/KidKanbanBoard.test.tsx
// Mock declarations and assignments are now correctly ordered above their use in vi.mock

// mockKanbanColumn is now defined above using vi.hoisted()

vi.mock('./KanbanColumn', () => ({
    default: mockKanbanColumn,
}));
vi.mock('./KanbanCard', () => ({
    default: vi.fn(({ instance, definition }) => (
      <div data-testid={`mock-kanban-card-${instance.id}`}>
        {definition.title}
      </div>
    ))
}));


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
    }),
    SortableContext: mockSortableContextFn
  };
});

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

// Mock ChoresContext
// These will be initialized within the factory to ensure they are fresh for each test context
// const mockGenerateInstancesForPeriod = vi.fn();
// const mockToggleChoreInstanceComplete = vi.fn();
// const mockUpdateKanbanChoreOrder = vi.fn();
// const mockUpdateChoreInstanceColumn = vi.fn();

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

let mockChoreInstancesData: ChoreInstance[]; // today will be the mocked '2024-01-01'

const resetMockChoreInstances = () => {
    const fixedToday = '2024-01-01'; // Align with mocked getTodayDateString
    mockChoreInstancesData = [
        { id: 'inst1', choreDefinitionId: 'def1', instanceDate: fixedToday, isComplete: false },
        { id: 'inst2', choreDefinitionId: 'def2', instanceDate: fixedToday, isComplete: true },
        { id: 'inst3', choreDefinitionId: 'def3', instanceDate: fixedToday, isComplete: false },
        { id: 'inst4', choreDefinitionId: 'def4', instanceDate: fixedToday, isComplete: false },
        // For custom order testing
        { id: 'instX', choreDefinitionId: 'def5', instanceDate: fixedToday, isComplete: false },
        { id: 'instY', choreDefinitionId: 'def6', instanceDate: fixedToday, isComplete: false },
        { id: 'instZ', choreDefinitionId: 'def7', instanceDate: fixedToday, isComplete: false },
    ];
};

let mockKanbanChoreOrdersData: Record<string, string[]> = {};

const resetMockKanbanChoreOrders = () => {
    mockKanbanChoreOrdersData = {};
}

// Updated factory to create fresh mocks for functions each time
const mockContextValueFactory = (customOrders: Record<string, string[]> = {}) => {
    const newMocks = {
        generateInstancesForPeriod: vi.fn(),
        toggleChoreInstanceComplete: vi.fn(),
        updateKanbanChoreOrder: vi.fn(),
        updateChoreInstanceColumn: vi.fn(),
        addChoreDefinition: vi.fn(),
        updateChoreDefinition: vi.fn(),
        deleteChoreDefinition: vi.fn(),
        addChoreInstance: vi.fn(),
        updateChoreInstance: vi.fn(),
        deleteChoreInstance: vi.fn(),
        toggleSubTaskComplete: vi.fn(),
    };

    // Capture these new mocks if specific tests need to assert against them
    // This might require a way to expose these from where renderKidKanbanBoard is called,
    // or tests that need to assert calls on these will need to pass them in.
    // For now, the factory ensures they are valid functions.
    latestContextMocks = newMocks; // Store latest mocks for potential assertions

    const currentDefinitions = [...mockChoreDefinitions]; // Use copies
    const currentInstances = [...mockChoreInstancesData];

    const contextObject = {
        choreDefinitions: currentDefinitions,
        choreInstances: currentInstances, // Make it a writable copy by default
        kanbanChoreOrders: customOrders,
        ...newMocks, // Spread the new mocks here
        getDefinitionById: (id: string) => contextObject.choreDefinitions.find(d => d.id === id),
        getInstancesForDefinition: (defId: string) => contextObject.choreInstances.filter(i => i.choreDefinitionId === defId),
        loadingDefinitions: false, loadingInstances: false, errorDefinitions: null, errorInstances: null,
        getChoreDefinitionsForKid: (kidId: string) => contextObject.choreDefinitions.filter(def => def.assignedKidId === kidId),
    };
    return contextObject as any;
};

// Helper to access the latest mocks created by the factory if needed for assertions
let latestContextMocks: {
    generateInstancesForPeriod: ReturnType<typeof vi.fn>;
    toggleChoreInstanceComplete: ReturnType<typeof vi.fn>;
    updateKanbanChoreOrder: ReturnType<typeof vi.fn>;
    updateChoreInstanceColumn: ReturnType<typeof vi.fn>;
    // Add other functions if needed for assertions
} | null = null;

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
import { getTodayDateString } from '../../utils/dateUtils';

// dndContextProps is used to capture DndContext props in mocks
let dndContextProps: any = {};

const renderKidKanbanBoard = (
    kidId = 'kid1',
    choresContextVal = mockContextValueFactory(mockKanbanChoreOrdersData),
    userContextVal = { ...mockUserContextValue, getKanbanColumnConfigs: mockGetKanbanColumnConfigs }
) => {
  // Use choreInstances from choresContextVal if it has them, otherwise default to a fresh copy of mockChoreInstancesData
  const instancesToUse = (choresContextVal && choresContextVal.choreInstances && choresContextVal.choreInstances.length > 0)
    ? choresContextVal.choreInstances
    : [...mockChoreInstancesData];
  const freshChoresContext = {...choresContextVal, choreInstances: instancesToUse, kanbanChoreOrders: {...choresContextVal.kanbanChoreOrders}};

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
    <UserContext.Provider value={finalUserContextVal}>
      <ChoresContext.Provider value={freshChoresContext}>
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
  rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
  data: { current: containerId ? { sortable: { containerId, index, items } } : {} },
  disabled: false,
});

describe('KidKanbanBoard - Rendering and Basic Interactions (Part 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKanbanColumnConfigs.mockReturnValue([]); // Ensure it returns empty array for Part 1 tests
    latestContextMocks = null; // Reset on each test run

    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
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
    // The factory now creates generateInstancesForPeriod, need to access it via latestContextMocks
    expect(latestContextMocks?.generateInstancesForPeriod).toHaveBeenCalledWith(todayStr, todayStr, undefined);
  });

  test('renders columns and chores correctly for default (daily) period', () => {
    resetMockChoreInstances(); // Ensure fresh instance data for this test
    const dailyActiveCol: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const dailyCompletedCol: KanbanColumnConfig = { id: 'daily_completed', title: 'Today - Completed', order: 1, kidId: 'kid1', createdAt: '', updatedAt: '' };

    const customUserContext = {
      ...mockUserContextValue, // Base mock user context
      getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol, dailyCompletedCol]) // Specific mock for this test
    };

    renderKidKanbanBoard('kid1', mockContextValueFactory(), customUserContext);
    expect(screen.getByRole('heading', { name: 'Today - Active' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Today - Completed' })).toBeInTheDocument();

    // Verify ARIA attributes for the columns container
    expect(screen.getByLabelText('Kanban board columns')).toHaveAttribute('role', 'list');

    const activeColumn = screen.getByTestId('mock-kanban-column-daily_active');
    expect(rtlWithin(activeColumn).getByTestId('chore-inst1')).toHaveTextContent('inst1 (A)');
    expect(rtlWithin(activeColumn).getByTestId('chore-inst3')).toHaveTextContent('inst3 (A)');
    expect(rtlWithin(activeColumn).queryByTestId('chore-inst2')).not.toBeInTheDocument();
    expect(rtlWithin(activeColumn).queryByTestId('chore-inst4')).not.toBeInTheDocument();

    const completedColumn = screen.getByTestId('mock-kanban-column-daily_completed');
    expect(rtlWithin(completedColumn).getByTestId('chore-inst2')).toHaveTextContent('inst2 (C)');
    expect(rtlWithin(completedColumn).queryByTestId('chore-inst1')).not.toBeInTheDocument();
  });

  test('period selection calls generateInstancesForPeriod and updates titles', async () => {
    const user = userEvent.setup();

    const dailyActiveCol: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const dailyCompletedCol: KanbanColumnConfig = { id: 'daily_completed', title: 'Today - Completed', order: 1, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const weeklyActiveCol: KanbanColumnConfig = { id: 'weekly_active', title: 'This Week - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const monthlyActiveCol: KanbanColumnConfig = { id: 'monthly_active', title: 'This Month - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };

    const mockUserGetColumns = vi.fn();
    // Initial call (during first render for daily)
    mockUserGetColumns.mockReturnValue([dailyActiveCol, dailyCompletedCol]); // Consistent return for the first render phase

    const customUserContext = { ...mockUserContextValue, getKanbanColumnConfigs: mockUserGetColumns };
    renderKidKanbanBoard('kid1', mockContextValueFactory(), customUserContext);

    // Weekly
    mockUserGetColumns.mockReturnValueOnce([weeklyActiveCol]); // Setup for next call, IF UserContext is re-queried (it's not usually)
                                                            // KidKanbanBoard uses the columns from initial context.
                                                            // This test needs KidKanbanBoard to re-evaluate columns or use different layouts for periods.
                                                            // The component's current logic: uses userColumnConfigs if >0, else dailyLayout for 'daily', else [].
                                                            // So, for weekly/monthly, if userColumnConfigs is empty, it shows nothing.
                                                            // Thus, to see headings, userColumnConfigs MUST be provided.
    // To test switching periods and seeing different columns, the getKanbanColumnConfigs mock
    // itself doesn't need to be stateful IF the component uses what's given for non-daily.
    // The issue is that the component caches userColumnConfigs on render.
    // So, for this test to work as intended (see different columns for different periods),
    // we would need to re-render or provide a UserContext that dynamically changes its output,
    // OR the component itself would need to fetch columns for each period type if userColumnConfigs is empty.

    // Given the component's current logic, we will test one period at a time by re-rendering.
    // This means splitting the test or focusing on one period change.
    // For now, let's ensure the 'daily' works, and 'weekly' can be made to work by providing columns.
    // The current mockReturnValueOnce for weekly/monthly in the original test were likely ineffective for heading assertions.

    // Test Daily
    (getTodayDateString as vi.Mock).mockReturnValue('2024-01-01'); // Ensure today is fixed for this test block
    resetMockChoreInstances(); // Use the fixed today

    const dailyActiveCol: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const dailyCompletedCol: KanbanColumnConfig = { id: 'daily_completed', title: 'Today - Completed', order: 1, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const mockUserGetColumns = vi.fn().mockReturnValue([dailyActiveCol, dailyCompletedCol]);
    const customUserContext = { ...mockUserContextValue, getKanbanColumnConfigs: mockUserGetColumns };

    let r = renderKidKanbanBoard('kid1', mockContextValueFactory(), customUserContext);
    expect(r.getByRole('heading', { name: 'Today - Active' })).toBeInTheDocument();
    expect(latestContextMocks?.generateInstancesForPeriod).toHaveBeenCalledWith('2024-01-01', '2024-01-01', dailyActiveCol.id);

    // Test Weekly
    const weeklyActiveCol: KanbanColumnConfig = { id: 'weekly_active', title: 'This Week - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const weeklyUserContext = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [weeklyActiveCol]) };
    r.unmount(); // Clean up previous render
    r = renderKidKanbanBoard('kid1', mockContextValueFactory(), weeklyUserContext);

    await user.click(r.getByRole('button', { name: 'Weekly' }));
    // Mock getWeekRange to align with fixed 'today' if necessary, assuming it uses new Date()
    (getWeekRange as vi.Mock).mockReturnValue({ start: new Date('2024-01-01'), end: new Date('2024-01-07')});
    expect(latestContextMocks?.generateInstancesForPeriod).toHaveBeenCalledWith(
      '2024-01-01', // Expected start of week for '2024-01-01'
      '2024-01-07', // Expected end of week
      weeklyActiveCol.id
    );
    expect(r.getByRole('heading', { name: 'This Week - Active' })).toBeInTheDocument();

    // Test Monthly
    const monthlyActiveCol: KanbanColumnConfig = { id: 'monthly_active', title: 'This Month - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const monthlyUserContext = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [monthlyActiveCol]) };
    r.unmount(); // Clean up previous render
    r = renderKidKanbanBoard('kid1', mockContextValueFactory(), monthlyUserContext);

    await user.click(r.getByRole('button', { name: 'Monthly' }));
    (getMonthRange as vi.Mock).mockReturnValue({ start: new Date('2024-01-01'), end: new Date('2024-01-31')});
    expect(latestContextMocks?.generateInstancesForPeriod).toHaveBeenCalledWith(
      '2024-01-01', // Expected start of month
      '2024-01-31', // Expected end of month
      monthlyActiveCol.id
    );
    expect(r.getByRole('heading', { name: 'This Month - Active' })).toBeInTheDocument();
  });

  test('reward filter updates displayed chores', async () => {
    const user = userEvent.setup();
    resetMockChoreInstances(); // Ensure fresh instance data for this test
    const dailyActiveCol: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const dailyCompletedCol: KanbanColumnConfig = { id: 'daily_completed', title: 'Today - Completed', order: 1, kidId: 'kid1', createdAt: '', updatedAt: '' };

    const customUserContext = {
      ...mockUserContextValue,
      getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol, dailyCompletedCol])
    };
    renderKidKanbanBoard('kid1', mockContextValueFactory(), customUserContext);

    let activeColumn = screen.getByTestId('mock-kanban-column-daily_active');
    expect(rtlWithin(activeColumn).getByTestId('chore-inst1')).toBeInTheDocument();
    expect(rtlWithin(activeColumn).getByTestId('chore-inst3')).toBeInTheDocument();

    const rewardFilterSelect = screen.getByLabelText(/Filter by Reward:/i);
    await user.selectOptions(rewardFilterSelect, 'has_reward');

    activeColumn = screen.getByTestId('mock-kanban-column-daily_active'); // Re-query after update
    expect(rtlWithin(activeColumn).getByTestId('chore-inst1')).toBeInTheDocument();
    expect(rtlWithin(activeColumn).queryByTestId('chore-inst3')).not.toBeInTheDocument();

    await user.selectOptions(rewardFilterSelect, 'no_reward');
    activeColumn = screen.getByTestId('mock-kanban-column-daily_active'); // Re-query
    expect(rtlWithin(activeColumn).queryByTestId('chore-inst1')).not.toBeInTheDocument();
    expect(rtlWithin(activeColumn).getByTestId('chore-inst3')).toBeInTheDocument();
  });

  test('sort option changes order of chores', async () => {
    const user = userEvent.setup();
    const sortTestInstances: ChoreInstance[] = [
      { id: 'c_inst', choreDefinitionId: 'def3', instanceDate: today, isComplete: false }, // Reward 0
      { id: 'a_inst', choreDefinitionId: 'def1', instanceDate: today, isComplete: false }, // Reward 5
      { id: 'b_inst', choreDefinitionId: 'def2', instanceDate: today, isComplete: false }, // Reward 10
    ];

    // For this test, we need to ensure mockGetKanbanColumnConfigs returns the default daily columns
    // so that mockKanbanColumn is rendered and its calls can be inspected.
    const dailyActiveCol: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const dailyCompletedCol: KanbanColumnConfig = { id: 'daily_completed', title: 'Today - Completed', order: 1, kidId: 'kid1', createdAt: '', updatedAt: '' };

    const customUserContext = {
      ...mockUserContextValue,
      getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol, dailyCompletedCol])
    };

    const customChoresContext = mockContextValueFactory(); // Get a fresh context
    customChoresContext.choreInstances = [...sortTestInstances]; // Override instances for this test
    // Ensure definitions for sortTestInstances are present
    const sortInstanceDefIds = sortTestInstances.map(si => si.choreDefinitionId);
    customChoresContext.choreDefinitions = mockChoreDefinitions.filter(def => sortInstanceDefIds.includes(def.id));

    renderKidKanbanBoard('kid1', customChoresContext, customUserContext);

    const sortBySelect = screen.getByLabelText(/Sort by:/i);
    // Initial sort direction is ASC for 'instanceDate' and 'title', so button shows ↑
    // For 'rewardAmount', it defaults to DESC, so button would show ↓
    // Check current sort state to determine initial button text accurately.
    // Default sortBy is 'instanceDate', default direction is 'asc'.
    const sortDirectionButton = screen.getByRole('button', { name: /A-Z \/ Old-New ↑/i });

    await user.selectOptions(sortBySelect, 'title');
    // Ensure we get the props from the last call to mockKanbanColumn for the 'daily_active' column
    const activeColumnCalls = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === 'daily_active');
    const lastActiveColumnCall = activeColumnCalls[activeColumnCalls.length - 1];
    let activeColumnChores = lastActiveColumnCall?.[0]?.column.chores;
    // Titles: Walk the Dog (def1, a_inst), Clean Room (def2, b_inst), Do Homework (def3, c_inst)
    // Expected order for title ASC: Clean Room, Do Homework, Walk the Dog
    expect(activeColumnChores?.map((c:ChoreInstance) => c.id)).toEqual(['b_inst', 'c_inst', 'a_inst']);

    await user.click(sortDirectionButton); // Should now be "A-Z / Old-New ↓"
    const activeColumnCallsDesc = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === 'daily_active');
    const lastActiveColumnCallDesc = activeColumnCallsDesc[activeColumnCallsDesc.length - 1];
    activeColumnChores = lastActiveColumnCallDesc?.[0]?.column.chores;
    expect(activeColumnChores?.map((c:ChoreInstance) => c.id)).toEqual(['a_inst', 'c_inst', 'b_inst']);

    await user.selectOptions(sortBySelect, 'rewardAmount'); // Default to DESC for reward
    const rewardDescCalls = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === 'daily_active');
    const lastRewardDescCall = rewardDescCalls[rewardDescCalls.length - 1];
    activeColumnChores = lastRewardDescCall?.[0]?.column.chores;
    // Rewards: a_inst (5), b_inst (10), c_inst (0). DESC: b_inst, a_inst, c_inst
    expect(activeColumnChores?.map((c:ChoreInstance) => c.id)).toEqual(['b_inst', 'a_inst', 'c_inst']);

    await user.click(screen.getByRole('button', { name: /High to Low ↓/i })); // Change to ASC
    const rewardAscCalls = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === 'daily_active');
    const lastRewardAscCall = rewardAscCalls[rewardAscCalls.length - 1];
    activeColumnChores = lastRewardAscCall?.[0]?.column.chores;
    expect(activeColumnChores?.map((c:ChoreInstance) => c.id)).toEqual(['c_inst', 'a_inst', 'b_inst']);
  });

  test('theme selection updates localStorage and column theme prop', async () => {
    const user = userEvent.setup();
    // Ensure columns are rendered for this test by providing a UserContext that returns columns
    const dailyActiveColConfig: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const dailyCompletedColConfig: KanbanColumnConfig = { id: 'daily_completed', title: 'Today - Completed', order: 1, kidId: 'kid1', createdAt: '', updatedAt: '' };

    const userContextWithCols = {
      ...mockUserContextValue,
      getKanbanColumnConfigs: vi.fn(() => [dailyActiveColConfig, dailyCompletedColConfig])
    };

    renderKidKanbanBoard('kid1', mockContextValueFactory(), userContextWithCols);

    const themeSelect = screen.getByLabelText(/Column Theme:/i);
    await user.selectOptions(themeSelect, 'pastel');

    expect(localStorageMock.setItem).toHaveBeenCalledWith('kanban_columnTheme', 'pastel');
    // With the functional mockKanbanColumn, we can check its props if needed.
    // Find the call to mockKanbanColumn for the active column with the 'pastel' theme.
    let pastelCall = mockKanbanColumn.mock.calls.find(call => call[0].column.id === 'daily_active' && call[0].theme === 'pastel');
    expect(pastelCall).toBeDefined();
    if(pastelCall) expect(pastelCall[0].theme).toBe('pastel');


    await user.selectOptions(themeSelect, 'ocean');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('kanban_columnTheme', 'ocean');
    let oceanCall = mockKanbanColumn.mock.calls.find(call => call[0].column.id === 'daily_active' && call[0].theme === 'ocean');
    expect(oceanCall).toBeDefined();
    if(oceanCall) expect(oceanCall[0].theme).toBe('ocean');
  });
});



// Helper for queryByTestId within a container
// import { queries, getQueriesForElement } from '@testing-library/dom'; // Already imported as rtlWithin from @testing-library/react
// function within(element: HTMLElement) { // This is now replaced by rtlWithin
//   return getQueriesForElement(element, queries);
// }

describe('KidKanbanBoard - Drag and Drop Event Handling (Part 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // For Part 2 tests, specific column setups are often done per test or using a specific mock return value.
    mockGetKanbanColumnConfigs.mockReturnValue([]); // Default for Part 2 as well, can be overridden in specific tests
    latestContextMocks = null; // Reset on each test run

    localStorageMock = localStorageMockFactory(); // Reset localStorage for each test
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
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
      activatorEvent: {} as any,
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
    const dragStartEvent: DragStartEvent = { active: createMockActive('inst1', 'daily_active'), activatorEvent: {} as any };
    act(() => { dndContextProps.onDragStart(dragStartEvent); });
    expect(screen.getByTestId('drag-overlay-content')).toBeInTheDocument();

    // Now, simulate drag end
    const dragEndEvent: DragEndEvent = {
      active: createMockActive('inst1', 'daily_active'),
      over: createMockOver('inst3', 'daily_active'), // Dropping inst1 over inst3
      delta: { x: 0, y: 0 },
      collisions: null,
      activatorEvent: {} as any,
    };
    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });
    expect(screen.queryByTestId('drag-overlay-content')).not.toBeInTheDocument();
  });

  test('handleDragCancel clears activeDragItem and DragOverlay', () => {
    renderKidKanbanBoard('kid1');
    const dragStartEvent: DragStartEvent = { active: createMockActive('inst1', 'daily_active'), activatorEvent: {} as any };
    act(() => { dndContextProps.onDragStart(dragStartEvent); });
    expect(screen.getByTestId('drag-overlay-content')).toBeInTheDocument();

    const dragCancelEvent = {
        active: dragStartEvent.active,
        activatorEvent: {} as any,
    };
    act(() => {
      dndContextProps.onDragCancel(dragCancelEvent);
    });
    expect(screen.queryByTestId('drag-overlay-content')).not.toBeInTheDocument();
  });

  test('handleDragEnd - reorders items in the same column (active)', () => {
    renderKidKanbanBoard('kid1');
    const activeColumnId = 'daily_active';
    const kidId = 'kid1';

    // Initial active chores for kid1, default order (inst1, inst3, instX, instY, instZ)
    // Let's say inst1, inst3, instX, instY, instZ are active
    const initialActiveChores = mockChoreInstancesData.filter(c => !c.isComplete);
    const choreIds = initialActiveChores.map(c => c.id);

    const dragEndEvent: DragEndEvent = {
      active: createMockActive('instX', activeColumnId, 2, choreIds),
      over: createMockOver('instY', activeColumnId, 3, choreIds),
      delta: { x: 0, y: 0 },
      collisions: null,
      activatorEvent: {} as any,
    };

    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });

    const activeColumn = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)?.[0]?.column;
    // Expected: inst1, inst3, instY, instX, instZ (if instX moved over instY)
    // arrayMove(arr, 2, 3) on [inst1, inst3, instX, instY, instZ]
    // results in [inst1, inst3, instY, instX, instZ]
    const expectedOrder = ['inst1', 'inst3', 'instY', 'instX', 'instZ'];
    expect(activeColumn?.chores.map((c: ChoreInstance) => c.id)).toEqual(expectedOrder);
    expect(latestContextMocks?.updateKanbanChoreOrder).toHaveBeenCalledWith(kidId, activeColumnId, expectedOrder);
  });

  test('handleDragEnd - moves item from active to completed column and updates status', () => {
    const kidId = 'kid1';
    const dynamicCol1: KanbanColumnConfig = { id: 'daily_active', kidId, title: 'Active', order: 0 };
    const dynamicCol2: KanbanColumnConfig = { id: 'daily_completed', kidId, title: 'Completed', order: 1 };
    mockGetKanbanColumnConfigs.mockReturnValue([dynamicCol1, dynamicCol2]);

    renderKidKanbanBoard(kidId, mockContextValueFactory(mockKanbanChoreOrdersData));

    const dragEndEvent: DragEndEvent = {
      active: createMockActive('inst1', dynamicCol1.id),
      over: createMockOver(dynamicCol2.id, dynamicCol2.id),
      delta: { x: 0, y: 0 },
      collisions: null,
      activatorEvent: {} as any,
    };

    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });

    expect(latestContextMocks?.updateChoreInstanceColumn).toHaveBeenCalledWith('inst1', dynamicCol2.id);

    const col1Data = mockKanbanColumn.mock.calls.find(call => call[0].column.id === dynamicCol1.id)?.[0]?.column;
    expect(col1Data?.chores.find((c: ChoreInstance) => c.id === 'inst1')).toBeUndefined();

    const col2Data = mockKanbanColumn.mock.calls.find(call => call[0].column.id === dynamicCol2.id)?.[0]?.column;
    const movedItem = col2Data?.chores.find((c: ChoreInstance) => c.id === 'inst1');
    expect(movedItem).toBeDefined();
    expect(movedItem?.kanbanColumnId).toBe(dynamicCol2.id);
  });

  test('handleDragEnd - moves item between dynamic columns and updates its kanbanColumnId (status unchanged)', () => {
    const kidId = 'kid1';
    const dynamicCol1: KanbanColumnConfig = { id: 'dynCol1', kidId, title: 'Dynamic Col 1', order: 0 };
    const dynamicCol2: KanbanColumnConfig = { id: 'dynCol2', kidId, title: 'Dynamic Col 2', order: 1 };
    mockGetKanbanColumnConfigs.mockReturnValue([dynamicCol1, dynamicCol2]);

    mockChoreInstancesData = mockChoreInstancesData.map(inst =>
      inst.id === 'inst2' ? { ...inst, kanbanColumnId: dynamicCol1.id, isComplete: true } : inst
    );

    renderKidKanbanBoard(kidId, mockContextValueFactory(mockKanbanChoreOrdersData));

    const dragEndEvent: DragEndEvent = {
      active: createMockActive('inst2', dynamicCol1.id),
      over: createMockOver(dynamicCol2.id, dynamicCol2.id),
      delta: { x: 0, y: 0 },
      collisions: null,
      activatorEvent: {} as any,
    };

    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });

    expect(latestContextMocks?.updateChoreInstanceColumn).toHaveBeenCalledWith('inst2', dynamicCol2.id);
    expect(latestContextMocks?.toggleChoreInstanceComplete).not.toHaveBeenCalled();

    const col1Data = mockKanbanColumn.mock.calls.find(call => call[0].column.id === dynamicCol1.id)?.[0]?.column;
    expect(col1Data?.chores.find((c: ChoreInstance) => c.id === 'inst2')).toBeUndefined();

    const col2Data = mockKanbanColumn.mock.calls.find(call => call[0].column.id === dynamicCol2.id)?.[0]?.column;
    const movedItem = col2Data?.chores.find((c: ChoreInstance) => c.id === 'inst2');
    expect(movedItem).toBeDefined();
    expect(movedItem?.kanbanColumnId).toBe(dynamicCol2.id);
    expect(movedItem?.isComplete).toBe(true);
  });


  test('handleDragEnd - no change if dropped on self and order is same', () => {
    renderKidKanbanBoard('kid1');
    const activeColumnId = 'daily_active';
    const initialActiveChores = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)?.[0]?.column.chores;

    const dragEndEvent: DragEndEvent = {
      active: createMockActive('inst1', activeColumnId, 0, ['inst1', 'inst3']),
      over: createMockOver('inst1', activeColumnId, 0, ['inst1', 'inst3']), // Dropped on self, same index
      delta: { x: 0, y: 0 },
      collisions: null,
      activatorEvent: {} as any,
    };

    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });

    const finalActiveChores = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)?.[0]?.column.chores;
    expect(finalActiveChores?.map((c:ChoreInstance) => c.id)).toEqual(initialActiveChores?.map((c:ChoreInstance) => c.id));
    expect(latestContextMocks?.toggleChoreInstanceComplete).not.toHaveBeenCalled();
  });

  test('handleDragEnd - no action if dropped outside any droppable area (over is null)', () => {
    renderKidKanbanBoard('kid1');
    const initialColumnsState = JSON.stringify(mockKanbanColumn.mock.calls.map(call => call[0].column));

    const dragEndEvent: DragEndEvent = {
      active: createMockActive('inst1', 'daily_active'),
      over: null, // Dropped outside
      delta: { x: 0, y: 0 },
      collisions: null,
      activatorEvent: {} as any,
    };

    act(() => {
      dndContextProps.onDragEnd(dragEndEvent);
    });

    const finalColumnsState = JSON.stringify(mockKanbanColumn.mock.calls.map(call => call[0].column));
    expect(finalColumnsState).toEqual(initialColumnsState); // No change to columns
    expect(latestContextMocks?.toggleChoreInstanceComplete).not.toHaveBeenCalled();
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

    const activeColumn = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)?.[0]?.column;
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
    let activeColumn = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)?.[0]?.column;
    expect(activeColumn.chores.map((c: ChoreInstance) => c.id)).toEqual(['instZ', 'instX', 'instY', 'inst1', 'inst3']);

    // User changes sort to "Title"
    const sortBySelect = screen.getByLabelText(/Sort by:/i);
    await user.selectOptions(sortBySelect, 'title');

    // Verify updateKanbanChoreOrder was called to clear orders for visible columns
    expect(latestContextMocks?.updateKanbanChoreOrder).toHaveBeenCalledWith(kidId, activeColumnId, []);
    expect(latestContextMocks?.updateKanbanChoreOrder).toHaveBeenCalledWith(kidId, completedColumnId, []);

    // Verify chores are now sorted by title (mockKanbanColumn receives chores sorted by KidKanbanBoard's useEffect)
    // Titles: WalkDog(def1,inst1), CleanRoom(def2,inst2), DoHomework(def3,inst3), ChoreX(def5,instX), ChoreY(def6,instY), ChoreZ(def7,instZ)
    // Active chores for kid1: inst1, inst3, instX, instY, instZ
    // Titles: WalkDog, DoHomework, ChoreX, ChoreY, ChoreZ
    // Expected ASC title order: ChoreX, ChoreY, ChoreZ, DoHomework, WalkDog
    activeColumn = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)?.[0]?.column;
    expect(activeColumn.chores.map((c: ChoreInstance) => c.id)).toEqual(['instX', 'instY', 'instZ', 'inst3', 'inst1']);

    // Verify ARIA attributes for the columns container
    expect(screen.getByLabelText('Kanban board columns')).toHaveAttribute('role', 'list');
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
    expect(latestContextMocks?.updateKanbanChoreOrder).toHaveBeenCalledWith(kidId, activeColumnId, []);

    // Simulate the context actually clearing the order for the next step
    delete mockKanbanChoreOrdersData[`${kidId}-${activeColumnId}`];
    // Re-render or ensure context update propagates if `renderKidKanbanBoard` doesn't re-read mockKanbanChoreOrdersData directly
    // For this test, we will assume the effect of updateKanbanChoreOrder has cleared it from the perspective of ChoresContext

    // 2. User switches back to "My Order / Due Date"
    await user.selectOptions(sortBySelect, 'instanceDate');

    // Verify chores are now in default instanceDate order (all have same date, so original/ID order)
    // Active kid1 chores: inst1, inst3, instX, instY, instZ
    // Default order (assuming by ID as dates are same): inst1, inst3, instX, instY, instZ
    const activeColumn = mockKanbanColumn.mock.calls.find(call => call[0].column.id === activeColumnId)?.[0]?.column;
    const defaultOrder = mockChoreInstancesData
        .filter(c => !c.isComplete)
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

    // Verify ARIA attributes for the columns container
    expect(screen.getByLabelText('Kanban board columns')).toHaveAttribute('role', 'list');

    const todayStr = getTodayDateString();
    // Expect generateInstancesForPeriod to be called with the ID of the first column ('col1_todo')
    expect(latestContextMocks?.generateInstancesForPeriod).toHaveBeenCalledWith(todayStr, todayStr, userCols[0].id);
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
    expect(latestContextMocks?.generateInstancesForPeriod).toHaveBeenCalledWith(todayStr, todayStr, undefined);
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
      activatorEvent: {} as any,
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
      activatorEvent: {} as any,
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
