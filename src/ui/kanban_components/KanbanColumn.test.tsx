// src/ui/kanban_components/KanbanColumn.test.tsx
// mock declarations at the very top
let mockKanbanCard: any;
let mockSortableContextFn: any;

// mockKanbanCard and mockSortableContextFn must be declared before imports for Vitest hoisting
import { render, screen } from '@testing-library/react';
import KanbanColumn from './KanbanColumn';
import type { KanbanColumn as KanbanColumnType, ChoreInstance, ChoreDefinition } from '../../types';
import { describe, it, test, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { verticalListSortingStrategy } from '@dnd-kit/sortable';

const mockGetDefinitionForInstance = vi.fn((instance: ChoreInstance): ChoreDefinition | undefined => ({
  id: instance.choreDefinitionId,
  title: `Definition for ${instance.id}`,
  assignedKidId: 'kid1',
  rewardAmount: 0,
  tags: [],
  subTasks: [],
  recurrenceType: null,
  isComplete: false,
}));

const getDefMockMissing = vi.fn((instance: ChoreInstance): ChoreDefinition | undefined => {
  if (instance.id === 'chore1') return undefined; // Chore1 will have no definition
  // For chore2, return a minimal valid definition
  return {
    id: instance.choreDefinitionId,
    title: `Definition for ${instance.id}`,
    assignedKidId: 'kid1',
    rewardAmount: 0,
    tags: [],
    subTasks: [],
    recurrenceType: null,
    isComplete: false,
  };
});

// Mock KanbanCard and SortableContext using functions that reference the current mock variable
vi.mock('./KanbanCard', () => ({
  default: (...args: any[]) => mockKanbanCard(...args),
}));
vi.mock('@dnd-kit/sortable', async (importOriginal) => {
  const actualSortable = await importOriginal() as object;
  return {
    ...actualSortable,
    SortableContext: (...args: any[]) => mockSortableContextFn(...args),
  };
});

const mockChores: ChoreInstance[] = [
  { id: 'chore1', choreDefinitionId: 'def1', instanceDate: '2024-07-29', isComplete: false },
  { id: 'chore2', choreDefinitionId: 'def2', instanceDate: '2024-07-29', isComplete: true },
];

const mockColumn: KanbanColumnType = {
  id: 'col1',
  title: 'Test Column Title',
  chores: mockChores,
};

describe('KanbanColumn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(() => {
    mockKanbanCard = vi.fn(({ instance, definition }) => (
      <div data-testid={`mock-kanban-card-${instance.id}`}>
        <p>{definition.title}</p>
      </div>
    ));
    mockSortableContextFn = vi.fn(({ children }) => <>{children}</>);
  });

  test('renders column title and applies ARIA attributes', () => {
    const { container } = render(
      <KanbanColumn
        column={mockColumn}
        getDefinitionForInstance={mockGetDefinitionForInstance}
        theme="default"
      />
    );
    const titleElement = screen.getByText('Test Column Title');
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveAttribute('id', `kanban-column-title-${mockColumn.id}`);

    const columnDiv = container.querySelector('.kanban-column');
    expect(columnDiv).toHaveAttribute('role', 'group');
    expect(columnDiv).toHaveAttribute('aria-labelledby', `kanban-column-title-${mockColumn.id}`);

    const cardsContainer = container.querySelector('.kanban-cards-container');
    expect(cardsContainer).toHaveAttribute('aria-label', `Chores in ${mockColumn.title} column`);
  });

  test('renders KanbanCard for each chore and calls getDefinitionForInstance', () => {
    render(
      <KanbanColumn
        column={mockColumn}
        getDefinitionForInstance={mockGetDefinitionForInstance}
        theme="default"
      />
    );
    // Check if cards are rendered (via their testid and title)
    expect(screen.getByTestId('mock-kanban-card-chore1')).toBeInTheDocument();
    expect(screen.getByText('Definition for chore1')).toBeInTheDocument();
    expect(screen.getByTestId('mock-kanban-card-chore2')).toBeInTheDocument();
    expect(screen.getByText('Definition for chore2')).toBeInTheDocument();

    // Check if getDefinitionForInstance was called for each
    expect(mockGetDefinitionForInstance).toHaveBeenCalledTimes(mockChores.length);
    expect(mockGetDefinitionForInstance).toHaveBeenCalledWith(mockChores[0]);
    expect(mockGetDefinitionForInstance).toHaveBeenCalledWith(mockChores[1]);
  });

  test('renders empty state message when no chores', () => {
    const emptyColumn = { ...mockColumn, chores: [] };
    render(
      <KanbanColumn
        column={emptyColumn}
        getDefinitionForInstance={mockGetDefinitionForInstance}
        theme="default"
      />
    );
    // Verify the new empty state structure and text
    const emptyStateDiv = screen.getByText("No chores here yet!").closest('div');
    expect(emptyStateDiv).toHaveClass('kanban-column-empty-state');
    expect(screen.getByText("No chores here yet!")).toBeInTheDocument();
    expect(screen.queryByTestId(/mock-kanban-card-/)).not.toBeInTheDocument();
  });

  test('uses SortableContext with correct props', () => {
    render(
      <KanbanColumn
        column={mockColumn}
        getDefinitionForInstance={mockGetDefinitionForInstance}
        theme="default"
      />
    );
    expect(mockSortableContextFn).toHaveBeenCalledTimes(1);
    const expectedChoreIds = mockChores.map(c => c.id);

    // Check the props of the SortableContext mock
    // The first argument to the mock function is its props object
    const sortableContextProps = mockSortableContextFn.mock.calls[0][0];
    expect(sortableContextProps.items).toEqual(expectedChoreIds);
    expect(sortableContextProps.strategy).toBe(verticalListSortingStrategy);
  });

  test('applies correct theme class', () => {
    const { container } = render(
      <KanbanColumn
        column={mockColumn}
        getDefinitionForInstance={mockGetDefinitionForInstance}
        theme="pastel"
      />
    );
    // querySelector is fine for checking a class on the root element rendered by the component
    const columnElement = container.querySelector('.kanban-column');
    expect(columnElement).toHaveClass('kanban-column-theme-pastel');
    expect(columnElement).not.toHaveClass('kanban-column-theme-default');
  });

  test('warns if definition is not found for an instance and does not render that card', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); // Suppress console.warn output during test

    render(
      <KanbanColumn
        column={mockColumn} // Contains chore1 and chore2
        getDefinitionForInstance={getDefMockMissing}
        theme="default"
      />
    );

    expect(consoleWarnSpy).toHaveBeenCalledWith('Definition not found for instance chore1');
    expect(screen.queryByTestId('mock-kanban-card-chore1')).not.toBeInTheDocument(); // Card for chore1 should not render
    expect(screen.queryByText('Definition for chore1')).not.toBeInTheDocument();

    expect(screen.getByTestId('mock-kanban-card-chore2')).toBeInTheDocument(); // Card for chore2 should render
    expect(screen.getByText('Definition for chore2')).toBeInTheDocument();

    consoleWarnSpy.mockRestore(); // Clean up spy
  });
});
