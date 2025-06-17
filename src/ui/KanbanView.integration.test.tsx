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
    // This mock is no longer central to KidKanbanBoard's matrix layout,
    // but UserContext still provides it. KidKanbanBoard itself doesn't use its output for rows/columns.
    // We'll keep it for UserContext completeness but won't rely on its output for matrix assertions.
    { id: 'col-config-1', kidId: 'kid1', title: 'Old Config To Do', order: 0, color: '#ABCDEF' }
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

    // Initial state: Kid Alpha should be auto-selected due to useEffect in KanbanView
    expect(screen.queryByText('Select a kid to view their Kanban board.')).not.toBeInTheDocument();

    const kidAlphaButton = screen.getByRole('button', { name: 'Kid Alpha' });
    expect(kidAlphaButton).toBeInTheDocument();
    expect(kidAlphaButton).toHaveStyle('font-weight: bold'); // Check if styled as selected

    // KidKanbanBoard for Kid Alpha should be rendered
    // expect(mockGetKanbanColumnConfigs).toHaveBeenCalledWith('kid1'); // Not relevant for matrix layout
    expect(mockGenerateInstancesForPeriod).toHaveBeenCalled();

    await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument(); // Part of KidKanbanBoard
        expect(screen.queryAllByTestId('mock-date-column-view').length).toBe(21); // 7 days * 3 categories
    });

    // Now click Kid Beta
    const kidBetaButton = screen.getByRole('button', { name: 'Kid Beta' });
    await user.click(kidBetaButton);

    // expect(mockGetKanbanColumnConfigs).toHaveBeenCalledWith('kid2'); // Not relevant for matrix layout
    // generateInstancesForPeriod should be called again for Kid Beta
    expect(mockGenerateInstancesForPeriod).toHaveBeenCalledTimes(2); // Initial + after click

    await waitFor(() => {
        // Ensure UI updates for Kid Beta
        expect(screen.getByRole('button', { name: 'Kid Beta' })).toHaveStyle('font-weight: bold');
        expect(screen.getByRole('button', { name: 'Kid Alpha' })).not.toHaveStyle('font-weight: bold');
        // DateColumnViews should still be 21, KidKanbanBoard re-renders for new kidId
        expect(screen.queryAllByTestId('mock-date-column-view').length).toBe(21);
    });
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

  test('verifies initial auto-selection of the first kid', async () => {
    render(
      <UserContext.Provider value={baseUserContextValue}>
        <ChoresContext.Provider value={mockChoresContextValue}>
          <KanbanView />
        </ChoresContext.Provider>
      </UserContext.Provider>
    );

    // Kid Alpha (first kid) should be auto-selected
    const kidAlphaButton = screen.getByRole('button', { name: 'Kid Alpha' });
    expect(kidAlphaButton).toHaveStyle('font-weight: bold');

    // KidKanbanBoard should be rendered for Kid Alpha
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument(); // Element from KidKanbanBoard
      expect(screen.queryAllByTestId('mock-date-column-view').length).toBe(21);
    });
    expect(mockGenerateInstancesForPeriod).toHaveBeenCalledTimes(1);
  });
});
