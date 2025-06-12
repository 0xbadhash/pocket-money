import { vi } from 'vitest';

// Declare mocks at the very top
// Use vi.hoisted() for mocks that need to be accessed within vi.mock factory functions
const mockSortableContextFn = vi.hoisted(() => vi.fn(({ children }) => <>{children}</>));
const mockDragOverlay = vi.hoisted(() => vi.fn(({ children }) => children ? <div data-testid="drag-overlay-content">{children}</div> : null));
const mockKanbanColumn = vi.hoisted(() => vi.fn(({ column, theme, instances, onChoreClick }) => (
  <div data-testid={`mock-kanban-column-${column.id}`} aria-label={`${column.title} column`}>
    <h2>{column.title}</h2>
    {instances?.map((inst: ChoreInstance & { definition?: ChoreDefinition } ) => (
      <div key={inst.id} data-testid={`chore-${inst.id}`} onClick={() => onChoreClick?.(inst.id)}>
        {inst.definition?.title || inst.id} ({inst.isComplete ? 'C' : 'A'})
      </div>
    ))}
  </div>
)));

import { render, screen, within as rtlWithin } from '@testing-library/react';
import { ChoresContext } from '../../contexts/ChoresContext';
import { UserContext } from '../../contexts/UserContext';
import KidKanbanBoard from './KidKanbanBoard';
import type { ChoreDefinition, ChoreInstance, KanbanColumnConfig } from '../../types';
import '@testing-library/jest-dom';
import type { Active, Over } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import userEvent from '@testing-library/user-event';
import { act } from 'react'; 
import * as actualDateUtils from '../../utils/dateUtils'; 
// Import the entire module to access its mocked functions correctly
import * as dateUtils from '../../utils/dateUtils';

// Mock dateUtils to control dates
vi.mock('../../utils/dateUtils', async () => {
  const actual = await vi.importActual('../../utils/dateUtils') as typeof actualDateUtils;
  return {
    // Spread actual implementations first
    ...actual,
    // Then override with mocks
    getTodayDateString: vi.fn(() => '2024-01-01'), 
    getWeekRange: vi.fn((dateParam?: Date) => actual.getWeekRange(dateParam || new Date('2024-01-01'))),
    getMonthRange: vi.fn((dateParam?: Date) => actual.getMonthRange(dateParam || new Date('2024-01-01'))),
  };
});


vi.mock('./KanbanColumn', () => ({ default: mockKanbanColumn }));
vi.mock('./KanbanCard', () => ({
    default: vi.fn(({ instance, definition }) => (
      <div data-testid={`mock-kanban-card-${instance.id}`}>{definition.title}</div>
    ))
}));


vi.mock('@dnd-kit/core', async (importOriginal) => {
    const actual = await importOriginal() as object;
    return { ...actual, DndContext: vi.fn((props) => { dndContextProps = props; return <>{props.children}</>; }),
        useSensor: vi.fn(), useSensors: vi.fn(() => []), DragOverlay: mockDragOverlay };
});
vi.mock('@dnd-kit/sortable', async (importOriginal) => {
  const actual = await importOriginal() as object;
  return { ...actual, sortableKeyboardCoordinates: vi.fn(),
    arrayMove: vi.fn((arr, from, to) => { const newArr = [...arr]; if (from < 0 || from >= newArr.length || to < 0 || to >= newArr.length) return newArr; const [moved] = newArr.splice(from, 1); newArr.splice(to, 0, moved); return newArr; }),
    SortableContext: mockSortableContextFn
  };
});

const localStorageMockFactory = () => {
  let store: Record<string, string> = {};
  return { getItem: vi.fn((key: string) => store[key] || null), setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }), clear: vi.fn(() => { store = {}; }), removeItem: vi.fn((key: string) => { delete store[key]; }), getStore: () => store, };
};
let localStorageMock = localStorageMockFactory();

