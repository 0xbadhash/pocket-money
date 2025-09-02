import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DateColumnView from './DateColumnView';
import { useChoresContext } from '../../contexts/ChoresContext';
import type { ChoreInstance, ChoreDefinition, MatrixKanbanCategory } from '../../types';
import { useDroppable } from '@dnd-kit/core';
import { customRender } from '../../test-utils';

// Mock KanbanCard
vi.mock('./KanbanCard', () => ({
  default: vi.fn(({ instance }) => <div data-testid={`mock-kanban-card-${instance.id}`}>{instance.id}</div>)
}));

// Mock useChoresContext
vi.mock('../../contexts/ChoresContext');

// Mock useDroppable from @dnd-kit/core
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    useDroppable: vi.fn(),
  };
});

// Fix ChoreDefinition and ChoreInstance test data
const mockChoreDefinitions: ChoreDefinition[] = [
  { id: 'def1', title: 'Chore 1', description: '', assignedKidId: 'kid1', recurrenceType: 'daily', rewardAmount: 10, isComplete: false, enableSubtasks: false, subtasks: [], createdAt: '', updatedAt: '' },
  { id: 'def2', title: 'Chore 2', description: '', assignedKidId: 'kid1', recurrenceType: 'daily', rewardAmount: 20, isComplete: false, enableSubtasks: false, subtasks: [], createdAt: '', updatedAt: '' },
  { id: 'def3', title: 'Chore 3', description: '', assignedKidId: 'kid2', recurrenceType: 'daily', rewardAmount: 10, isComplete: false, enableSubtasks: false, subtasks: [], createdAt: '', updatedAt: '' },
];

const mockChoreInstances: ChoreInstance[] = [
  { id: 'inst1', choreDefinitionId: 'def1', instanceDate: '2023-10-26', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {} },
  { id: 'inst2', choreDefinitionId: 'def2', instanceDate: '2023-10-26', categoryStatus: 'IN_PROGRESS', isComplete: false, subtaskCompletions: {} },
  { id: 'inst3', choreDefinitionId: 'def1', instanceDate: '2023-10-27', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {} }, // Different date
  { id: 'inst4', choreDefinitionId: 'def3', instanceDate: '2023-10-26', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {} }, // Different kid
  { id: 'inst5', choreDefinitionId: 'def2', instanceDate: '2023-10-26', categoryStatus: 'TO_DO', isComplete: false, subtaskCompletions: {} }, // Same kid, date, category as inst1 (but def2)
];

const mockUseChoresContext = useChoresContext as vi.Mock;
const mockUseDroppable = useDroppable as vi.Mock;

