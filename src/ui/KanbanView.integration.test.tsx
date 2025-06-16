// src/ui/KanbanView.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KanbanView from './KanbanView'; // The component being tested
import { UserContext, type UserContextType } from '../contexts/UserContext';
import { ChoresContext, type ChoresContextType as AppChoresContextType } from '../contexts/ChoresContext'; // Import ChoresContext
import { describe, it, test, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// Mock child components of KidKanbanBoard to simplify this integration test
// Note: KidKanbanBoard itself is NOT mocked, but its internal KanbanColumn (if it were still used) would be.
// Since KidKanbanBoard now renders DateColumnView which renders KanbanCard, deep mocking isn't practical here.
// We rely on KidKanbanBoard rendering something identifiable.
vi.mock('./kanban_components/DateColumnView', () => ({
  default: vi.fn(() => <div data-testid="mock-date-column-view">Mocked DateColumnView</div>)
}));


// Mock dnd-kit as KidKanbanBoard uses it.
vi.mock('@dnd-kit/core', async (importOriginal) => {
    const actual = await importOriginal() as object;
    return { ...actual, DndContext: vi.fn(({ children }) => <>{children}</>), useSensor: vi.fn(), useSensors: vi.fn(() => []), DragOverlay: vi.fn(({ children }) => <>{children}</>) };
});
vi.mock('@dnd-kit/sortable', async (importOriginal) => {
    const actual = await importOriginal() as object;
    return { ...actual, sortableKeyboardCoordinates: vi.fn(), arrayMove: vi.fn((arr) => arr) };
});


const mockUser = {
  id: 'user1',
  username: 'testuser',
  email: 'test@example.com',
  kids: [
    { id: 'kid1', name: 'Kid Alpha', totalFunds: 10, avatarFilename: 'avatar1.png', kanbanColumnConfigs: [] },
    { id: 'kid2', name: 'Kid Beta', totalFunds: 20, avatarFilename: 'avatar2.png', kanbanColumnConfigs: [] },
  ],
  settings: { defaultView: 'dashboard', theme: 'light' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockGenerateInstancesForPeriod = vi.fn();
const mockGetKanbanColumnConfigs = vi.fn(() => [ // Default swimlanes for KidKanbanBoard
    { id: 'col1', kidId: 'kid1', title: 'To Do', order: 0, color: '#FFFFFF' },
    { id: 'col2', kidId: 'kid1', title: 'In Progress', order: 1, color: '#FFFFE0' },
    { id: 'col3', kidId: 'kid1', title: 'Done', order: 2, color: '#90EE90' },
]);


const baseUserContextValue: UserContextType = {
  user: mockUser,
  loading: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  addKid: vi.fn(),
  updateKid: vi.fn(),
  deleteKid: vi.fn(),
  // uploadKidAvatar: vi.fn(), // Assuming these are not on the type or not needed for these tests
  // fetchUser: vi.fn(),
  updateUser: vi.fn(),
  getKanbanColumnConfigs: mockGetKanbanColumnConfigs,
  addKanbanColumnConfig: vi.fn(),
  updateKanbanColumnConfig: vi.fn(),
  deleteKanbanColumnConfig: vi.fn(),
  reorderKanbanColumnConfigs: vi.fn(),
};

const mockChoresContextValue: AppChoresContextType = {
  choreDefinitions: [],
  choreInstances: [],
  generateInstancesForPeriod: mockGenerateInstancesForPeriod,
  toggleChoreInstanceComplete: vi.fn(),
  addChoreDefinition: vi.fn(),
  updateChoreDefinition: vi.fn(),
  getChoreDefinitionsForKid: vi.fn(() => []),
  toggleSubtaskCompletionOnInstance: vi.fn(),
  toggleChoreDefinitionActiveState: vi.fn(),
  updateChoreInstanceCategory: vi.fn(),
  updateChoreInstanceField: vi.fn(),
  batchToggleCompleteChoreInstances: vi.fn(),
  batchUpdateChoreInstancesCategory: vi.fn(),
  batchAssignChoreDefinitionsToKid: vi.fn(),
};


describe('KanbanView Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
        clear: vi.fn(() => { store = {}; }),
        removeItem: vi.fn((key: string) => { delete store[key]; })
      };
    })();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });
    localStorageMock.getItem.mockReturnValue('default');
  });

  test('allows selecting a kid and loads their Kanban board', async () => {
    const user = userEvent.setup();
    render(
      <UserContext.Provider value={baseUserContextValue}>
        <ChoresContext.Provider value={mockChoresContextValue}>
          <KanbanView />
        </ChoresContext.Provider>
      </UserContext.Provider>
    );

    expect(screen.getByText('Select a kid to view their Kanban board.')).toBeInTheDocument();
    const kidAlphaButton = screen.getByRole('button', { name: 'Kid Alpha' });
    expect(kidAlphaButton).toBeInTheDocument();

    await user.click(kidAlphaButton);

    expect(mockGetKanbanColumnConfigs).toHaveBeenCalledWith('kid1');
    expect(mockGenerateInstancesForPeriod).toHaveBeenCalled(); // Called by KidKanbanBoard's useEffect

    // Check for an element that indicates KidKanbanBoard has rendered for the selected kid
    // e.g., the "Today" button from date navigation, or the mocked DateColumnView
    await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
        expect(screen.queryAllByTestId('mock-date-column-view').length).toBeGreaterThan(0); // Ensure DateColumnViews are rendered
    });
    expect(screen.queryByText('Select a kid to view their Kanban board.')).not.toBeInTheDocument();
  });

  test('shows loading message when UserContext is loading', () => {
     const loadingUserContextValue = { ...baseUserContextValue, loading: true, user: null };
    render(
      <UserContext.Provider value={loadingUserContextValue}>
        <ChoresContext.Provider value={mockChoresContextValue}>
          <KanbanView />
        </ChoresContext.Provider>
      </UserContext.Provider>
    );
    expect(screen.getByText('Loading user data...')).toBeInTheDocument();
  });

  test('shows message if no kids are available', () => {
    const noKidsUser = { ...mockUser, kids: [] };
    const noKidsContextValue = { ...baseUserContextValue, user: noKidsUser };
     render(
      <UserContext.Provider value={noKidsContextValue}>
        <ChoresContext.Provider value={mockChoresContextValue}>
          <KanbanView />
        </ChoresContext.Provider>
      </UserContext.Provider>
    );
    expect(screen.getByText('No kids found. Please add kids in settings.')).toBeInTheDocument();
  });

  test('shows "Select a kid to view their Kanban board." if a user is loaded but no kid is selected yet', () => {
      render(
        <UserContext.Provider value={baseUserContextValue}>
          <ChoresContext.Provider value={mockChoresContextValue}>
            <KanbanView />
          </ChoresContext.Provider>
        </UserContext.Provider>
      );
      expect(screen.getByText('Select a kid to view their Kanban board.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Kid Alpha' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Kid Beta' })).toBeInTheDocument();
  });
});
