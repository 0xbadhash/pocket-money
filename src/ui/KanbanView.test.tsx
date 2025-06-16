import React from 'react';
import { render, screen, fireEvent } from '../../src/test-utils'; // Use customRender
import '@testing-library/jest-dom';
// Import hooks to mock their return values
import { useUserContext } from '../contexts/UserContext';
import { useChoresContext } from '../contexts/ChoresContext';
// AppNotificationContext might not be directly used by KanbanView, but by its layout in App.tsx.
// If tests break due to AppNotificationDisplay (from App.tsx's nav) needing it,
// then AppNotificationProvider is correctly in test-utils.
// For now, assuming KanbanView itself doesn't directly call useAppNotification.
import KanbanView from './KanbanView';
import type { Kid } from '../types';
import { vi } from 'vitest';

// Mock KidKanbanBoard to avoid complex setup
vi.mock('./kanban_components/KidKanbanBoard', () => ({
  default: vi.fn(() => <div data-testid="kid-kanban-board">KidKanbanBoard Mock</div>)
}));

const mockKids: Kid[] = [
  { id: 'kid1', name: 'Alice', kanbanColumnConfigs: [] },
  { id: 'kid2', name: 'Bob', kanbanColumnConfigs: [] },
];

// Mock context hooks
vi.mock('../contexts/UserContext', async () => ({
  ...((await vi.importActual('../contexts/UserContext')) as any),
  useUserContext: vi.fn(),
}));

vi.mock('../contexts/ChoresContext', async () => ({
  ...((await vi.importActual('../contexts/ChoresContext')) as any),
  useChoresContext: vi.fn(),
}));


describe('KanbanView', () => {
  const setupTest = (kids: Kid[] | null, loading: boolean = false) => {
    // Setup mock return values for hooks before each relevant test or group
    vi.mocked(useUserContext).mockReturnValue({
      user: kids ? { id: 'user1', username: 'Test User', email: 'test@example.com', kids: kids } : null,
      loading: loading,
      // Add other UserContext values/functions if KanbanView uses them
      updateUser: vi.fn(),
      updateKid: vi.fn(),
      addKid: vi.fn(),
      deleteKid: vi.fn(),
      getKanbanColumnConfigs: vi.fn(() => []),
      updateKanbanColumnConfigs: vi.fn(),
    });

    vi.mocked(useChoresContext).mockReturnValue({
      choreInstances: [], // Provide default empty or mock data
      choreDefinitions: [],
      // Add other ChoresContext values/functions if KanbanView uses them
      // For example, if KanbanFilters eventually uses something from here
      addChoreDefinition: vi.fn(),
      updateChoreDefinition: vi.fn(),
      toggleChoreInstanceComplete: vi.fn(),
      getChoreDefinitionsForKid: vi.fn(() => []),
      generateInstancesForPeriod: vi.fn(),
      toggleSubtaskCompletionOnInstance: vi.fn(),
      toggleChoreDefinitionActiveState: vi.fn(),
      updateChoreInstanceCategory: vi.fn(),
      updateChoreInstanceField: vi.fn(),
      batchToggleCompleteChoreInstances: vi.fn().mockResolvedValue({succeededCount:0, failedCount:0, succeededIds:[], failedIds:[]}),
      batchUpdateChoreInstancesCategory: vi.fn().mockResolvedValue({succeededCount:0, failedCount:0, succeededIds:[], failedIds:[]}),
      batchAssignChoreDefinitionsToKid: vi.fn().mockResolvedValue({succeededCount:0, failedCount:0, succeededIds:[], failedIds:[]}),
      updateChoreSeries: vi.fn(),
    });

    render(<KanbanView />);
  };

  it('renders kid selection buttons when kids are present', () => {
    setupTest(mockKids);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bob' })).toBeInTheDocument();
  });

  it('renders "No kids found" message when no kids are present', () => {
    setupTest(null); // Pass null for kids
    expect(screen.getByText('No kids found. Please add kids in settings.')).toBeInTheDocument();
  });

  it('renders "Loading user data..." when loading', () => {
    setupTest(null, true); // Pass null for kids, true for loading
    expect(screen.getByText('Loading user data...')).toBeInTheDocument();
  });

  it('renders "Select a kid" message when kids are present but none selected initially', () => {
    setupTest(mockKids);
    expect(screen.getByText('Select a kid to view their Kanban board.')).toBeInTheDocument();
    expect(screen.queryByTestId('kid-kanban-board')).not.toBeInTheDocument();
  });

  it('updates selected kid and shows Kanban board when a kid button is clicked', () => {
    setupTest(mockKids);

    expect(screen.queryByTestId('kid-kanban-board')).not.toBeInTheDocument();

    const aliceButton = screen.getByRole('button', { name: 'Alice' });
    fireEvent.click(aliceButton);

    // Check if Alice's button is now visually selected (e.g., bold)
    // This requires checking style, which can be brittle. A className or aria-pressed might be better.
    // For now, let's assume the style change is fontWeight: 'bold'.
    expect(aliceButton).toHaveStyle('font-weight: bold');

    // Check if Bob's button is not bold
    const bobButton = screen.getByRole('button', { name: 'Bob' });
    expect(bobButton).not.toHaveStyle('font-weight: bold');

    // KidKanbanBoard should now be rendered
    expect(screen.getByTestId('kid-kanban-board')).toBeInTheDocument();
    // Message to select a kid should disappear
    expect(screen.queryByText('Select a kid to view their Kanban board.')).not.toBeInTheDocument();
  });

  it('changes selected kid when another kid button is clicked', () => {
    setupTest(mockKids);

    const aliceButton = screen.getByRole('button', { name: 'Alice' });
    fireEvent.click(aliceButton);
    expect(aliceButton).toHaveStyle('font-weight: bold');
    expect(screen.getByTestId('kid-kanban-board')).toBeInTheDocument(); // Board for Alice

    const bobButton = screen.getByRole('button', { name: 'Bob' });
    fireEvent.click(bobButton);
    expect(bobButton).toHaveStyle('font-weight: bold');
    expect(aliceButton).not.toHaveStyle('font-weight: bold');
    expect(screen.getByTestId('kid-kanban-board')).toBeInTheDocument(); // Board should still be there, now for Bob
  });
});
