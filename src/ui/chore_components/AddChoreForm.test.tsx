import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AddChoreForm from './AddChoreForm'; // Assuming path is correct
import { ChoresContext, ChoresContextType } from '../../contexts/ChoresContext';
import { UserContext, UserContextType as AppUserContextType } from '../../contexts/UserContext'; // Renamed to avoid conflict
import type { Kid } from '../../types';

const mockAddChoreDefinition = vi.fn();
const mockChoresContextValue: Partial<ChoresContextType> = {
  addChoreDefinition: mockAddChoreDefinition,
  // Add other mocks if needed by the form for initial rendering or complex interactions
  choreDefinitions: [],
  choreInstances: [],
  getChoreDefinitionsForKid: vi.fn(() => []),
  generateInstancesForPeriod: vi.fn(),
  toggleChoreInstanceComplete: vi.fn(),
  toggleSubtaskCompletionOnInstance: vi.fn(),
  toggleChoreDefinitionActiveState: vi.fn(),
  updateChoreInstanceCategory: vi.fn(),
  updateChoreDefinition: vi.fn(),
  updateChoreInstanceField: vi.fn(),
  batchToggleCompleteChoreInstances: vi.fn(),
  batchUpdateChoreInstancesCategory: vi.fn(),
  batchAssignChoreDefinitionsToKid: vi.fn(),
};

const mockKids: Kid[] = [
  { id: 'kid1', name: 'Kid One', kanbanColumnConfigs: [] },
  { id: 'kid2', name: 'Kid Two', kanbanColumnConfigs: [] },
];

const mockUserContextValue: Partial<AppUserContextType> = {
  user: { id: 'user1', username: 'Test User', email: 'test@example.com', kids: mockKids },
  loading: false,
  // Add other mocks as needed
};

const renderAddChoreForm = (props: Partial<React.ComponentProps<typeof AddChoreForm>> = {}) => {
  return render(
    <UserContext.Provider value={mockUserContextValue as AppUserContextType}>
      <ChoresContext.Provider value={mockChoresContextValue as ChoresContextType}>
        <AddChoreForm {...props} />
      </ChoresContext.Provider>
    </UserContext.Provider>
  );
};

