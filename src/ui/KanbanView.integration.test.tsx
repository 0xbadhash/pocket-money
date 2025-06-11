// src/ui/KanbanView.integration.test.tsx
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KanbanView from './KanbanView'; // The component being tested
import { UserContext, UserContextType } from '../contexts/UserContext';
import { ChoresContext, ChoresContextType } from '../contexts/ChoresContext';
import type { User, Kid, ChoreInstance, ChoreDefinition } from '../types';
import { vi } from 'vitest';

// Mock child components of KidKanbanBoard to simplify this integration test
vi.mock('./kanban_components/KanbanColumn', () => ({
  default: vi.fn(({ column }) => (
    <div data-testid={`mock-kanban-column-${column.id}`} data-column-title={column.title}>
      {/* Minimal representation of a column */}
      <h3>{column.title}</h3>
      {column.chores.map((c: ChoreInstance) => <div key={c.id} data-testid={`chore-${c.id}`}>{c.id}</div>)}
    </div>
  ))
}));

// Mock dnd-kit as KidKanbanBoard uses it.
// These are basic mocks to allow KidKanbanBoard to render without D&D errors.
vi.mock('@dnd-kit/core', async (importOriginal) => {
    const actual = await importOriginal() as object;
    return {
        ...actual,
        DndContext: vi.fn(({ children }) => <>{children}</>),
        useSensor: vi.fn(),
        useSensors: vi.fn(() => []),
        DragOverlay: vi.fn(({ children }) => <>{children}</>) // KidKanbanBoard uses DragOverlay
    };
});
vi.mock('@dnd-kit/sortable', async (importOriginal) => {
    const actual = await importOriginal() as object;
    return {
        ...actual,
        sortableKeyboardCoordinates: vi.fn(),
        arrayMove: vi.fn((arr) => arr) // KidKanbanBoard uses arrayMove
    };
});


const mockUser: User = {
  id: 'user1',
  username: 'testuser',
  email: 'test@example.com',
  kids: [
    { id: 'kid1', name: 'Kid Alpha', totalFunds: 10, avatarFilename: 'avatar1.png' },
    { id: 'kid2', name: 'Kid Beta', totalFunds: 20, avatarFilename: 'avatar2.png' },
  ],
  settings: { defaultView: 'dashboard', theme: 'light' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockGenerateInstancesForPeriod = vi.fn();
const mockChoresContextValue: ChoresContextType = {
  choreDefinitions: [],
  choreInstances: [],
  generateInstancesForPeriod: mockGenerateInstancesForPeriod,
  toggleChoreInstanceComplete: vi.fn(),
  getDefinitionById: vi.fn(),
  getInstancesForDefinition: vi.fn(),
  addChoreDefinition: vi.fn(),
  updateChoreDefinition: vi.fn(),
  deleteChoreDefinition: vi.fn(),
  addChoreInstance: vi.fn(),
  updateChoreInstance: vi.fn(),
  deleteChoreInstance: vi.fn(),
  toggleSubTaskComplete: vi.fn(),
  loadingDefinitions: false,
  loadingInstances: false,
  errorDefinitions: null,
  errorInstances: null,
};


describe('KanbanView Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock for KidKanbanBoard theme preference
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
    localStorageMock.getItem.mockReturnValue('default'); // Default theme
  });

  test('allows selecting a kid and loads their Kanban board', async () => {
    const user = userEvent.setup();
    const userContextValue: UserContextType = {
      user: mockUser,
      loading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
      updateUserSettings: vi.fn(),
      addKid: vi.fn(),
      updateKid: vi.fn(),
      deleteKid: vi.fn(),
      uploadKidAvatar: vi.fn(),
      fetchUser: vi.fn(),
    };

    render(
      <UserContext.Provider value={userContextValue}>
        <ChoresContext.Provider value={mockChoresContextValue}>
          <KanbanView />
        </ChoresContext.Provider>
      </UserContext.Provider>
    );

    const kidSelect = screen.getByRole('combobox', { name: /select a kid/i });
    expect(kidSelect).toBeInTheDocument();
    // Check for the placeholder option text if your select has one
    expect(screen.getByRole('option', { name: 'Select a kid' })).toBeInTheDocument();


    // Select "Kid Alpha"
    await user.selectOptions(kidSelect, 'kid1');

    expect(mockGenerateInstancesForPeriod).toHaveBeenCalled();

    // Check for KidKanbanBoard's controls
    // Use waitFor to handle potential async updates from useEffect in KidKanbanBoard
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Daily' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Weekly' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monthly' })).toBeInTheDocument();

    // Check for mocked columns (their titles should reflect the default "Daily" period)
    // The mock for KanbanColumn renders the title it receives in an h3.
    await screen.findByRole('heading', { name: 'Today - Active' });
    await screen.findByRole('heading', { name: 'Today - Completed' });

    expect(screen.getByTestId('mock-kanban-column-daily_active')).toBeInTheDocument();
    expect(screen.getByTestId('mock-kanban-column-daily_completed')).toBeInTheDocument();
  });

  test('shows loading message when UserContext is loading', () => {
     const loadingUserContextValue: UserContextType = {
      user: null,
      loading: true,
      error: null,
      login: vi.fn(), logout: vi.fn(), signup: vi.fn(), updateUserSettings: vi.fn(),
      addKid: vi.fn(), updateKid: vi.fn(), deleteKid: vi.fn(), uploadKidAvatar: vi.fn(), fetchUser: vi.fn(),
    };
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
    const noKidsUser: User = { ...mockUser, kids: [] };
    const noKidsContextValue: UserContextType = {
      user: noKidsUser, loading: false, error: null,
      login: vi.fn(), logout: vi.fn(), signup: vi.fn(), updateUserSettings: vi.fn(),
      addKid: vi.fn(), updateKid: vi.fn(), deleteKid: vi.fn(), uploadKidAvatar: vi.fn(), fetchUser: vi.fn(),
    };
     render(
      <UserContext.Provider value={noKidsContextValue}>
        <ChoresContext.Provider value={mockChoresContextValue}>
          <KanbanView />
        </ChoresContext.Provider>
      </UserContext.Provider>
    );
    expect(screen.getByText('No kids found. Please add a child in the settings page to use the Kanban board.')).toBeInTheDocument();
  });

  test('shows "Select a kid to view their Kanban board." if a user is loaded but no kid is selected yet', () => {
    const userContextValue: UserContextType = {
        user: mockUser, // User with kids
        loading: false, error: null,
        login: vi.fn(), logout: vi.fn(), signup: vi.fn(), updateUserSettings: vi.fn(),
        addKid: vi.fn(), updateKid: vi.fn(), deleteKid: vi.fn(), uploadKidAvatar: vi.fn(), fetchUser: vi.fn(),
      };
      render(
        <UserContext.Provider value={userContextValue}>
          <ChoresContext.Provider value={mockChoresContextValue}>
            <KanbanView />
          </ChoresContext.Provider>
        </UserContext.Provider>
      );
      expect(screen.getByText('Select a kid to view their Kanban board.')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /select a kid/i})).toBeInTheDocument();
  });

});