const mockChoreDefinitions: ChoreDefinition[] = [
  { id: 'def1', title: 'Walk the Dog', assignedKidId: 'kid1', rewardAmount: 5, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  { id: 'def2', title: 'Clean Room', assignedKidId: 'kid1', rewardAmount: 10, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  { id: 'def3', title: 'Do Homework', assignedKidId: 'kid1', rewardAmount: 0, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  { id: 'def4', title: 'Wash Dishes', assignedKidId: 'kid2', rewardAmount: 3, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  { id: 'def5', title: 'Chore X (for custom order)', assignedKidId: 'kid1', rewardAmount: 1, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  { id: 'def6', title: 'Chore Y (for custom order)', assignedKidId: 'kid1', rewardAmount: 1, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
  { id: 'def7', title: 'Chore Z (for custom order)', assignedKidId: 'kid1', rewardAmount: 1, subTasks:[], tags:[], recurrenceType: null, createdAt: '2023-01-01', updatedAt: '2023-01-01', hour:10, minute:0, timeOfDay:'AM' },
];

let mockChoreInstancesData: ChoreInstance[]; 
const today_fixed_for_reset = '2024-01-01'; 

const resetMockChoreInstances = () => {
    mockChoreInstancesData = [
        { id: 'inst1', choreDefinitionId: 'def1', instanceDate: today_fixed_for_reset, isComplete: false, assignedKidId: 'kid1' },
        { id: 'inst2', choreDefinitionId: 'def2', instanceDate: today_fixed_for_reset, isComplete: true, assignedKidId: 'kid1' },
        { id: 'inst3', choreDefinitionId: 'def3', instanceDate: today_fixed_for_reset, isComplete: false, assignedKidId: 'kid1' },
        { id: 'inst4', choreDefinitionId: 'def4', instanceDate: today_fixed_for_reset, isComplete: false, assignedKidId: 'kid2' },
        { id: 'instX', choreDefinitionId: 'def5', instanceDate: today_fixed_for_reset, isComplete: false, assignedKidId: 'kid1' },
        { id: 'instY', choreDefinitionId: 'def6', instanceDate: today_fixed_for_reset, isComplete: false, assignedKidId: 'kid1' },
        { id: 'instZ', choreDefinitionId: 'def7', instanceDate: today_fixed_for_reset, isComplete: false, assignedKidId: 'kid1' },
    ];
};

let mockKanbanChoreOrdersData: Record<string, string[]> = {};
const resetMockKanbanChoreOrders = () => { mockKanbanChoreOrdersData = {}; };

let latestContextMocks: { generateInstancesForPeriod: ReturnType<typeof vi.fn>; toggleChoreInstanceComplete: ReturnType<typeof vi.fn>; updateKanbanChoreOrder: ReturnType<typeof vi.fn>; updateChoreInstanceColumn: ReturnType<typeof vi.fn>; } | null = null;

const mockContextValueFactory = (customOrders: Record<string, string[]> = {}) => {
    const newMocks = {
        generateInstancesForPeriod: vi.fn(), toggleChoreInstanceComplete: vi.fn(), updateKanbanChoreOrder: vi.fn(), updateChoreInstanceColumn: vi.fn(),
        addChoreDefinition: vi.fn(), updateChoreDefinition: vi.fn(), deleteChoreDefinition: vi.fn(), addChoreInstance: vi.fn(), updateChoreInstance: vi.fn(), deleteChoreInstance: vi.fn(), toggleSubTaskComplete: vi.fn(),
    };
    latestContextMocks = newMocks; 
    const currentDefinitions = JSON.parse(JSON.stringify(mockChoreDefinitions)); 
    const currentInstances = JSON.parse(JSON.stringify(mockChoreInstancesData));
    const contextObject = {
        choreDefinitions: currentDefinitions, choreInstances: currentInstances, kanbanChoreOrders: JSON.parse(JSON.stringify(customOrders)), ...newMocks, 
        getDefinitionById: (id: string) => contextObject.choreDefinitions.find(d => d.id === id),
        getInstancesForDefinition: (defId: string) => contextObject.choreInstances.filter(i => i.choreDefinitionId === defId),
        loadingDefinitions: false, loadingInstances: false, errorDefinitions: null, errorInstances: null,
        getChoreDefinitionsForKid: (kidId: string) => contextObject.choreDefinitions.filter(def => def.assignedKidId === kidId),
    };
    return contextObject as any;
};

const mockGetKanbanColumnConfigs = vi.fn();
const mockUserContextValue = {
    user: { id: 'user1', username: 'Test User', email: '', kids: [{id: 'kid1', name: 'Test Kid', kanbanColumnConfigs: []},{id: 'kid2', name: 'Test Kid2', kanbanColumnConfigs: []}]},
    loading: false, error: null, getKanbanColumnConfigs: mockGetKanbanColumnConfigs,
    login: vi.fn(), logout: vi.fn(), updateUser: vi.fn(), addKid: vi.fn(), updateKid: vi.fn(), deleteKid: vi.fn(),
    addKanbanColumnConfig: vi.fn(), updateKanbanColumnConfig: vi.fn(), deleteKanbanColumnConfig: vi.fn(), reorderKanbanColumnConfigs: vi.fn(),
};

let dndContextProps: any = {};

const renderKidKanbanBoard = ( kidId = 'kid1', choresContextVal?: any, userContextVal?: any ) => {
  const finalChoresContextVal = choresContextVal || mockContextValueFactory(mockKanbanChoreOrdersData);
  const finalUserContextVal = userContextVal || { ...mockUserContextValue, getKanbanColumnConfigs: mockGetKanbanColumnConfigs };
  const instancesToUse = (finalChoresContextVal && finalChoresContextVal.choreInstances && finalChoresContextVal.choreInstances.length > 0)
    ? finalChoresContextVal.choreInstances : [...mockChoreInstancesData];
  const freshChoresContext = {...finalChoresContextVal, choreInstances: instancesToUse, kanbanChoreOrders: {...finalChoresContextVal.kanbanChoreOrders}};
  const kidExists = finalUserContextVal.user?.kids.find((k:any) => k.id === kidId);
  let resolvedUserContextVal = finalUserContextVal;
  if (finalUserContextVal.user && !kidExists) {
    resolvedUserContextVal = { ...finalUserContextVal, user: { ...finalUserContextVal.user, kids: [...finalUserContextVal.user.kids, { id: kidId, name: `Test Kid ${kidId}`, kanbanColumnConfigs: [] }]}};
  }
  return render( <UserContext.Provider value={resolvedUserContextVal}><ChoresContext.Provider value={freshChoresContext}><KidKanbanBoard kidId={kidId} /></ChoresContext.Provider></UserContext.Provider> );
};

const createMockActive = (id: string, containerId: string, index = 0, items: string[] = []): Active => ({ id, data: { current: { sortable: { containerId, index, items } } }, rect: { current: { initial: null, translated: null } }, });
const createMockOver = (id: string, containerId?: string, index = 0, items: string[] = []): Over => ({ id, rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }, data: { current: containerId ? { sortable: { containerId, index, items } } : {} }, disabled: false, });

describe('KidKanbanBoard - Rendering and Basic Interactions (Part 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Access mocks through the imported module namespace
    (dateUtils.getTodayDateString as vi.Mock).mockReturnValue('2024-01-01');
    (dateUtils.getWeekRange as vi.Mock).mockImplementation((date = new Date('2024-01-01')) => actualDateUtils.getWeekRange(date));
    (dateUtils.getMonthRange as vi.Mock).mockImplementation((date = new Date('2024-01-01')) => actualDateUtils.getMonthRange(date));

    mockGetKanbanColumnConfigs.mockReturnValue([]); 
    latestContextMocks = null; 
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
    localStorageMock.getItem.mockImplementation((key: string) => (key === 'kanban_columnTheme') ? 'default' : null);
    resetMockChoreInstances(); 
    dndContextProps = {}; 
  });

  test('renders initial controls and calls generateInstancesForPeriod for today', () => {
    renderKidKanbanBoard();
    expect(screen.getByRole('button', { name: 'Daily' })).toBeDisabled();
    expect(latestContextMocks?.generateInstancesForPeriod).toHaveBeenCalledWith('2024-01-01', '2024-01-01', undefined);
  });

  test('renders columns and chores correctly for default (daily) period', () => {
    resetMockChoreInstances(); 
    const dailyActiveCol_rcTest: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const dailyCompletedCol_rcTest: KanbanColumnConfig = { id: 'daily_completed', title: 'Today - Completed', order: 1, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const customUserContext_rcTest = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol_rcTest, dailyCompletedCol_rcTest]) };
    renderKidKanbanBoard('kid1', mockContextValueFactory(), customUserContext_rcTest);
    expect(screen.getByRole('heading', { name: 'Today - Active' })).toBeInTheDocument();
    const activeColumn = screen.getByTestId('mock-kanban-column-daily_active');
    expect(rtlWithin(activeColumn).getByTestId('chore-inst1')).toHaveTextContent('inst1 (A)');
    expect(rtlWithin(activeColumn).getByTestId('chore-inst3')).toHaveTextContent('inst3 (A)');
  });

  test('period selection calls generateInstancesForPeriod and updates titles', async () => {
    const user_psTest = userEvent.setup();
    (dateUtils.getTodayDateString as vi.Mock).mockReturnValue('2024-01-01');
    resetMockChoreInstances();

    const initialDailyActiveCol_psTest: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const initialDailyCompletedCol_psTest: KanbanColumnConfig = { id: 'daily_completed', title: 'Today - Completed', order: 1, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const initialMockUserGetColumns_psTest = vi.fn().mockReturnValue([initialDailyActiveCol_psTest, initialDailyCompletedCol_psTest]);
    const initialCustomUserContext_psTest = { ...mockUserContextValue, getKanbanColumnConfigs: initialMockUserGetColumns_psTest };
    
    let r_psTest = renderKidKanbanBoard('kid1', mockContextValueFactory(), initialCustomUserContext_psTest);
    expect(r_psTest.getByRole('heading', { name: 'Today - Active' })).toBeInTheDocument();
    expect(latestContextMocks?.generateInstancesForPeriod).toHaveBeenCalledWith('2024-01-01', '2024-01-01', initialDailyActiveCol_psTest.id);

    // Test Weekly
    const weeklyActiveCol_psTest: KanbanColumnConfig = { id: 'weekly_active', title: 'This Week - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const weeklyUserContext_psTest = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [weeklyActiveCol_psTest]) };
    r_psTest.unmount(); 
    r_psTest = renderKidKanbanBoard('kid1', mockContextValueFactory(), weeklyUserContext_psTest); 
    
    (dateUtils.getWeekRange as vi.Mock).mockReturnValueOnce({ start: new Date('2024-01-01'), end: new Date('2024-01-07')});
    await user_psTest.click(r_psTest.getByRole('button', { name: 'Weekly' })); 
    expect(latestContextMocks?.generateInstancesForPeriod).toHaveBeenCalledWith( 
      '2024-01-01', 
      '2024-01-07', 
      weeklyActiveCol_psTest.id
    );
    expect(r_psTest.getByRole('heading', { name: 'This Week - Active' })).toBeInTheDocument();
    
    // Test Monthly
    const monthlyActiveCol_psTest: KanbanColumnConfig = { id: 'monthly_active', title: 'This Month - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const monthlyUserContext_psTest = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [monthlyActiveCol_psTest]) };
    r_psTest.unmount(); 
    r_psTest = renderKidKanbanBoard('kid1', mockContextValueFactory(), monthlyUserContext_psTest); 
    
    (dateUtils.getMonthRange as vi.Mock).mockReturnValueOnce({ start: new Date('2024-01-01'), end: new Date('2024-01-31')});
    await user_psTest.click(r_psTest.getByRole('button', { name: 'Monthly' })); 
    expect(latestContextMocks?.generateInstancesForPeriod).toHaveBeenCalledWith(
      '2024-01-01', 
      '2024-01-31', 
      monthlyActiveCol_psTest.id
    );
    expect(r_psTest.getByRole('heading', { name: 'This Month - Active' })).toBeInTheDocument();
  });

  test('reward filter updates displayed chores', async () => {
    const user_rfTest = userEvent.setup();
    resetMockChoreInstances(); 
    const dailyActiveCol_rfTest: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const dailyCompletedCol_rfTest: KanbanColumnConfig = { id: 'daily_completed', title: 'Today - Completed', order: 1, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const customUserContext_rfTest = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol_rfTest, dailyCompletedCol_rfTest]) };
    renderKidKanbanBoard('kid1', mockContextValueFactory(), customUserContext_rfTest);

    let activeColumn_rfTest = screen.getByTestId('mock-kanban-column-daily_active');
    expect(rtlWithin(activeColumn_rfTest).getByTestId('chore-inst1')).toBeInTheDocument();
    const rewardFilterSelect_rfTest = screen.getByLabelText(/Filter by Reward:/i);
    await user_rfTest.selectOptions(rewardFilterSelect_rfTest, 'has_reward');
    activeColumn_rfTest = screen.getByTestId('mock-kanban-column-daily_active'); 
    expect(rtlWithin(activeColumn_rfTest).getByTestId('chore-inst1')).toBeInTheDocument();
    await user_rfTest.selectOptions(rewardFilterSelect_rfTest, 'no_reward');
    activeColumn_rfTest = screen.getByTestId('mock-kanban-column-daily_active'); 
    expect(rtlWithin(activeColumn_rfTest).getByTestId('chore-inst3')).toBeInTheDocument();
  });

  test('sort option changes order of chores', async () => {
    const user_sortTest = userEvent.setup();
    const today_sortTest = (dateUtils.getTodayDateString as vi.Mock)();
    const sortTestInstances_sortTest: ChoreInstance[] = [
      { id: 'c_inst', choreDefinitionId: 'def3', instanceDate: today_sortTest, isComplete: false, assignedKidId: 'kid1' }, 
      { id: 'a_inst', choreDefinitionId: 'def1', instanceDate: today_sortTest, isComplete: false, assignedKidId: 'kid1' }, 
      { id: 'b_inst', choreDefinitionId: 'def2', instanceDate: today_sortTest, isComplete: false, assignedKidId: 'kid1' }, 
    ];
    const dailyActiveCol_sortTest: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const customUserContext_sortTest = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol_sortTest, {id: 'comp', title:'C', kidId:'kid1', order:1, createdAt:'', updatedAt:''}]) };
    const customChoresContext_sortTest = mockContextValueFactory(); 
    customChoresContext_sortTest.choreInstances = [...sortTestInstances_sortTest]; 
    const sortInstanceDefIds_sortTest = sortTestInstances_sortTest.map(si => si.choreDefinitionId);
    customChoresContext_sortTest.choreDefinitions = mockChoreDefinitions.filter(def => sortInstanceDefIds_sortTest.includes(def.id));
    renderKidKanbanBoard('kid1', customChoresContext_sortTest, customUserContext_sortTest);
    const sortBySelect_sortTest = screen.getByLabelText(/Sort by:/i);
    const sortDirectionButton_sortTest = screen.getByRole('button', { name: /A-Z \/ Old-New ↑/i });
    await user_sortTest.selectOptions(sortBySelect_sortTest, 'title');
    let activeColumnCalls_sortTest = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === 'daily_active');
    let lastActiveColumnCall_sortTest = activeColumnCalls_sortTest[activeColumnCalls_sortTest.length - 1];
    let activeColumnChores_sortTest = lastActiveColumnCall_sortTest?.[0]?.column.chores;
    expect(activeColumnChores_sortTest?.map((c:ChoreInstance) => c.id)).toEqual(['b_inst', 'c_inst', 'a_inst']);
    await user_sortTest.click(sortDirectionButton_sortTest); 
    activeColumnCalls_sortTest = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === 'daily_active');
    lastActiveColumnCall_sortTest = activeColumnCalls_sortTest[activeColumnCalls_sortTest.length - 1];
    activeColumnChores_sortTest = lastActiveColumnCall_sortTest?.[0]?.column.chores;
    expect(activeColumnChores_sortTest?.map((c:ChoreInstance) => c.id)).toEqual(['a_inst', 'c_inst', 'b_inst']);
  });

  test('theme selection updates localStorage and column theme prop', async () => {
    const user_themeTest = userEvent.setup();
    const dailyActiveCol_themeTest: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const userContextWithCols_themeTest = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol_themeTest, {id:'comp', title:'C', kidId:'kid1', order:1, createdAt:'', updatedAt:''}]) };
    renderKidKanbanBoard('kid1', mockContextValueFactory(), userContextWithCols_themeTest);
    const themeSelect_themeTest = screen.getByLabelText(/Column Theme:/i);
    await user_themeTest.selectOptions(themeSelect_themeTest, 'pastel');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('kanban_columnTheme', 'pastel');
    let pastelCall_themeTest = mockKanbanColumn.mock.calls.find(call => call[0].column.id === 'daily_active' && call[0].theme === 'pastel');
    expect(pastelCall_themeTest).toBeDefined();
    await user_themeTest.selectOptions(themeSelect_themeTest, 'ocean');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('kanban_columnTheme', 'ocean');
    let oceanCall_themeTest = mockKanbanColumn.mock.calls.find(call => call[0].column.id === 'daily_active' && call[0].theme === 'ocean');
    expect(oceanCall_themeTest).toBeDefined();
  });
});