describe('DateColumnView', () => {
  const defaultProps = {
    date: new Date('2023-10-26T00:00:00.000Z'), // Use a fixed date for consistency
    kidId: 'kid1',
    selectedInstanceIds: [],
    onToggleSelection: vi.fn(),
    onEditChore: vi.fn(),
  };

  const mockSetNodeRef = vi.fn();
  const mockIsOver = false;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChoresContext.mockReturnValue({
      choreInstances: mockChoreInstances,
      choreDefinitions: mockChoreDefinitions,
    });
    mockUseDroppable.mockReturnValue({
      setNodeRef: mockSetNodeRef,
      isOver: mockIsOver,
    });
  });

  afterEach(cleanup);

  it('renders the correct title based on category', () => {
    render(<DateColumnView {...defaultProps} category="TO_DO" />);
    expect(screen.getByText('To Do')).toBeInTheDocument();

    render(<DateColumnView {...defaultProps} category="IN_PROGRESS" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();

    render(<DateColumnView {...defaultProps} category="COMPLETED" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('applies correct styling based on category', () => {
    const { container: toDoContainer } = render(<DateColumnView {...defaultProps} category="TO_DO" />);
    const toDoDiv = toDoContainer.firstChild as HTMLElement;
    expect(toDoDiv).toHaveStyle('background-color: #FFEBEB'); // Light Red
    expect(toDoDiv).toHaveStyle('color: #A31A1A');
    expect(toDoDiv).toHaveStyle('border-left: 4px solid #FFC5C5');

    const { container: inProgressContainer } = render(<DateColumnView {...defaultProps} category="IN_PROGRESS" />);
    const inProgressDiv = inProgressContainer.firstChild as HTMLElement;
    expect(inProgressDiv).toHaveStyle('background-color: #EBF5FF'); // Light Blue
    expect(inProgressDiv).toHaveStyle('color: #1A57A3');
    expect(inProgressDiv).toHaveStyle('border-left: 4px solid #C5E0FF');

    const { container: completedContainer } = render(<DateColumnView {...defaultProps} category="COMPLETED" />);
    const completedDiv = completedContainer.firstChild as HTMLElement;
    expect(completedDiv).toHaveStyle('background-color: #EBFFF0'); // Light Green
    expect(completedDiv).toHaveStyle('color: #1A7A2E');
    expect(completedDiv).toHaveStyle('border-left: 4px solid #C5FFD6');
  });

  it('filters and renders chores for the given date, category, and kidId', () => {
    render(<DateColumnView {...defaultProps} category="TO_DO" />);
    // inst1 (kid1, 2023-10-26, TO_DO, def1)
    // inst5 (kid1, 2023-10-26, TO_DO, def2)
    expect(screen.getByTestId('mock-kanban-card-inst1')).toBeInTheDocument();
    expect(screen.getByTestId('mock-kanban-card-inst5')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-kanban-card-inst2')).not.toBeInTheDocument(); // IN_PROGRESS
    expect(screen.queryByTestId('mock-kanban-card-inst3')).not.toBeInTheDocument(); // Different date
    expect(screen.queryByTestId('mock-kanban-card-inst4')).not.toBeInTheDocument(); // Different kid
  });

  it('renders correct number of KanbanCards', () => {
    render(<DateColumnView {...defaultProps} category="TO_DO" />);
    const cards = screen.getAllByText(/inst\d/); // Mocked card content is the instance ID
    expect(cards.length).toBe(2);

    render(<DateColumnView {...defaultProps} category="IN_PROGRESS" />);
    const cardsInProgress = screen.getAllByText(/inst\d/);
    expect(cardsInProgress.length).toBe(1);
    expect(screen.getByTestId('mock-kanban-card-inst2')).toBeInTheDocument();
  });

  it('displays "No chores here..." message when no chores match', () => {
    render(<DateColumnView {...defaultProps} category="COMPLETED" />); // No completed chores for kid1 on this date
    expect(screen.getByText('No chores here for this date.')).toBeInTheDocument();
    expect(screen.queryByTestId(/mock-kanban-card-/)).not.toBeInTheDocument();
  });

  it('displays "No chores here..." when chore definition is missing', () => {
    mockUseChoresContext.mockReturnValue({
      choreInstances: [{ id: 'inst-no-def', choreDefinitionId: 'def-missing', instanceDate: '2023-10-26', categoryStatus: 'TO_DO', isCompleted: false }],
      choreDefinitions: mockChoreDefinitions, // def-missing is not in here
    });
    render(<DateColumnView {...defaultProps} category="TO_DO" />);
    expect(screen.getByText('No chores here for this date.')).toBeInTheDocument();
  });

  it('displays "No chores here..." when chore definition is marked as complete (archived)', () => {
     mockUseChoresContext.mockReturnValue({
      choreInstances: [
        { id: 'inst-archived-def', choreDefinitionId: 'def-archived', instanceDate: '2023-10-26', categoryStatus: 'TO_DO', isCompleted: false }
      ],
      choreDefinitions: [
        { id: 'def-archived', title: 'Archived Chore', assignedKidId: 'kid1', recurrenceType: 'daily', rewardAmount: 0, isComplete: true, enableSubtasks: false, subtasks: [] }
      ],
    });
    render(<DateColumnView {...defaultProps} category="TO_DO" />);
    expect(screen.getByText('No chores here for this date.')).toBeInTheDocument();
  });


  it('sets up as a droppable area with correct ID', () => {
    render(<DateColumnView {...defaultProps} category="IN_PROGRESS" />);
    expect(useDroppable).toHaveBeenCalledTimes(1);
    expect(useDroppable).toHaveBeenCalledWith({ id: '2023-10-26|IN_PROGRESS' });
  });

  it('applies hover style when isOver is true', () => {
    mockUseDroppable.mockReturnValue({
      setNodeRef: mockSetNodeRef,
      isOver: true, // Simulate drag over
    });
    const { container } = render(<DateColumnView {...defaultProps} category="TO_DO" />);
    const divElement = container.firstChild as HTMLElement;
    expect(divElement).toHaveStyle('background-color: #D3D3D3'); // Hover color
  });

});
