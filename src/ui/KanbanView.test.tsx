import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserContext, UserContextType } from '../../contexts/UserContext';
import KanbanView from './KanbanView';
import type { Kid } from '../../types';

// Mock KidKanbanBoard to avoid complex setup
jest.mock('./kanban_components/KidKanbanBoard', () => () => <div data-testid="kid-kanban-board">KidKanbanBoard Mock</div>);

const mockKids: Kid[] = [
  { id: 'kid1', name: 'Alice', kanbanColumnConfigs: [] },
  { id: 'kid2', name: 'Bob', kanbanColumnConfigs: [] },
];

describe('KanbanView', () => {
  const setup = (kids: Kid[] | null, selectedKidId: string | null = null) => {
    const mockUserContextValue: Partial<UserContextType> = {
      user: kids ? { id: 'user1', username: 'Test User', email: 'test@example.com', kids: kids } : null,
      loading: false,
      // setSelectedKidId: jest.fn(), // This would be part of the component's state, not context directly for selection
    };

    // For KanbanView, selectedKidId is managed by its own state.
    // We can't directly set selectedKidId via context for this component.
    // We will test its state changes via interactions.

    render(
      <UserContext.Provider value={mockUserContextValue as UserContextType}>
        <KanbanView />
      </UserContext.Provider>
    );
  };

  it('renders kid selection buttons when kids are present', () => {
    setup(mockKids);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bob' })).toBeInTheDocument();
  });

  it('renders "No kids found" message when no kids are present', () => {
    setup([]);
    expect(screen.getByText('No kids found. Please add kids in settings.')).toBeInTheDocument();
  });

  it('renders "Loading user data..." when loading', () => {
    const loadingContextValue: Partial<UserContextType> = { user: null, loading: true };
     render(
      <UserContext.Provider value={loadingContextValue as UserContextType}>
        <KanbanView />
      </UserContext.Provider>
    );
    expect(screen.getByText('Loading user data...')).toBeInTheDocument();
  });

  it('renders "Select a kid" message when kids are present but none selected initially', () => {
    setup(mockKids);
    expect(screen.getByText('Select a kid to view their Kanban board.')).toBeInTheDocument();
    expect(screen.queryByTestId('kid-kanban-board')).not.toBeInTheDocument();
  });

  it('updates selected kid and shows Kanban board when a kid button is clicked', () => {
    setup(mockKids);

    // Initially, no board is shown
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
    setup(mockKids);

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
