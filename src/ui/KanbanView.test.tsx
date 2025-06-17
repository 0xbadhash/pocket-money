import React from 'react';
import { render, screen, fireEvent } from '../test-utils'; // Corrected import path
// Import hooks to mock their return values
import { useUserContext } from '../contexts/UserContext';
import { useChoresContext } from '../contexts/ChoresContext';
import KanbanView from './KanbanView';
import type { Kid, User } from '../types'; // Added User type
import { describe, it, expect, vi, beforeEach } from 'vitest'; // Removed unused imports

// Mock KidKanbanBoard
vi.mock('./kanban_components/KidKanbanBoard', () => ({
  default: vi.fn((props) => <div data-testid="mock-kid-kanban-board">{props.kidId}</div>)
}));

const mockKids: Kid[] = [
  { id: 'kid1', name: 'Alice', totalFunds: 0, kanbanColumnConfigs: [] }, // Added totalFunds
  { id: 'kid2', name: 'Bob', totalFunds: 0, kanbanColumnConfigs: [] }, // Added totalFunds
];

// Mock context hooks
vi.mock('../contexts/UserContext');
vi.mock('../contexts/ChoresContext');

// Get typed access to the mocks
const mockedUseUserContext = useUserContext as vi.Mock;
const mockedUseChoresContext = useChoresContext as vi.Mock;
const MockedKidKanbanBoard = (await import('./kanban_components/KidKanbanBoard')).default as vi.Mock;


describe('KanbanView', () => {
  // Helper to create a User object for mocking
  const createMockUser = (kidsList: Kid[] | null): User | null => {
    if (!kidsList) return null;
    return {
      id: 'user1',
      username: 'Test User',
      email: 'test@example.com',
      kids: kidsList,
      settings: { theme: 'light' }, // Added theme setting
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const mockUserContextValue = (kids: Kid[] | null, loading: boolean = false, error: string | null = null) => ({
    user: createMockUser(kids),
    loading: loading,
    error: error,
    // Add other functions if needed by KanbanView directly, though most are for children
    login: vi.fn(),
    logout: vi.fn(),
    // ... other mock functions from UserContext if directly used by KanbanView
  });

  const mockChoresContextValue = {
    // KanbanView itself might not use ChoresContext directly,
    // but KidKanbanBoard (even mocked) might expect its provider.
    // So, a minimal mock is good.
    generateInstancesForPeriod: vi.fn(),
    // ... other necessary chore functions if KidKanbanBoard mock needs them
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for ChoresContext, KanbanView might not use it directly
    mockedUseChoresContext.mockReturnValue(mockChoresContextValue);
  });

  it('displays loading message when user data is loading', () => {
    mockedUseUserContext.mockReturnValue(mockUserContextValue(null, true));
    render(<KanbanView />);
    expect(screen.getByText('Loading user data...')).toBeInTheDocument();
  });

  it('displays "No kids found" message if user has no kids', () => {
    mockedUseUserContext.mockReturnValue(mockUserContextValue([])); // User with empty kids array
    render(<KanbanView />);
    expect(screen.getByText('No kids found. Please add kids in settings.')).toBeInTheDocument();
  });

  it('displays "No kids found" message if there is no user', () => {
    mockedUseUserContext.mockReturnValue(mockUserContextValue(null)); // No user
    render(<KanbanView />);
    expect(screen.getByText('No kids found. Please add kids in settings.')).toBeInTheDocument();
  });

  it('renders kid selection buttons when kids are present', () => {
    mockedUseUserContext.mockReturnValue(mockUserContextValue(mockKids));
    render(<KanbanView />);
    expect(screen.getByRole('button', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bob' })).toBeInTheDocument();
  });

  it('auto-selects the first kid and renders KidKanbanBoard if kids are present', () => {
    mockedUseUserContext.mockReturnValue(mockUserContextValue(mockKids));
    render(<KanbanView />);

    // KidKanbanBoard should be rendered with kid1's ID
    expect(MockedKidKanbanBoard).toHaveBeenCalledWith(expect.objectContaining({ kidId: 'kid1' }), expect.anything());
    const board = screen.getByTestId('mock-kid-kanban-board');
    expect(board).toBeInTheDocument();
    expect(board).toHaveTextContent('kid1'); // Mocked board displays kidId

    // Alice's button should be styled as selected
    const aliceButton = screen.getByRole('button', { name: 'Alice' });
    expect(aliceButton).toHaveStyle('font-weight: bold');
    expect(aliceButton).toHaveStyle('background-color: #007bff'); // Based on KanbanView's style
  });

  it('highlights selected kid and renders KidKanbanBoard with correct kidId', () => {
    mockedUseUserContext.mockReturnValue(mockUserContextValue(mockKids));
    render(<KanbanView />);

    const bobButton = screen.getByRole('button', { name: 'Bob' });
    fireEvent.click(bobButton);

    expect(bobButton).toHaveStyle('font-weight: bold');
    expect(bobButton).toHaveStyle('background-color: #007bff');
    const aliceButton = screen.getByRole('button', { name: 'Alice' });
    expect(aliceButton).not.toHaveStyle('font-weight: bold');
    expect(aliceButton).toHaveStyle('background-color: #f8f9fa');


    expect(MockedKidKanbanBoard).toHaveBeenCalledWith(expect.objectContaining({ kidId: 'kid2' }), expect.anything());
    const board = screen.getByTestId('mock-kid-kanban-board');
    expect(board).toBeInTheDocument();
    expect(board).toHaveTextContent('kid2');
  });

  it('does not render KidKanbanBoard if no kid is selected (e.g., if auto-selection failed or was prevented)', () => {
    // Simulate a scenario where kids are present but useEffect for auto-selection might not run or complete
    // This is a bit hard to force perfectly without complex useEffect mocking,
    // but we can test the state where selectedKidId remains null despite kids.
    // For this, we'll temporarily modify the mock to not auto-select.
    const originalUseEffect = React.useEffect;
    vi.spyOn(React, 'useEffect').mockImplementation((effect, deps) => {
      if (deps && deps.length === 2 && deps[0] === mockKids && deps[1] === null) {
        // This is likely the auto-selection effect, skip its execution for this test
        return;
      }
      originalUseEffect(effect, deps);
    });

    mockedUseUserContext.mockReturnValue(mockUserContextValue(mockKids));
    render(<KanbanView />);

    expect(screen.getByText('Select a kid to view their Kanban board.')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-kid-kanban-board')).not.toBeInTheDocument();

    vi.restoreAllMocks(); // Restore React.useEffect for other tests
  });
});
