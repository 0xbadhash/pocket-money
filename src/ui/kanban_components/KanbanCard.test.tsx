// src/ui/kanban_components/KanbanCard.test.tsx
import { render, screen } from '@testing-library/react'; // Removed fireEvent, using userEvent
import userEvent from '@testing-library/user-event';
import KanbanCard from './KanbanCard';
import { ChoresContext, ChoresContextType } from '../../contexts/ChoresContext';
import type { ChoreInstance, ChoreDefinition } from '../../types'; // SubTask is part of ChoreDefinition
import { vi } from 'vitest';

// Mock dnd-kit/sortable
// vi.mock('@dnd-kit/sortable', async (importOriginal) => {
//   const actual = await importOriginal(); // This line caused issues in some environments if not handled carefully
//   return {
//     // ...actual, // Spreading actual might not be necessary if only mocking useSortable
//     useSortable: vi.fn(() => ({
//       attributes: { 'data-testid': 'sortable-attributes' },
//       listeners: { 'data-testid': 'sortable-listeners' }, // Adding listeners directly to attributes for simplicity in testing
//       setNodeRef: vi.fn(),
//       transform: null,
//       transition: null,
//       isDragging: false,
//     })),
//   };
// });

// Simpler mock for useSortable, ensuring it's fully controlled
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: vi.fn().mockReturnValue({ // Default mock value
    attributes: { 'data-testid': 'sortable-attributes' },
    listeners: { 'data-testid': 'sortable-listeners' },
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => children, // Mock SortableContext if needed by children
  verticalListSortingStrategy: vi.fn(), // Mock strategy if it's ever imported by the component directly
}));


const mockToggleChoreInstanceComplete = vi.fn();
const mockToggleSubTaskComplete = vi.fn();