describe('KidKanbanBoard - Drag and Drop Event Handling (Part 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKanbanColumnConfigs.mockReturnValue([]); 
    latestContextMocks = null; 
    resetMockChoreInstances(); 
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true, });
    localStorageMock.getItem.mockImplementation((key: string) => (key === 'kanban_columnTheme') ? 'default' : (key === 'kanbanChoreOrders' ? JSON.stringify(mockKanbanChoreOrdersData) : null));
    resetMockKanbanChoreOrders(); 
    dndContextProps = {}; 
  });

  test('handleDragStart sets activeDragItem and shows DragOverlay', () => {
    const dailyActiveCol_dragStart: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const userContext_dragStart = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol_dragStart]) };
    renderKidKanbanBoard('kid1', mockContextValueFactory(), userContext_dragStart);
    const dragStartEvent: DragStartEvent = { active: createMockActive('inst1', 'daily_active'), activatorEvent: {} as any };
    act(() => { dndContextProps.onDragStart(dragStartEvent); });
    expect(mockDragOverlay).toHaveBeenCalled();
    expect(screen.getByTestId('drag-overlay-content')).toBeInTheDocument();
  });

  test('handleDragEnd clears activeDragItem and DragOverlay', () => {
    const dailyActiveCol_dragEndClear: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const userContext_dragEndClear = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol_dragEndClear]) };
    renderKidKanbanBoard('kid1', mockContextValueFactory(), userContext_dragEndClear);
    const dragStartEvent: DragStartEvent = { active: createMockActive('inst1', 'daily_active'), activatorEvent: {} as any };
    act(() => { dndContextProps.onDragStart(dragStartEvent); });
    const dragEndEvent: DragEndEvent = { active: createMockActive('inst1', 'daily_active'), over: createMockOver('inst3', 'daily_active'), delta: { x: 0, y: 0 }, collisions: null, activatorEvent: {} as any, };
    act(() => { dndContextProps.onDragEnd(dragEndEvent); });
    expect(screen.queryByTestId('drag-overlay-content')).not.toBeInTheDocument();
  });

  test('handleDragCancel clears activeDragItem and DragOverlay', () => {
    const dailyActiveCol_dragCancel: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: 'kid1', createdAt: '', updatedAt: '' };
    const userContext_dragCancel = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol_dragCancel]) };
    renderKidKanbanBoard('kid1', mockContextValueFactory(), userContext_dragCancel);
    const dragStartEvent: DragStartEvent = { active: createMockActive('inst1', 'daily_active'), activatorEvent: {} as any };
    act(() => { dndContextProps.onDragStart(dragStartEvent); });
    const dragCancelEvent = { active: dragStartEvent.active, activatorEvent: {} as any };
    act(() => { dndContextProps.onDragCancel(dragCancelEvent); });
    expect(screen.queryByTestId('drag-overlay-content')).not.toBeInTheDocument();
  });

  test('handleDragEnd - reorders items in the same column (active)', () => {
    const kidId_reorder = 'kid1';
    const activeColumnId_reorder = 'daily_active';
    const dailyActiveCol_reorder: KanbanColumnConfig = { id: activeColumnId_reorder, title: 'Today - Active', order: 0, kidId: kidId_reorder, createdAt: '', updatedAt: '' };
    const userContext_reorder = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol_reorder]) };
    resetMockChoreInstances(); 
    let currentTestInstances_reorder = JSON.parse(JSON.stringify(mockChoreInstancesData.filter((i: ChoreInstance) => i.assignedKidId === kidId_reorder && !i.isComplete)));
    let localKanbanChoreOrders_reorder: Record<string, string[]> = {};
    let currentChoresContext_reorder = mockContextValueFactory(localKanbanChoreOrders_reorder);
    currentChoresContext_reorder.choreInstances = currentTestInstances_reorder;
    renderKidKanbanBoard(kidId_reorder, currentChoresContext_reorder, userContext_reorder);
    const choreIds_reorder = currentTestInstances_reorder.map((c: ChoreInstance) => c.id); 
    const dragEndEvent_reorder: DragEndEvent = { active: createMockActive('instX', activeColumnId_reorder, 2, choreIds_reorder), over: createMockOver('instY', activeColumnId_reorder, 3, choreIds_reorder), delta: { x: 0, y: 0 }, collisions: null, activatorEvent: {} as any };
    
    // Set the mock implementation on the context object that KidKanbanBoard will use
    latestContextMocks!.updateKanbanChoreOrder = vi.fn((kId, colId, newOrder) => { // Use latestContextMocks
        localKanbanChoreOrders_reorder[`${kId}-${colId}`] = newOrder;
    });

    act(() => { dndContextProps.onDragEnd(dragEndEvent_reorder); });
    
    const expectedOrder_reorder = ['inst1', 'inst3', 'instY', 'instX', 'instZ'];
    expect(latestContextMocks?.updateKanbanChoreOrder).toHaveBeenCalledWith(kidId_reorder, activeColumnId_reorder, expectedOrder_reorder);

    const updatedChoresContext_reorder = mockContextValueFactory(localKanbanChoreOrders_reorder);
    updatedChoresContext_reorder.choreInstances = currentTestInstances_reorder; 
    renderKidKanbanBoard(kidId_reorder, updatedChoresContext_reorder, userContext_reorder);
    const callsAfterDrag_reorder = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === activeColumnId_reorder);
    const lastActiveColCall_reorder = callsAfterDrag_reorder.pop();
    expect(lastActiveColCall_reorder?.[0].instances.map((c: ChoreInstance) => c.id)).toEqual(expectedOrder_reorder);
  });

  test('handleDragEnd - moves item from active to completed column and updates status', () => {
    const kidId_mvComp = 'kid1';
    const activeColId_mvComp = 'daily_active'; const completedColId_mvComp = 'daily_completed';
    const activeCol_mvComp: KanbanColumnConfig = { id: activeColId_mvComp, kidId: kidId_mvComp, title: 'Active', order: 0, createdAt: '', updatedAt: '' };
    const completedCol_mvComp: KanbanColumnConfig = { id: completedColId_mvComp, kidId: kidId_mvComp, title: 'Completed', order: 1, createdAt: '', updatedAt: '' };
    const userContext_mvComp = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [activeCol_mvComp, completedCol_mvComp]) };
    let currentTestInstances_mvComp = JSON.parse(JSON.stringify(mockChoreInstancesData));
    let inst1_mvComp = currentTestInstances_mvComp.find((i: ChoreInstance) => i.id === 'inst1');
    if (inst1_mvComp) { inst1_mvComp.isComplete = false; inst1_mvComp.kanbanColumnId = undefined; }
    let currentChoresContext_mvComp = mockContextValueFactory(); currentChoresContext_mvComp.choreInstances = currentTestInstances_mvComp; 
    renderKidKanbanBoard(kidId_mvComp, currentChoresContext_mvComp, userContext_mvComp);
    const dragEndEvent_mvComp: DragEndEvent = { active: createMockActive('inst1', activeCol_mvComp.id), over: createMockOver(completedCol_mvComp.id, completedCol_mvComp.id), delta: { x: 0, y: 0 }, collisions: null, activatorEvent: {} as any, };
    
    latestContextMocks!.updateChoreInstanceColumn = vi.fn((instanceId, newColumnId) => {
      currentTestInstances_mvComp = currentTestInstances_mvComp.map((inst: ChoreInstance) => {
        if (inst.id === instanceId) { const updatedInst = { ...inst, kanbanColumnId: newColumnId }; if (newColumnId === completedColId_mvComp) updatedInst.isComplete = true; return updatedInst; } return inst;
      });
    });
    
    act(() => { dndContextProps.onDragEnd(dragEndEvent_mvComp); });
    expect(latestContextMocks?.updateChoreInstanceColumn).toHaveBeenCalledWith('inst1', completedCol_mvComp.id);
    const updatedChoresContext_mvComp = mockContextValueFactory(); updatedChoresContext_mvComp.choreInstances = currentTestInstances_mvComp; 
    renderKidKanbanBoard(kidId_mvComp, updatedChoresContext_mvComp, userContext_mvComp); 
    const calls_mvComp = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === activeCol_mvComp.id || call[0].column.id === completedCol_mvComp.id);
    expect(calls_mvComp.find(c => c[0].column.id === activeCol_mvComp.id)?.pop()?.[0].instances.find((i:ChoreInstance) => i.id === 'inst1')).toBeUndefined();
    const movedItem_mvComp = calls_mvComp.find(c => c[0].column.id === completedCol_mvComp.id)?.pop()?.[0].instances.find((i:ChoreInstance) => i.id === 'inst1');
    expect(movedItem_mvComp).toBeDefined(); expect(movedItem_mvComp?.kanbanColumnId).toBe(completedCol_mvComp.id); expect(movedItem_mvComp?.isComplete).toBe(true);
  });

  test('handleDragEnd - moves item between dynamic columns and updates its kanbanColumnId (status unchanged)', () => {
    const kidId_mvDyn = 'kid1';
    const dynCol1_mvDyn: KanbanColumnConfig = { id: 'dynCol1', kidId: kidId_mvDyn, title: 'Dynamic Col 1', order: 0, createdAt: '', updatedAt: '' };
    const dynCol2_mvDyn: KanbanColumnConfig = { id: 'dynCol2', kidId: kidId_mvDyn, title: 'Dynamic Col 2', order: 1, createdAt: '', updatedAt: '' };
    const userContext_mvDyn = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dynCol1_mvDyn, dynCol2_mvDyn]) };
    let currentTestInstances_mvDyn = JSON.parse(JSON.stringify(mockChoreInstancesData));
    const inst2Idx = currentTestInstances_mvDyn.findIndex((i: ChoreInstance) => i.id === 'inst2');
    if (inst2Idx !== -1) { currentTestInstances_mvDyn[inst2Idx] = { ...currentTestInstances_mvDyn[inst2Idx], kanbanColumnId: dynCol1_mvDyn.id, isComplete: true }; }
    let currentChoresContext_mvDyn = mockContextValueFactory(); currentChoresContext_mvDyn.choreInstances = currentTestInstances_mvDyn;
    renderKidKanbanBoard(kidId_mvDyn, currentChoresContext_mvDyn, userContext_mvDyn);
    const dragEndEvent_mvDyn: DragEndEvent = { active: createMockActive('inst2', dynCol1_mvDyn.id), over: createMockOver(dynCol2_mvDyn.id, dynCol2_mvDyn.id), delta: { x: 0, y: 0 }, collisions: null, activatorEvent: {} as any, };
    
    latestContextMocks!.updateChoreInstanceColumn = vi.fn((instanceId, newColumnId) => { currentTestInstances_mvDyn = currentTestInstances_mvDyn.map((inst: ChoreInstance) => inst.id === instanceId ? { ...inst, kanbanColumnId: newColumnId } : inst ); });
    latestContextMocks!.toggleChoreInstanceComplete = vi.fn(); 

    act(() => { dndContextProps.onDragEnd(dragEndEvent_mvDyn); });
    expect(latestContextMocks?.updateChoreInstanceColumn).toHaveBeenCalledWith('inst2', dynCol2_mvDyn.id);
    expect(latestContextMocks?.toggleChoreInstanceComplete).not.toHaveBeenCalled(); 
    const updatedChoresContext_mvDyn = mockContextValueFactory(); updatedChoresContext_mvDyn.choreInstances = currentTestInstances_mvDyn;
    renderKidKanbanBoard(kidId_mvDyn, updatedChoresContext_mvDyn, userContext_mvDyn);
    const calls_mvDyn = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === dynCol1_mvDyn.id || call[0].column.id === dynCol2_mvDyn.id);
    expect(calls_mvDyn.find(c => c[0].column.id === dynCol1_mvDyn.id)?.pop()?.[0].instances.find((i:ChoreInstance) => i.id === 'inst2')).toBeUndefined();
    const movedItem_mvDyn = calls_mvDyn.find(c => c[0].column.id === dynCol2_mvDyn.id)?.pop()?.[0].instances.find((i:ChoreInstance) => i.id === 'inst2');
    expect(movedItem_mvDyn).toBeDefined(); expect(movedItem_mvDyn?.kanbanColumnId).toBe(dynCol2_mvDyn.id); expect(movedItem_mvDyn?.isComplete).toBe(true); 
  });

  test('handleDragEnd - no change if dropped on self and order is same', () => {
    const kidId_noSelf = 'kid1'; const activeColumnId_noSelf = 'daily_active';
    const dailyActiveCol_noSelf: KanbanColumnConfig = { id: activeColumnId_noSelf, title: 'Today - Active', order: 0, kidId: kidId_noSelf, createdAt: '', updatedAt: '' };
    const userContext_noSelf = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol_noSelf]) };
    renderKidKanbanBoard(kidId_noSelf, mockContextValueFactory(), userContext_noSelf);
    const initialCalls_noSelf = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === activeColumnId_noSelf);
    const lastInitialCall_noSelf = initialCalls_noSelf[initialCalls_noSelf.length - 1];
    const initialActiveChores_noSelf = lastInitialCall_noSelf?.[0].instances;
    const dragEndEvent_noSelf: DragEndEvent = { active: createMockActive('inst1', activeColumnId_noSelf, 0, ['inst1', 'inst3']), over: createMockOver('inst1', activeColumnId_noSelf, 0, ['inst1', 'inst3']), delta: { x: 0, y: 0 }, collisions: null, activatorEvent: {} as any, };
    act(() => { dndContextProps.onDragEnd(dragEndEvent_noSelf); });
    const finalCalls_noSelf = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === activeColumnId_noSelf);
    const lastFinalCall_noSelf = finalCalls_noSelf[finalCalls_noSelf.length - 1];
    const finalActiveChores_noSelf = lastFinalCall_noSelf?.[0].instances;
    expect(finalActiveChores_noSelf?.map((c:ChoreInstance) => c.id)).toEqual(initialActiveChores_noSelf?.map((c:ChoreInstance) => c.id));
    expect(latestContextMocks?.toggleChoreInstanceComplete).not.toHaveBeenCalled();
  });

  test('handleDragEnd - no action if dropped outside any droppable area (over is null)', () => {
    const kidId_dropNull = 'kid1';
    const dailyActiveCol_dropNull: KanbanColumnConfig = { id: 'daily_active', title: 'Today - Active', order: 0, kidId: kidId_dropNull, createdAt: '', updatedAt: '' };
    const userContext_dropNull = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol_dropNull]) };
    renderKidKanbanBoard(kidId_dropNull, mockContextValueFactory(), userContext_dropNull);
    const initialCalls_dropNull = [...mockKanbanColumn.mock.calls]; 
    const dragEndEvent_dropNull: DragEndEvent = { active: createMockActive('inst1', 'daily_active'), over: null, delta: { x: 0, y: 0 }, collisions: null, activatorEvent: {} as any, };
    act(() => { dndContextProps.onDragEnd(dragEndEvent_dropNull); });
    const finalCalls_dropNull = [...mockKanbanColumn.mock.calls];
    expect(finalCalls_dropNull.length).toEqual(initialCalls_dropNull.length);
    expect(latestContextMocks?.toggleChoreInstanceComplete).not.toHaveBeenCalled();
  });

  test('applies custom order from kanbanChoreOrders when sortBy is "instanceDate"', () => {
    const kidId_co = 'kid1'; const activeColumnId_co = 'daily_active';
    const customOrder_co = ['instZ', 'instX', 'instY']; 
    let localOrders_co: Record<string, string[]> = { [`${kidId_co}-${activeColumnId_co}`]: customOrder_co };
    const dailyActiveCol_co: KanbanColumnConfig = { id: activeColumnId_co, title: 'Today - Active', order: 0, kidId: kidId_co, createdAt: '', updatedAt: '' };
    const userContext_co = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol_co]) };
    let choresContext_co = mockContextValueFactory(localOrders_co); 
    resetMockChoreInstances(); choresContext_co.choreInstances = [...mockChoreInstancesData]; 
    renderKidKanbanBoard(kidId_co, choresContext_co, userContext_co);
    const sortBySelect_co = screen.getByLabelText(/Sort by:/i);
    expect(sortBySelect_co).toHaveValue('instanceDate');
    const calls_co = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === activeColumnId_co);
    const renderedChores_co = calls_co[calls_co.length - 1]?.[0].instances;
    expect(renderedChores_co?.map((c: ChoreInstance) => c.id)).toEqual([...customOrder_co, 'inst1', 'inst3']);
  });

  test('clears custom order for current columns when explicit sort is chosen', async () => {
    const user_clearOrderTest = userEvent.setup(); 
    const kidId_clearOrderTest = 'kid1'; 
    const activeColumnId_clearOrderTest = 'daily_active'; 
    const completedColumnId_clearOrderTest = 'daily_completed'; 
    const dailyActiveCol_clearOrderTest: KanbanColumnConfig = { id: activeColumnId_clearOrderTest, title: 'Today - Active', order: 0, kidId: kidId_clearOrderTest, createdAt: '', updatedAt: '' };
    const dailyCompletedCol_clearOrderTest: KanbanColumnConfig = { id: completedColumnId_clearOrderTest, title: 'Today - Completed', order: 1, kidId: kidId_clearOrderTest, createdAt: '', updatedAt: '' };
    const userContextWithDailyCols_clearOrderTest = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol_clearOrderTest, dailyCompletedCol_clearOrderTest]) };
    let localKanbanChoreOrders_clearOrderTest: Record<string, string[]> = { 
      [`${kidId_clearOrderTest}-${activeColumnId_clearOrderTest}`]: ['instZ', 'instX', 'instY'],
      [`${kidId_clearOrderTest}-${completedColumnId_clearOrderTest}`]: ['inst2'] 
    };
    resetMockChoreInstances(); 
    let currentChoresContext_clearOrderTest = mockContextValueFactory(localKanbanChoreOrders_clearOrderTest); 
    currentChoresContext_clearOrderTest.choreInstances = [...mockChoreInstancesData];
    renderKidKanbanBoard(kidId_clearOrderTest, currentChoresContext_clearOrderTest, userContextWithDailyCols_clearOrderTest);
    let activeColumnCalls_clearOrderTest = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === activeColumnId_clearOrderTest); 
    expect(activeColumnCalls_clearOrderTest.pop()?.[0].instances.map((c: ChoreInstance) => c.id)).toEqual(['instZ', 'instX', 'instY', 'inst1', 'inst3']);
    
    latestContextMocks!.updateKanbanChoreOrder = vi.fn((kId, colId, newOrder) => { 
        localKanbanChoreOrders_clearOrderTest[`${kId}-${colId}`] = newOrder;
    });
    
    const sortBySelect_clearOrderTest = screen.getByLabelText(/Sort by:/i); 
    await user_clearOrderTest.selectOptions(sortBySelect_clearOrderTest, 'title'); 
    expect(latestContextMocks?.updateKanbanChoreOrder).toHaveBeenCalledWith(kidId_clearOrderTest, activeColumnId_clearOrderTest, []);
    expect(latestContextMocks?.updateKanbanChoreOrder).toHaveBeenCalledWith(kidId_clearOrderTest, completedColumnId_clearOrderTest, []);
    
    let updatedChoresContext_clearOrderTest = mockContextValueFactory(localKanbanChoreOrders_clearOrderTest);  
    updatedChoresContext_clearOrderTest.choreInstances = [...mockChoreInstancesData]; 
    renderKidKanbanBoard(kidId_clearOrderTest, updatedChoresContext_clearOrderTest, userContextWithDailyCols_clearOrderTest);
    activeColumnCalls_clearOrderTest = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === activeColumnId_clearOrderTest); 
    expect(activeColumnCalls_clearOrderTest.pop()?.[0].instances.map((c: ChoreInstance) => c.id)).toEqual(['instX', 'instY', 'instZ', 'inst3', 'inst1']);
  });

  test('after explicit sort clears custom order, switching back to "My Order" uses default sort', async () => {
    const user_aesTest = userEvent.setup(); 
    const kidId_aesTest = 'kid1'; 
    const activeColumnId_aesTest = 'daily_active'; 
    const dailyActiveCol_aesTest: KanbanColumnConfig = { id: activeColumnId_aesTest, title: 'Today - Active', order: 0, kidId: kidId_aesTest, createdAt: '', updatedAt: '' }; 
    const userContextWithDailyCols_aesTest = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dailyActiveCol_aesTest]) }; 
    let localKanbanChoreOrders_aesTest: Record<string, string[]> = { [`${kidId_aesTest}-${activeColumnId_aesTest}`]: ['instZ', 'instX', 'instY'] };
    resetMockChoreInstances();
    let currentChoresContext_aesTest = mockContextValueFactory(localKanbanChoreOrders_aesTest); 
    currentChoresContext_aesTest.choreInstances = [...mockChoreInstancesData];
    renderKidKanbanBoard(kidId_aesTest, currentChoresContext_aesTest, userContextWithDailyCols_aesTest);
    const sortBySelect_aesTest = screen.getByLabelText(/Sort by:/i); 
    
    latestContextMocks!.updateKanbanChoreOrder = vi.fn((kId, colId, newOrder) => { 
        localKanbanChoreOrders_aesTest[`${kId}-${colId}`] = newOrder;
    });
    
    await user_aesTest.selectOptions(sortBySelect_aesTest, 'title');
    expect(latestContextMocks?.updateKanbanChoreOrder).toHaveBeenCalledWith(kidId_aesTest, activeColumnId_aesTest, []);
    
    let contextAfterTitleSort_aesTest = mockContextValueFactory(localKanbanChoreOrders_aesTest);  
    contextAfterTitleSort_aesTest.choreInstances = [...mockChoreInstancesData];
    renderKidKanbanBoard(kidId_aesTest, contextAfterTitleSort_aesTest, userContextWithDailyCols_aesTest);
    
    (latestContextMocks?.updateKanbanChoreOrder as vi.Mock).mockClear(); 
    await user_aesTest.selectOptions(sortBySelect_aesTest, 'instanceDate');
    expect(latestContextMocks?.updateKanbanChoreOrder).not.toHaveBeenCalled(); 
    const activeColumnCalls_aesTest = mockKanbanColumn.mock.calls.filter(call => call[0].column.id === activeColumnId_aesTest); 
    const activeColumn_aesTest = activeColumnCalls_aesTest[activeColumnCalls_aesTest.length -1]?.[0]?.column; 
    const defaultOrder_aesTest = contextAfterTitleSort_aesTest.choreInstances  
        .filter((c:ChoreInstance) => !c.isComplete && c.assignedKidId === kidId_aesTest && c.kanbanColumnId !== 'daily_completed') 
        .sort((a,b) => new Date(a.instanceDate).getTime() - new Date(b.instanceDate).getTime() || a.id.localeCompare(b.id)) 
        .map(c => c.id);
    expect(activeColumn_aesTest.chores.map((c: ChoreInstance) => c.id)).toEqual(defaultOrder_aesTest); 
  });

  test('calls generateInstancesForPeriod with default column ID from UserContext', () => {
    const kidId_userColsTest = 'kid1'; 
    const userCols_userColsTest: KanbanColumnConfig[] = [ 
      { id: 'col1_todo', kidId: kidId_userColsTest, title: 'To Do', order: 0, createdAt: '', updatedAt: '' },
      { id: 'col2_prog', kidId: kidId_userColsTest, title: 'In Progress', order: 1, createdAt: '', updatedAt: '' },
    ];
    const mockGetKanbanConfigs_userColsTest = vi.fn(() => userCols_userColsTest);
    const userContext_userColsTest = { ...mockUserContextValue, getKanbanColumnConfigs: mockGetKanbanConfigs_userColsTest};
    renderKidKanbanBoard(kidId_userColsTest, mockContextValueFactory(), userContext_userColsTest);
    const todayStr_userColsTest = (dateUtils.getTodayDateString as vi.Mock)(); 
    expect(latestContextMocks?.generateInstancesForPeriod).toHaveBeenCalledWith(todayStr_userColsTest, todayStr_userColsTest, userCols_userColsTest[0].id);
  });

  test('displays a message and no columns if no columns are configured for the kid', () => {
    const kidId_noColsTest = 'kid_no_cols'; 
    const mockGetKanbanConfigs_noColsTest = vi.fn(() => []);
    const userContext_noColsTest = { ...mockUserContextValue, getKanbanColumnConfigs: mockGetKanbanConfigs_noColsTest};
    renderKidKanbanBoard(kidId_noColsTest, mockContextValueFactory(), userContext_noColsTest);
    expect(screen.getByText(/No Kanban columns are set up for this kid yet./i)).toBeInTheDocument();
  });

  test('calls generateInstancesForPeriod with undefined default column ID if no columns configured', () => {
    const kidId_undefColTest = 'kid_no_cols_for_gen'; 
    const mockGetKanbanConfigs_undefColTest = vi.fn(() => []);
    const userContext_undefColTest = { ...mockUserContextValue, getKanbanColumnConfigs: mockGetKanbanConfigs_undefColTest};
    renderKidKanbanBoard(kidId_undefColTest, mockContextValueFactory(), userContext_undefColTest);
    const todayStr_undefColTest = (dateUtils.getTodayDateString as vi.Mock)();
    expect(latestContextMocks?.generateInstancesForPeriod).toHaveBeenCalledWith(todayStr_undefColTest, todayStr_undefColTest, undefined);
  });

  test('displays and clears action feedback message on successful inter-column drag', async () => {
    vi.useFakeTimers(); 
    const kidId_feedbackTest = 'kid1';
    const dynamicCol1_feedbackTest: KanbanColumnConfig = { id: 'dynCol1', kidId: kidId_feedbackTest, title: 'Column Alpha', order: 0, createdAt: 't', updatedAt: 't' };
    const dynamicCol2_feedbackTest: KanbanColumnConfig = { id: 'dynCol2', kidId: kidId_feedbackTest, title: 'Column Beta', order: 1, createdAt: 't', updatedAt: 't' };
    const userContext_feedbackTest = { ...mockUserContextValue, getKanbanColumnConfigs: vi.fn(() => [dynamicCol1_feedbackTest, dynamicCol2_feedbackTest])};
    let currentTestInstances_feedbackTest = JSON.parse(JSON.stringify(mockChoreInstancesData));
    const instX_idx = currentTestInstances_feedbackTest.findIndex((i:ChoreInstance) => i.id === 'instX');
    if (instX_idx !== -1) currentTestInstances_feedbackTest[instX_idx].kanbanColumnId = dynamicCol1_feedbackTest.id;
    let choresContext_feedbackTest = mockContextValueFactory();
    choresContext_feedbackTest.choreInstances = currentTestInstances_feedbackTest;
    const choreDefForInstX_feedbackTest = choresContext_feedbackTest.choreDefinitions.find(d => d.id === 'def5'); 
    renderKidKanbanBoard(kidId_feedbackTest, choresContext_feedbackTest, userContext_feedbackTest);
    const dragStartEvent_feedbackTest: DragStartEvent = { active: createMockActive('instX', dynamicCol1_feedbackTest.id), activatorEvent: {} as any };
    act(() => { dndContextProps.onDragStart(dragStartEvent_feedbackTest); });
    const dragEndEvent_feedbackTest: DragEndEvent = { active: createMockActive('instX', dynamicCol1_feedbackTest.id), over: createMockOver(dynamicCol2_feedbackTest.id, dynamicCol2_feedbackTest.id), delta: { x: 0, y: 0 }, collisions: null, activatorEvent: {} as any, };
    
    latestContextMocks!.updateChoreInstanceColumn = vi.fn((instanceId, newColumnId) => { 
      currentTestInstances_feedbackTest = currentTestInstances_feedbackTest.map((inst: ChoreInstance) => 
        inst.id === instanceId ? { ...inst, kanbanColumnId: newColumnId } : inst
      );
    });
    act(() => { dndContextProps.onDragEnd(dragEndEvent_feedbackTest); });
    const updatedChoresContext_feedbackTest = mockContextValueFactory();
    updatedChoresContext_feedbackTest.choreInstances = currentTestInstances_feedbackTest;
    renderKidKanbanBoard(kidId_feedbackTest, updatedChoresContext_feedbackTest, userContext_feedbackTest);
    const feedbackMessage_feedbackTest = await screen.findByRole('status'); 
    expect(feedbackMessage_feedbackTest).toHaveTextContent(`${choreDefForInstX_feedbackTest!.title} moved to ${dynamicCol2_feedbackTest.title}.`);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    vi.useRealTimers(); 
  });
});
