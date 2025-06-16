// src/ui/kanban_components/KanbanCard.test.tsx
import { render, screen, cleanup, fireEvent } from '../../../src/test-utils'; // Use customRender
import userEvent from '@testing-library/user-event';
import KanbanCard from './KanbanCard';
// ChoresContext will be provided by AllTheProviders. We'll mock its hook.
import { useChoresContext } from '../../contexts/ChoresContext';
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
const mockToggleSubtaskCompletionOnInstance = vi.fn();
const mockUpdateChoreDefinition = vi.fn();
const mockUpdateChoreInstanceField = vi.fn();
const mockUpdateChoreSeries = vi.fn();

// Mock the useChoresContext hook
vi.mock('../../contexts/ChoresContext', async () => ({
  ...((await vi.importActual('../../contexts/ChoresContext')) as any),
  useChoresContext: () => ({
    choreDefinitions: [], // Provide default empty arrays or mock data as needed
    choreInstances: [],
    addChoreDefinition: vi.fn(),
    updateChoreDefinition: mockUpdateChoreDefinition,
    toggleChoreInstanceComplete: mockToggleChoreInstanceComplete,
    getChoreDefinitionsForKid: vi.fn(() => []),
    generateInstancesForPeriod: vi.fn(),
    toggleSubtaskCompletionOnInstance: mockToggleSubtaskCompletionOnInstance,
    toggleChoreDefinitionActiveState: vi.fn(),
    updateChoreInstanceCategory: vi.fn(),
    updateChoreInstanceField: mockUpdateChoreInstanceField,
    updateChoreSeries: mockUpdateChoreSeries,
    batchToggleCompleteChoreInstances: vi.fn().mockResolvedValue({succeededCount: 0, failedCount: 0, succeededIds: [], failedIds: []}),
    batchUpdateChoreInstancesCategory: vi.fn().mockResolvedValue({succeededCount: 0, failedCount: 0, succeededIds: [], failedIds: []}),
    batchAssignChoreDefinitionsToKid: vi.fn().mockResolvedValue({succeededCount: 0, failedCount: 0, succeededIds: [], failedIds: []}),
  }),
}));

// Initial subtask completions based on mockDefinition
const initialSubtaskCompletions = {
  'sub1': false,
  'sub2': true, // This subtask is complete by default in mockDefinition
};

const mockInstance: ChoreInstance = {
  id: 'inst1',
  choreDefinitionId: 'def1',
  instanceDate: '2024-07-28',
  isComplete: false,
  categoryStatus: 'TO_DO',
  subtaskCompletions: initialSubtaskCompletions, // Initialize based on definition
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
  // instance = mockInstance,
  // definition = mockDefinition,
  isOverlay = false,
  isDraggingValue = false,
  isSelected = false,
  onToggleSelection = vi.fn(), // Provide a default mock if not passed
} = {}) => {
  vi.mocked(useSortable).mockReturnValueOnce({
    attributes: { 'data-testid': 'sortable-attributes' },
    listeners: { 'data-testid': 'sortable-listeners' },
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: isDraggingValue,
  });

  // Use the customRender from test-utils which includes AllTheProviders
  return render(
    <KanbanCard
      instance={instance}
      definition={definition}
      isOverlay={isOverlay}
      isSelected={isSelected}
      onToggleSelection={onToggleSelection}
    />
  );
};


