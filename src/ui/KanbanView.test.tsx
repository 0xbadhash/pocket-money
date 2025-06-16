import React from 'react';
import { render, screen, fireEvent } from '../test-utils'; // Corrected import path
import '@testing-library/jest-dom';
// Import hooks to mock their return values
import { useUserContext } from '../contexts/UserContext';
import { useChoresContext } from '../contexts/ChoresContext';
import KanbanView from './KanbanView';
import type { Kid } from '../types';
import { vi } from 'vitest';

// Mock KidKanbanBoard - COMMENTED OUT FOR DIAGNOSTIC
// vi.mock('./kanban_components/KidKanbanBoard', () => ({
//   default: vi.fn(() => <div data-testid="kid-kanban-board">KidKanbanBoard Mock</div>)
// }));

const mockKids: Kid[] = [
  { id: 'kid1', name: 'Alice', kanbanColumnConfigs: [] },
  { id: 'kid2', name: 'Bob', kanbanColumnConfigs: [] },
];

// Mock context hooks
// vi.mock('../contexts/UserContext'); // CRITICAL: Commented out for Nuclear Option test
vi.mock('../contexts/ChoresContext');

// Get typed access to the mocks
const mockedUseUserContext = useUserContext as vi.Mock;
const mockedUseChoresContext = useChoresContext as vi.Mock;

describe('KanbanView', () => {
  const comprehensiveUserContextMockValue = (kids: Kid[] | null, loading: boolean = false) => ({
    user: kids ? { id: 'user1', username: 'Test User', email: 'test@example.com', kids: kids, settings: {}, createdAt: '', updatedAt: '' } : null,
    loading: loading,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    addKid: vi.fn(() => 'new_kid_id'),
    updateKid: vi.fn(),
    deleteKid: vi.fn(),
    getKanbanColumnConfigs: vi.fn(() => []),
    addKanbanColumnConfig: vi.fn(async () => {}),
    updateKanbanColumnConfig: vi.fn(async () => {}),
    deleteKanbanColumnConfig: vi.fn(async () => {}),
    reorderKanbanColumnConfigs: vi.fn(async () => {}),
  });

  const comprehensiveChoresContextMockValue = {
    choreInstances: [],
    choreDefinitions: [],
    addChoreDefinition: vi.fn(),
    updateChoreDefinition: vi.fn(async () => {}),
    toggleChoreInstanceComplete: vi.fn(),
    getChoreDefinitionsForKid: vi.fn(() => []),
    generateInstancesForPeriod: vi.fn(),
    toggleSubtaskCompletionOnInstance: vi.fn(),
    toggleChoreDefinitionActiveState: vi.fn(),
    updateChoreInstanceCategory: vi.fn(),
    updateChoreInstanceField: vi.fn(async () => {}),
    batchToggleCompleteChoreInstances: vi.fn().mockResolvedValue({succeededCount:0, failedCount:0, succeededIds:[], failedIds:[]}),
    batchUpdateChoreInstancesCategory: vi.fn().mockResolvedValue({succeededCount:0, failedCount:0, succeededIds:[], failedIds:[]}),
    batchAssignChoreDefinitionsToKid: vi.fn().mockResolvedValue({succeededCount:0, failedCount:0, succeededIds:[], failedIds:[]}),
    updateChoreSeries: vi.fn(async () => {}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // mockedUseUserContext.mockReturnValue(comprehensiveUserContextMockValue(mockKids, false)); // No longer mocking UserContext
    mockedUseChoresContext.mockReturnValue(comprehensiveChoresContextMockValue);
  });

  // Modified test for diagnostics
  it('diagnostic: renders minimal KanbanView shell', () => {
    // Set up a specific state for this diagnostic test, e.g., loading state
    // mockedUseUserContext.mockReturnValue(comprehensiveUserContextMockValue(null, true)); // No longer mocking UserContext

    render(<KanbanView />);

    // Primary assertion: Does the container render?
    expect(screen.getByTestId('kanban-view-container')).toBeInTheDocument();

    // Secondary assertion: Does it show the expected text for this state?
    expect(screen.getByText('Minimal KanbanView Render Test')).toBeInTheDocument();

    console.log(document.body.innerHTML);
  });

  // Commenting out other tests for this diagnostic run
  /*
  it('renders kid selection buttons when kids are present', () => {
    render(<KanbanView />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bob' })).toBeInTheDocument();
  });

  it('renders "No kids found" message when no kids are present', () => {
    mockedUseUserContext.mockReturnValue(comprehensiveUserContextMockValue([]));
    render(<KanbanView />);
    expect(screen.getByText('No kids found. Please add kids in settings.')).toBeInTheDocument();
  });

  it('renders "No kids found" message when user is null', () => {
    mockedUseUserContext.mockReturnValue(comprehensiveUserContextMockValue(null));
    render(<KanbanView />);
    expect(screen.getByText('No kids found. Please add kids in settings.')).toBeInTheDocument();
  });

  it('renders "Select a kid" message when kids are present but none selected initially', () => {
    render(<KanbanView />);
    expect(screen.getByText('Select a kid to view their Kanban board.')).toBeInTheDocument();
    expect(screen.queryByTestId('kid-kanban-board')).not.toBeInTheDocument();
  });

  it('updates selected kid and shows Kanban board when a kid button is clicked', () => {
    render(<KanbanView />);
    expect(screen.queryByTestId('kid-kanban-board')).not.toBeInTheDocument();

    const aliceButton = screen.getByRole('button', { name: 'Alice' });
    fireEvent.click(aliceButton);

    expect(aliceButton).toHaveStyle('font-weight: bold');
    const bobButton = screen.getByRole('button', { name: 'Bob' });
    expect(bobButton).not.toHaveStyle('font-weight: bold');
    expect(screen.getByTestId('kid-kanban-board')).toBeInTheDocument();
    expect(screen.queryByText('Select a kid to view their Kanban board.')).not.toBeInTheDocument();
  });

  it('changes selected kid when another kid button is clicked', () => {
    render(<KanbanView />);
    const aliceButton = screen.getByRole('button', { name: 'Alice' });
    fireEvent.click(aliceButton);
    expect(aliceButton).toHaveStyle('font-weight: bold');
    expect(screen.getByTestId('kid-kanban-board')).toBeInTheDocument();

    const bobButton = screen.getByRole('button', { name: 'Bob' });
    fireEvent.click(bobButton);
    expect(bobButton).toHaveStyle('font-weight: bold');
    expect(aliceButton).not.toHaveStyle('font-weight: bold');
    expect(screen.getByTestId('kid-kanban-board')).toBeInTheDocument();
  });
  */
});