describe('AddChoreForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock alert
    window.alert = vi.fn();
  });

  test('renders basic chore fields', () => {
    renderAddChoreForm();
    expect(screen.getByLabelText(/Title:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description \(Optional\):/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Assign to \(Optional\):/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Due Date \(Optional, or Start Date for Recurring\):/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reward Amount \(Optional\):/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tags \(comma-separated, Optional\):/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Repeats:/i)).toBeInTheDocument();
  });

  test('renders "Early Start Date" field', () => {
    renderAddChoreForm();
    expect(screen.getByLabelText(/Early Start Date \(Optional\):/i)).toBeInTheDocument();
  });

  test('submits basic chore data correctly', async () => {
    const user = userEvent.setup();
    const mockOnSuccess = vi.fn();
    renderAddChoreForm({ onSuccess: mockOnSuccess });

    await user.type(screen.getByLabelText(/Title:/i), 'Test Chore');
    await user.type(screen.getByLabelText(/Description \(Optional\):/i), 'Test Description');
    await user.selectOptions(screen.getByLabelText(/Assign to \(Optional\):/i), 'kid1');
    fireEvent.change(screen.getByLabelText(/Due Date \(Optional, or Start Date for Recurring\):/i), { target: { value: '2024-12-31' } });
    await user.type(screen.getByLabelText(/Reward Amount \(Optional\):/i), '5.50');

    await user.click(screen.getByRole('button', { name: /Add Chore/i }));

    expect(mockAddChoreDefinition).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Test Chore',
      description: 'Test Description',
      assignedKidId: 'kid1',
      dueDate: '2024-12-31',
      rewardAmount: 5.50,
      earlyStartDate: undefined, // Not filled in this test
    }));
    expect(window.alert).toHaveBeenCalledWith('Chore added!');
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  test('submits chore data with "Early Start Date"', async () => {
    const user = userEvent.setup();
    renderAddChoreForm();

    await user.type(screen.getByLabelText(/Title:/i), 'Early Start Chore');
    fireEvent.change(screen.getByLabelText(/Due Date \(Optional, or Start Date for Recurring\):/i), { target: { value: '2024-11-15' } });
    fireEvent.change(screen.getByLabelText(/Early Start Date \(Optional\):/i), { target: { value: '2024-11-10' } });

    await user.click(screen.getByRole('button', { name: /Add Chore/i }));

    expect(mockAddChoreDefinition).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Early Start Chore',
      dueDate: '2024-11-15',
      earlyStartDate: '2024-11-10',
    }));
  });

  test('earlyStartDate input has max attribute set by dueDate', async () => {
    const user = userEvent.setup();
    renderAddChoreForm();
    const dueDateInput = screen.getByLabelText(/Due Date \(Optional, or Start Date for Recurring\):/i);
    const earlyStartDateInput = screen.getByLabelText(/Early Start Date \(Optional\):/i);

    expect(earlyStartDateInput).not.toHaveAttribute('max');

    fireEvent.change(dueDateInput, { target: { value: '2025-01-10' } });
    // Need to wait for react state update and re-render
    await screen.findByDisplayValue('2025-01-10'); // Ensure dueDate has updated in DOM if it's a controlled component that re-renders

    expect(earlyStartDateInput).toHaveAttribute('max', '2025-01-10');
  });

  test('shows warning if earlyStartDate is after dueDate (though HTML max should prevent)', async () => {
    const user = userEvent.setup();
    // Mock console.warn
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderAddChoreForm();

    const dueDateInput = screen.getByLabelText(/Due Date \(Optional, or Start Date for Recurring\):/i);
    const earlyStartDateInput = screen.getByLabelText(/Early Start Date \(Optional\):/i);

    fireEvent.change(dueDateInput, { target: { value: '2024-03-10' } });
    // Simulate user typing/pasting a date that bypasses 'max' or if 'max' is not perfectly enforced by test environment
    fireEvent.change(earlyStartDateInput, { target: { value: '2024-03-15' } });

    // The warning paragraph should appear
    expect(await screen.findByText('Warning: Early start is after due date.')).toBeInTheDocument();
    // The console.warn inside onChange handler should also be called
    expect(consoleWarnSpy).toHaveBeenCalledWith("Early start date is after the due date.");

    consoleWarnSpy.mockRestore();
  });

  test('populates fields correctly when initialChore is provided (editing)', () => {
    const initialChoreData = {
      title: 'Edit Me',
      description: 'To be edited',
      assignedKidId: 'kid2',
      dueDate: '2025-01-01',
      earlyStartDate: '2024-12-25',
      rewardAmount: '10',
      recurrenceType: 'weekly',
      recurrenceDay: [1], // Monday
      recurrenceEndDate: '2025-06-01',
      tags: ['editing', 'important'],
      subTasks: [{ id: 'st_edit', title: 'Subby', isComplete: false }],
    };
    renderAddChoreForm({ initialChore: initialChoreData, enableSubtasks: true, enableRecurrence: true });

    expect(screen.getByLabelText(/Title:/i)).toHaveValue('Edit Me');
    expect(screen.getByLabelText(/Description \(Optional\):/i)).toHaveValue('To be edited');
    expect(screen.getByLabelText(/Assign to \(Optional\):/i)).toHaveValue('kid2');
    expect(screen.getByLabelText(/Due Date \(Optional, or Start Date for Recurring\):/i)).toHaveValue('2025-01-01');
    expect(screen.getByLabelText(/Early Start Date \(Optional\):/i)).toHaveValue('2024-12-25');
    expect(screen.getByLabelText(/Reward Amount \(Optional\):/i)).toHaveValue(10); // input type number
    expect(screen.getByLabelText(/Tags \(comma-separated, Optional\):/i)).toHaveValue('editing, important');
    expect(screen.getByLabelText(/Repeats:/i)).toHaveValue('weekly');
    // Check weekly day (Mon)
    const mondayCheckbox = screen.getByLabelText('Mon').closest('input[type="checkbox"]');
    expect(mondayCheckbox).toBeChecked();
    expect(screen.getByLabelText(/Repeat Until \(Optional\):/i)).toHaveValue('2025-06-01');
    expect(screen.getByPlaceholderText('Sub-task 1')).toHaveValue('Subby');
  });
});