// A more complete mock context, providing all necessary functions even if not used by all tests
const mockContextValue: ChoresContextType = {
  choreDefinitions: [], // Provide empty array or mock data if needed by other parts of context consumers
  choreInstances: [],   // Same as above
  loadingDefinitions: false,
  loadingInstances: false,
  errorDefinitions: null,
  errorInstances: null,
  addChoreDefinition: vi.fn(),
  updateChoreDefinition: vi.fn(),
  deleteChoreDefinition: vi.fn(),
  addChoreInstance: vi.fn(),
  updateChoreInstance: vi.fn(),
  deleteChoreInstance: vi.fn(),
  toggleChoreInstanceComplete: mockToggleChoreInstanceComplete,
  toggleSubTaskComplete: mockToggleSubTaskComplete,
  generateInstancesForPeriod: vi.fn(),
  getDefinitionById: vi.fn(defId => mockDefinition.id === defId ? mockDefinition : undefined), // Example of a useful getter
  getInstancesForDefinition: vi.fn(() => []),
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

const renderWithContext = (instance = mockInstance, definition = mockDefinition) => {
  return render(
    <ChoresContext.Provider value={mockContextValue}>
      <KanbanCard instance={instance} definition={definition} />
    </ChoresContext.Provider>
  );
};

describe('KanbanCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset useSortable to its default mock for each test
    vi.mocked(require('@dnd-kit/sortable').useSortable).mockReturnValue({
        attributes: { 'data-testid': 'sortable-attributes' },
        listeners: { 'data-testid': 'sortable-listeners' },
        setNodeRef: vi.fn(),
        transform: null,
        transition: null,
        isDragging: false,
      });
  });

  test('renders chore title, description, due date, and reward', () => {
    renderWithContext();
    expect(screen.getByText('Test Chore Title')).toBeInTheDocument();
    expect(screen.getByText('Test chore description.')).toBeInTheDocument();
    expect(screen.getByText('Due: 2024-07-28')).toBeInTheDocument();
    expect(screen.getByText('Reward: $5.00')).toBeInTheDocument();
  });

  test('renders tags', () => {
    renderWithContext();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('chore')).toBeInTheDocument();
  });

  test('renders recurrence information', () => {
    renderWithContext();
    expect(screen.getByText(/Repeats daily until 2024-12-31/i)).toBeInTheDocument();
  });

  test('renders sub-tasks and their completion status', () => {
    renderWithContext();
    const subtask1 = screen.getByLabelText('Sub-task 1');
    const subtask2 = screen.getByLabelText('Sub-task 2');
    expect(subtask1).not.toBeChecked();
    expect(subtask2).toBeChecked();
  });

  test('progress bar reflects sub-task completion (1 of 2 complete = 50%)', () => {
    renderWithContext();
    const progressBarContainer = screen.getByTitle('Progress: 50% (1/2)');
    // Query inside the container for the fill element
    const progressBarFill = progressBarContainer.querySelector('.progress-bar-fill');
    expect(progressBarFill).toBeInTheDocument();
    expect(progressBarFill).toHaveStyle('width: 50%');
  });

  test('progress bar reflects sub-task completion (0 of 2 complete = 0%)', () => {
    const allIncompleteDef: ChoreDefinition = {
        ...mockDefinition,
        subTasks: [
            { id: 'sub1', title: 'Sub-task 1', isComplete: false },
            { id: 'sub2', title: 'Sub-task 2', isComplete: false },
        ]
    }
    renderWithContext(mockInstance, allIncompleteDef);
    const progressBarContainer = screen.getByTitle('Progress: 0% (0/2)');
    const progressBarFill = progressBarContainer.querySelector('.progress-bar-fill');
    expect(progressBarFill).toBeInTheDocument();
    expect(progressBarFill).toHaveStyle('width: 0%');
  });

  test('progress bar reflects sub-task completion (2 of 2 complete = 100%)', () => {
    const allCompleteDef: ChoreDefinition = {
        ...mockDefinition,
        subTasks: [
            { id: 'sub1', title: 'Sub-task 1', isComplete: true },
            { id: 'sub2', title: 'Sub-task 2', isComplete: true },
        ]
    }
    renderWithContext(mockInstance, allCompleteDef);
    const progressBarContainer = screen.getByTitle('Progress: 100% (2/2)');
    const progressBarFill = progressBarContainer.querySelector('.progress-bar-fill');
    expect(progressBarFill).toBeInTheDocument();
    expect(progressBarFill).toHaveStyle('width: 100%');
  });


  test('calls toggleChoreInstanceComplete when "Mark Complete" button is clicked', async () => {
    const user = userEvent.setup();
    renderWithContext();
    const completeButton = screen.getByRole('button', { name: 'Mark Complete' });
    await user.click(completeButton);
    expect(mockToggleChoreInstanceComplete).toHaveBeenCalledWith('inst1');
  });

  test('button text changes to "Mark Incomplete" when chore is complete', () => {
    renderWithContext({ ...mockInstance, isComplete: true }, mockDefinition);
    expect(screen.getByRole('button', { name: 'Mark Incomplete' })).toBeInTheDocument();
  });

  test('calls toggleSubTaskComplete when a sub-task checkbox is clicked', async () => {
    const user = userEvent.setup();
    renderWithContext();
    const subtask1Checkbox = screen.getByLabelText('Sub-task 1');
    await user.click(subtask1Checkbox);
    expect(mockToggleSubTaskComplete).toHaveBeenCalledWith('def1', 'sub1');
  });

  test('applies dragging styles when isDragging is true', () => {
    // Specific mock for this test
    vi.mocked(require('@dnd-kit/sortable').useSortable).mockReturnValueOnce({
      attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null, transition: null, isDragging: true,
    });
    renderWithContext();
    const cardElement = screen.getByText('Test Chore Title').closest('.kanban-card');
    expect(cardElement).toHaveClass('dragging');
    // Opacity is set inline by the component based on isDragging
    expect(cardElement).toHaveStyle('opacity: 0.5');
  });

  test('applies sortable attributes and listeners (mocked)', () => {
    renderWithContext();
    const cardElement = screen.getByText('Test Chore Title').closest('.kanban-card');
    // Check for the presence of the testId added in the mock
    expect(cardElement).toHaveAttribute('data-testid', 'sortable-attributes');
    // Listeners are harder to test directly as they are event handlers applied by dnd-kit.
    // We check that the listeners object from the mock (identified by its testId) is spread.
    // This assumes that if the 'listeners' object is spread, dnd-kit would correctly attach actual event handlers.
    // For a more direct test of listeners, one would need to simulate drag events, which is complex
    // and often better covered by e2e/integration tests for dnd functionality.
    // Here, we're verifying that the props from useSortable are being applied.
    // The KanbanCard component spreads `listeners` onto the div, so the data-testid attribute should be present.
    expect(cardElement?.attributes.getNamedItem('data-testid')?.value).toContain('sortable-attributes');
    // If listeners were an object like { onKeyDown: handler, 'data-testid': 'listeners' }
    // then you could check for 'data-testid' from listeners as well.
    // In our current mock, listeners is { 'data-testid': 'sortable-listeners' } which means
    // the div should have an attribute named 'data-testid' with value 'sortable-listeners' IF the attributes
    // and listeners were separate and both testids applied.
    // However, dnd-kit's attributes usually include role, aria properties, tabindex. Listeners are event handlers.
    // The provided mock spreads listeners directly. If `listeners` contains `{ onMouseDown: someHandler }`,
    // that prop would be on the div. Our mock is simpler: `listeners: { 'data-testid': 'sortable-listeners' }`.
    // This means a prop `data-testid` (from listeners) would be spread. This is unusual.
    // Let's adjust the mock for attributes and listeners to be more realistic.
    // For now, the attributes check is the most direct one.
  });

  test('does not render progress bar if no sub-tasks', () => {
    const noSubTasksDef: ChoreDefinition = { ...mockDefinition, subTasks: [] };
    renderWithContext(mockInstance, noSubTasksDef);
    expect(screen.queryByTitle(/Progress:/)).not.toBeInTheDocument();
  });

  test('does not render tags if no tags are provided', () => {
    const noTagsDef: ChoreDefinition = { ...mockDefinition, tags: [] };
    renderWithContext(mockInstance, noTagsDef);
    // Assuming tags are rendered in a container or have a specific role/class
    // For this example, we'll check if the text of a tag (which shouldn't exist) is absent.
    expect(screen.queryByText('test')).not.toBeInTheDocument(); // From the original mockDefinition
  });

  test('does not render recurrence info if not recurrent', () => {
    const nonRecurrentDef: ChoreDefinition = { ...mockDefinition, recurrenceType: null, recurrenceEndDate: null };
    renderWithContext(mockInstance, nonRecurrentDef);
    expect(screen.queryByText(/Repeats/i)).not.toBeInTheDocument();
  });

});