describe('KanbanCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateChoreDefinition.mockClear();
    mockUpdateChoreInstanceField.mockClear();
    mockUpdateChoreSeries.mockClear(); // Clear the new mock
    mockToggleSubtaskCompletionOnInstance.mockClear(); // Clear this new mock too
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
    renderCardWithSpecificDndState();
    expect(screen.getByText('Test Chore Title')).toBeInTheDocument();
    expect(screen.getByText('Test chore description.')).toBeInTheDocument();
    // Text is now split, query by parent or more specific means
    const dueDateContainer = screen.getByText('Due:').parentElement;
    expect(dueDateContainer).toHaveTextContent('Due:2024-07-28');
    const rewardContainer = screen.getByText('Reward:').parentElement;
    expect(rewardContainer).toHaveTextContent('Reward:$5.00');
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
    renderCardWithSpecificDndState(); // mockInstance now has subtaskCompletions reflecting mockDefinition
    const subtask1 = screen.getByLabelText('Sub-task 1');
    const subtask2 = screen.getByLabelText('Sub-task 2');
    expect(subtask1).not.toBeChecked();
    expect(subtask2).toBeChecked(); // sub2 is complete in initialSubtaskCompletions
  });

  test('progress bar reflects sub-task completion and has correct ARIA attributes (1 of 2 complete = 50%)', () => {
    renderCardWithSpecificDndState(); // mockInstance now has subtaskCompletions reflecting mockDefinition
    // Subtask 'sub2' is complete, 'sub1' is not. So 1 out of 2 = 50%.
    const progressBarContainer = screen.getByTitle('Progress: 50% (1/2)');
    const progressBarFill = progressBarContainer.querySelector('.progress-bar-fill');

    expect(progressBarFill).toBeInTheDocument();
    expect(progressBarFill).toHaveStyle('width: 50%'); // Corrected expectation
    expect(progressBarFill).toHaveAttribute('role', 'progressbar');
    expect(progressBarFill).toHaveAttribute('aria-valuenow', '50');
    expect(progressBarFill).toHaveAttribute('aria-valuemin', '0');
    expect(progressBarFill).toHaveAttribute('aria-valuemax', '100');
    expect(progressBarFill).toHaveAttribute('aria-label', 'Progress: 50%');
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
    expect(mockToggleSubtaskCompletionOnInstance).toHaveBeenCalledWith(mockInstance.id, 'sub1'); // Changed mock and first arg
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

  // --- Tests for Inline Editing ---
  describe('Inline Editing', () => {
    // Reward Amount Edit - Instance Only
    test('reward amount (recurring, instance only): blur saves via modal', async () => {
      const user = userEvent.setup();
      renderCardWithSpecificDndState({ definition: { ...mockDefinition, recurrenceType: 'daily' } });
      await user.click(screen.getByLabelText('Edit reward amount'));
      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '7.50');
      await user.tab(); // Blur - opens modal

      expect(screen.getByText("Confirm Edit Scope")).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /This instance only/i }));

      expect(mockUpdateChoreInstanceField).toHaveBeenCalledWith(mockInstance.id, 'overriddenRewardAmount', 7.50);
      expect(mockUpdateChoreSeries).not.toHaveBeenCalled();
      expect(screen.queryByText("Confirm Edit Scope")).not.toBeInTheDocument(); // Modal closes
    });

    // Reward Amount Edit - Series
    test('reward amount (recurring, series): Enter saves via modal', async () => {
      const user = userEvent.setup();
      renderCardWithSpecificDndState({ definition: { ...mockDefinition, recurrenceType: 'daily' } });
      await user.click(screen.getByLabelText('Edit reward amount'));
      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '10');
      await user.keyboard('{Enter}'); // Enter - opens modal

      expect(screen.getByText("Confirm Edit Scope")).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /This and all future instances/i }));

      // First, clears override on current instance
      expect(mockUpdateChoreInstanceField).toHaveBeenCalledWith(mockInstance.id, 'overriddenRewardAmount', undefined);
      // Then, updates series
      expect(mockUpdateChoreSeries).toHaveBeenCalledWith(
        mockDefinition.id,
        { rewardAmount: 10 },
        mockInstance.instanceDate,
        'rewardAmount'
      );
      expect(screen.queryByText("Confirm Edit Scope")).not.toBeInTheDocument(); // Modal closes
    });

    // Reward Amount Edit - Non-Recurring
    test('reward amount (non-recurring): blur saves directly', async () => {
      const user = userEvent.setup();
      renderCardWithSpecificDndState({ definition: { ...mockDefinition, recurrenceType: null } }); // Non-recurring
      await user.click(screen.getByLabelText('Edit reward amount'));
      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '8.00');
      await user.tab(); // Blur

      expect(mockUpdateChoreDefinition).toHaveBeenCalledWith(mockDefinition.id, { rewardAmount: 8.00 });
      expect(mockUpdateChoreSeries).not.toHaveBeenCalled();
      expect(mockUpdateChoreInstanceField).not.toHaveBeenCalled();
      expect(screen.queryByText("Confirm Edit Scope")).not.toBeInTheDocument();
    });

    test('reward amount: pressing Escape in input cancels edit', async () => {
      const user = userEvent.setup();
      renderCardWithSpecificDndState();
      await user.click(screen.getByLabelText('Edit reward amount'));

      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '123'); // Change value
      await user.keyboard('{Escape}');

      expect(mockUpdateChoreDefinition).not.toHaveBeenCalled();
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
      // Original value shown - adjust query to find the span within the parent div
      const rewardContainer = screen.getByText('Reward:').parentElement;
      expect(rewardContainer).toHaveTextContent(`Reward:$${mockDefinition.rewardAmount?.toFixed(2)}`);
    });

    test('instance date: clicking edit icon shows input, blur saves', async () => {
      const user = userEvent.setup();
      renderCardWithSpecificDndState(); // Assuming default mockDefinition is recurring

      await user.click(screen.getByLabelText('Edit due date'));
      const dateInput = screen.getByDisplayValue(mockInstance.instanceDate);
      const newDate = '2024-08-15';
      fireEvent.change(dateInput, { target: { value: newDate } });
      await user.tab(); // Blur - opens modal

      expect(screen.getByText("Confirm Edit Scope")).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /This instance only/i }));

      expect(mockUpdateChoreInstanceField).toHaveBeenCalledWith(mockInstance.id, 'instanceDate', newDate);
      expect(mockUpdateChoreSeries).not.toHaveBeenCalled();
      expect(screen.queryByText("Confirm Edit Scope")).not.toBeInTheDocument(); // Modal closes
    });

    // Instance Date Edit - Series
    test('instance date (recurring, series): Enter saves via modal', async () => {
      const user = userEvent.setup();
      renderCardWithSpecificDndState({ definition: { ...mockDefinition, recurrenceType: 'daily' } });
      await user.click(screen.getByLabelText('Edit due date'));
      const dateInput = screen.getByDisplayValue(mockInstance.instanceDate);
      const newDate = '2024-08-16';
      fireEvent.change(dateInput, { target: { value: newDate } });
      await user.keyboard('{Enter}'); // Enter - opens modal

      expect(screen.getByText("Confirm Edit Scope")).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /This and all future instances/i }));

      expect(mockUpdateChoreSeries).toHaveBeenCalledWith(
        mockDefinition.id,
        { dueDate: newDate },
        mockInstance.instanceDate,
        'dueDate'
      );
      expect(mockUpdateChoreInstanceField).not.toHaveBeenCalledWith(mockInstance.id, 'instanceDate', newDate); // Direct instance date change for series is not done this way
      expect(screen.queryByText("Confirm Edit Scope")).not.toBeInTheDocument(); // Modal closes
    });

    // Instance Date Edit - Non-Recurring
    test('instance date (non-recurring): blur saves directly', async () => {
      const user = userEvent.setup();
      renderCardWithSpecificDndState({ definition: { ...mockDefinition, recurrenceType: null } }); // Non-recurring
      await user.click(screen.getByLabelText('Edit due date'));
      const dateInput = screen.getByDisplayValue(mockInstance.instanceDate);
      const newDate = '2024-08-17';
      fireEvent.change(dateInput, { target: { value: newDate } });
      await user.tab(); // Blur

      expect(mockUpdateChoreInstanceField).toHaveBeenCalledWith(mockInstance.id, 'instanceDate', newDate);
      expect(mockUpdateChoreSeries).not.toHaveBeenCalled();
      expect(screen.queryByText("Confirm Edit Scope")).not.toBeInTheDocument();
    });

    test('instance date: pressing Escape in input cancels edit', async () => {
      const user = userEvent.setup();
      renderCardWithSpecificDndState();
      await user.click(screen.getByLabelText('Edit due date'));

      const dateInput = screen.getByDisplayValue(mockInstance.instanceDate);
      fireEvent.change(dateInput, { target: { value: '2000-01-01' } });
      await user.keyboard('{Escape}');

      expect(mockUpdateChoreInstanceField).not.toHaveBeenCalled();
      expect(screen.queryByDisplayValue('2000-01-01')).not.toBeInTheDocument();
      const dueDateContainer = screen.getByText('Due:').parentElement;
      expect(dueDateContainer).toHaveTextContent(`Due:${mockInstance.instanceDate}`);
    });
  });

  describe('Displaying Overridden Reward', () => {
    test('displays overridden reward amount and "(edited)" when instance.overriddenRewardAmount is set', () => {
      const instanceWithOverride: ChoreInstance = { ...mockInstance, overriddenRewardAmount: 7.77 };
      renderCardWithSpecificDndState({ instance: instanceWithOverride });

      const rewardContainer = screen.getByText('Reward:').parentElement;
      expect(rewardContainer).toHaveTextContent('Reward:$7.77');
      expect(screen.getByText('(edited)')).toBeInTheDocument();
    });

    test('displays definition reward amount when instance.overriddenRewardAmount is undefined', () => {
      const instanceWithoutOverride: ChoreInstance = { ...mockInstance, overriddenRewardAmount: undefined };
      renderCardWithSpecificDndState({ instance: instanceWithoutOverride });

      const rewardContainer = screen.getByText('Reward:').parentElement;
      expect(rewardContainer).toHaveTextContent(`Reward:$${mockDefinition.rewardAmount?.toFixed(2)}`);
      expect(screen.queryByText('(edited)')).not.toBeInTheDocument();
    });

     test('displays definition reward amount when instance.overriddenRewardAmount is null (though undefined is preferred for clearing)', () => {
      const instanceWithNullOverride: ChoreInstance = { ...mockInstance, overriddenRewardAmount: null as any }; // Using null
      renderCardWithSpecificDndState({ instance: instanceWithNullOverride });

      const rewardContainer = screen.getByText('Reward:').parentElement;
      expect(rewardContainer).toHaveTextContent(`Reward:$${mockDefinition.rewardAmount?.toFixed(2)}`);
      expect(screen.queryByText('(edited)')).not.toBeInTheDocument();
    });
  });

  // --- Tests for Selection Checkbox ---
  describe('Selection Checkbox', () => {
    const mockOnToggleSelection = vi.fn();

    test('renders checkbox when onToggleSelection is provided and not overlay', () => {
      renderCardWithSpecificDndState({ onToggleSelection: mockOnToggleSelection });
      expect(screen.getByLabelText(`Select chore ${mockDefinition.title}`)).toBeInTheDocument();
    });

    test('does not render checkbox if isOverlay is true', () => {
      renderCardWithSpecificDndState({ isOverlay: true, onToggleSelection: mockOnToggleSelection });
      expect(screen.queryByLabelText(`Select chore ${mockDefinition.title}`)).not.toBeInTheDocument();
    });

    test('does not render checkbox if onToggleSelection is not provided', () => {
      renderCardWithSpecificDndState({ isOverlay: false, onToggleSelection: undefined }); // Explicitly pass undefined and isOverlay
      expect(screen.queryByLabelText(`Select chore ${mockDefinition.title}`)).not.toBeInTheDocument();
    });

    test('checkbox reflects isSelected prop', () => {
      renderCardWithSpecificDndState({ isSelected: true, onToggleSelection: mockOnToggleSelection });
      const checkbox = screen.getByLabelText(`Select chore ${mockDefinition.title}`) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);

      cleanup(); // Important for re-rendering with different props

      renderCardWithSpecificDndState({ isSelected: false, onToggleSelection: mockOnToggleSelection });
      const checkboxUnchecked = screen.getByLabelText(`Select chore ${mockDefinition.title}`) as HTMLInputElement;
      expect(checkboxUnchecked.checked).toBe(false);
    });

    test('calls onToggleSelection with instanceId and new checked state on change', async () => {
      const user = userEvent.setup();
      renderCardWithSpecificDndState({ onToggleSelection: mockOnToggleSelection, isSelected: false });

      const checkbox = screen.getByLabelText(`Select chore ${mockDefinition.title}`);
      await user.click(checkbox);

      expect(mockOnToggleSelection).toHaveBeenCalledWith(mockInstance.id, true);

      cleanup(); // Re-render with checkbox initially checked
      const mockOnToggleSelection2 = vi.fn();
      renderCardWithSpecificDndState({ onToggleSelection: mockOnToggleSelection2, isSelected: true });

      const checkboxChecked = screen.getByLabelText(`Select chore ${mockDefinition.title}`);
      await user.click(checkboxChecked);
      expect(mockOnToggleSelection2).toHaveBeenCalledWith(mockInstance.id, false);
    });

    test('card has "selected" class and style when isSelected is true', () => {
      renderCardWithSpecificDndState({ isSelected: true, onToggleSelection: mockOnToggleSelection });
      const cardElement = screen.getByText(mockDefinition.title).closest('.kanban-card');
      expect(cardElement).toHaveClass('selected');
      expect(cardElement).toHaveStyle('border: 2px solid var(--primary-color, #007bff)');
    });
  });
});
