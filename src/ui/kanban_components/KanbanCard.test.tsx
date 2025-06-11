// src/ui/kanban_components/KanbanCard.test.tsx
import { render, screen, cleanup } from '@testing-library/react'; // Import cleanup
import userEvent from '@testing-library/user-event';
import KanbanCard from './KanbanCard';
import { ChoresContext, ChoresContextType } from '../../contexts/ChoresContext';
import type { ChoreInstance, ChoreDefinition } from '../../types';
import { vi } from 'vitest';
import { useSortable } from '@dnd-kit/sortable'; // Import the actual hook

// Mock the @dnd-kit/sortable module
vi.mock('@dnd-kit/sortable', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/sortable')>();
  return {
    ...actual, // Spread actual exports to keep other functionalities like SortableContext, etc.
    useSortable: vi.fn().mockReturnValue({ // Default mock for useSortable
      attributes: { 'data-testid': 'sortable-attributes' },
      listeners: { 'data-testid': 'sortable-listeners' },
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: false,
    }),
  };
});

// Now useSortable is a mock function, and vi.mocked(useSortable) can be used.

const mockToggleChoreInstanceComplete = vi.fn();
const mockToggleSubTaskComplete = vi.fn();

// Updated mockContextValue to include all properties from ChoresContextType
const mockContextValue: ChoresContextType = {
  choreDefinitions: [],
  choreInstances: [],
  kanbanChoreOrders: {},
  addChoreDefinition: vi.fn(),
  updateChoreDefinition: vi.fn(),
  deleteChoreDefinition: vi.fn(),
  addChoreInstance: vi.fn(),
  updateChoreInstance: vi.fn(),
  deleteChoreInstance: vi.fn(),
  toggleChoreInstanceComplete: mockToggleChoreInstanceComplete,
  toggleSubTaskComplete: mockToggleSubTaskComplete,
  generateInstancesForPeriod: vi.fn(),
  updateKanbanChoreOrder: vi.fn(),
  updateChoreInstanceColumn: vi.fn(),
  getDefinitionById: vi.fn(defId => mockDefinition.id === defId ? mockDefinition : undefined),
  getInstancesForDefinition: vi.fn(() => []),
  loadingDefinitions: false,
  loadingInstances: false,
  errorDefinitions: null,
  errorInstances: null,
};

const mockInstance: ChoreInstance = {
  id: 'inst1',
  choreDefinitionId: 'def1',
  instanceDate: '2024-07-28',
  isComplete: false,
};

const mockDefinition: ChoreDefinition = {
  id: 'def1',
  title: 'Test Chore Title',
  description: 'Test chore description.',
  assignedKidId: 'kid1',
  rewardAmount: 5,
  tags: ['test', 'chore'],
  subTasks: [
    { id: 'sub1', title: 'Sub-task 1', isComplete: false },
    { id: 'sub2', title: 'Sub-task 2', isComplete: true },
  ],
  recurrenceType: 'daily',
  recurrenceEndDate: '2024-12-31',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  dayOfWeek: null,
  dayOfMonth: null,
  specificDate: null,
  hour: 10,
  minute: 0,
  timeOfDay: 'AM',
  lastCompletedDate: null,
  completionHistory: [],
};

// Helper to render KanbanCard with specific props for isOverlay and isDragging (via useSortable mock)
const renderCardWithSpecificDndState = ({
  instance = mockInstance,
  definition = mockDefinition,
  isOverlay = false,
  isDraggingValue = false, // Renamed to avoid conflict with isDragging from useSortable
} = {}) => {
  // Now useSortable is already a vi.fn() due to the module-level mock
  vi.mocked(useSortable).mockReturnValueOnce({
    attributes: { 'data-testid': 'sortable-attributes' },
    listeners: { 'data-testid': 'sortable-listeners' },
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: isDraggingValue, // Use the passed parameter
  });

  return render(
    <ChoresContext.Provider value={mockContextValue}>
      <KanbanCard instance={instance} definition={definition} isOverlay={isOverlay} />
    </ChoresContext.Provider>
  );
};


describe('KanbanCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset useSortable to its default mock before each test
    // This ensures tests not using renderCardWithSpecificDndState get a consistent default.
    vi.mocked(useSortable).mockReturnValue({
        attributes: { 'data-testid': 'sortable-attributes' },
        listeners: { 'data-testid': 'sortable-listeners' },
        setNodeRef: vi.fn(),
        transform: null,
        transition: null,
        isDragging: false,
      });
  });

  test('renders chore title, description, due date, and reward', () => {
    renderCardWithSpecificDndState(); // Uses defaults: isOverlay=false, isDragging=false
    expect(screen.getByText('Test Chore Title')).toBeInTheDocument();
    expect(screen.getByText('Test chore description.')).toBeInTheDocument();
    expect(screen.getByText('Due: 2024-07-28')).toBeInTheDocument();
    expect(screen.getByText('Reward: $5.00')).toBeInTheDocument();
  });

  test('renders tags', () => {
    renderCardWithSpecificDndState();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('chore')).toBeInTheDocument();
  });

  test('renders recurrence information', () => {
    renderCardWithSpecificDndState();
    expect(screen.getByText(/Repeats daily until 2024-12-31/i)).toBeInTheDocument();
  });

  test('renders sub-tasks and their completion status', () => {
    renderCardWithSpecificDndState();
    const subtask1 = screen.getByLabelText('Sub-task 1');
    const subtask2 = screen.getByLabelText('Sub-task 2');
    expect(subtask1).not.toBeChecked();
    expect(subtask2).toBeChecked();
  });

  test('progress bar reflects sub-task completion (1 of 2 complete = 50%)', () => {
    renderCardWithSpecificDndState();
    const progressBarContainer = screen.getByTitle('Progress: 50% (1/2)');
    const progressBarFill = progressBarContainer.querySelector('.progress-bar-fill');
    expect(progressBarFill).toHaveStyle('width: 50%');
  });


  test('calls toggleChoreInstanceComplete when "Mark Complete" button is clicked', async () => {
    const user = userEvent.setup();
    renderCardWithSpecificDndState();
    const completeButton = screen.getByRole('button', { name: 'Mark Complete' });
    await user.click(completeButton);
    expect(mockToggleChoreInstanceComplete).toHaveBeenCalledWith('inst1');
  });

  test('button text changes to "Mark Incomplete" when chore is complete', () => {
    renderCardWithSpecificDndState({ instance: { ...mockInstance, isComplete: true } });
    expect(screen.getByRole('button', { name: 'Mark Incomplete' })).toBeInTheDocument();
  });

  test('calls toggleSubTaskComplete when a sub-task checkbox is clicked', async () => {
    const user = userEvent.setup();
    renderCardWithSpecificDndState();
    const subtask1Checkbox = screen.getByLabelText('Sub-task 1');
    await user.click(subtask1Checkbox);
    expect(mockToggleSubTaskComplete).toHaveBeenCalledWith('def1', 'sub1');
  });

  // Updated and New Tests for isDragging and isOverlay
  test('applies "dragging" class and reduced opacity when isDragging is true and isOverlay is false', () => {
    renderCardWithSpecificDndState({ isDraggingValue: true, isOverlay: false });

    const cardElement = screen.getByText('Test Chore Title').closest('.kanban-card');
    expect(cardElement).toHaveClass('dragging');
    expect(cardElement).not.toHaveClass('is-overlay');
    expect(cardElement).toHaveStyle('opacity: 0.4');
  });

  test('applies "is-overlay" class and full opacity when isOverlay is true, regardless of isDragging', () => {
    // Scenario 1: isOverlay=true, isDragging=true (typical for drag overlay clone)
    renderCardWithSpecificDndState({ isDraggingValue: true, isOverlay: true });
    let cardElement = screen.getByText('Test Chore Title').closest('.kanban-card');

    expect(cardElement).toHaveClass('is-overlay');
    expect(cardElement).not.toHaveClass('dragging');
    expect(cardElement).toHaveStyle('opacity: 1');

    cleanup(); // Clean up the DOM after the first render

    // Scenario 2: isOverlay=true, isDragging=false (less common, but style should hold)
    renderCardWithSpecificDndState({ isDraggingValue: false, isOverlay: true });
    cardElement = screen.getByText('Test Chore Title').closest('.kanban-card'); // screen.getByText will now find the newly rendered one

    expect(cardElement).toHaveClass('is-overlay');
    expect(cardElement).not.toHaveClass('dragging');
    expect(cardElement).toHaveStyle('opacity: 1');
  });

  test('does not apply "dragging" or "is-overlay" class and has full opacity when not dragging and not overlay', () => {
    renderCardWithSpecificDndState({ isDraggingValue: false, isOverlay: false });
    const cardElement = screen.getByText('Test Chore Title').closest('.kanban-card');

    expect(cardElement).not.toHaveClass('dragging');
    expect(cardElement).not.toHaveClass('is-overlay');
    expect(cardElement).toHaveStyle('opacity: 1');
  });

  test('applies sortable attributes (mocked)', () => {
    renderCardWithSpecificDndState();
    const cardElement = screen.getByText('Test Chore Title').closest('.kanban-card');
    // Because listeners are spread after attributes, and both mocks have data-testid,
    // the one from listeners ('sortable-listeners') will take precedence.
    expect(cardElement).toHaveAttribute('data-testid', 'sortable-listeners');
  });

  test('does not render progress bar if no sub-tasks', () => {
    renderCardWithSpecificDndState({definition: { ...mockDefinition, subTasks: [] }});
    expect(screen.queryByTitle(/Progress:/)).not.toBeInTheDocument();
  });

  test('does not render tags if no tags are provided', () => {
    renderCardWithSpecificDndState({definition: { ...mockDefinition, tags: [] }});
    expect(screen.queryByText('test')).not.toBeInTheDocument();
  });

  test('does not render recurrence info if not recurrent', () => {
    renderCardWithSpecificDndState({definition: { ...mockDefinition, recurrenceType: null, recurrenceEndDate: null }});
    expect(screen.queryByText(/Repeats/i)).not.toBeInTheDocument();
  });
});
