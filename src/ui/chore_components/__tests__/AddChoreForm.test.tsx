// src/ui/chore_components/__tests__/AddChoreForm.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddChoreForm from '../AddChoreForm';
import { ChoresContext, ChoresContextType } from '../../../contexts/ChoresContext';
import { UserContext, UserContextType as ActualUserContextType } from '../../../contexts/UserContext'; // Renamed to avoid conflict
import { FinancialContext, FinancialContextType as ActualFinancialContextType } from '../../../contexts/FinancialContext'; // Needed by ChoresContext mock
import type { Kid } from '../../../types';

// Mocks
const mockAddChoreDefinition = jest.fn();
const mockGenerateInstancesForPeriod = jest.fn();
const mockToggleChoreInstanceComplete = jest.fn();
const mockGetChoreDefinitionsForKid = jest.fn(() => []);
const mockToggleSubTaskComplete = jest.fn();

const mockChoresContextValue: ChoresContextType = {
  choreDefinitions: [],
  choreInstances: [],
  addChoreDefinition: mockAddChoreDefinition,
  generateInstancesForPeriod: mockGenerateInstancesForPeriod,
  toggleChoreInstanceComplete: mockToggleChoreInstanceComplete,
  getChoreDefinitionsForKid: mockGetChoreDefinitionsForKid,
  toggleSubTaskComplete: mockToggleSubTaskComplete,
};

const mockKids: Kid[] = [
  { id: 'kid1', name: 'Kid One', age: 10 },
  { id: 'kid2', name: 'Kid Two', age: 8 },
];

const mockUserContextValue: ActualUserContextType = {
  user: { name: 'Test Parent', email: 'parent@test.com', kids: mockKids },
  loading: false,
};

// ChoresContext internally uses FinancialContext, so we need to provide a mock for that too.
const mockFinancialContextValue: ActualFinancialContextType = {
    financialData: { currentBalance: 0, transactions: [] },
    addFunds: jest.fn(),
    addTransaction: jest.fn(),
    addKidReward: jest.fn(),
};

const renderFormComponent = () => {
  return render(
    <UserContext.Provider value={mockUserContextValue}>
      <FinancialContext.Provider value={mockFinancialContextValue}>
        <ChoresContext.Provider value={mockChoresContextValue}>
          <AddChoreForm />
        </ChoresContext.Provider>
      </FinancialContext.Provider>
    </UserContext.Provider>
  );
};

describe('AddChoreForm', () => {
  beforeEach(() => {
    mockAddChoreDefinition.mockClear();
    // Spy on alert and console.error if needed for validation messages
    window.alert = jest.fn();
  });

  afterEach(() => {
    (window.alert as jest.Mock).mockRestore();
  });

  it('renders all basic form fields', () => {
    renderFormComponent();
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description \(Optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Assign to \(Optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Due Date \(Optional, or Start Date for Recurring\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Reward Amount \(Optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tags \(comma-separated, Optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Repeats/i)).toBeInTheDocument();
    expect(screen.getByText('Sub-tasks (Optional):')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Chore/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Add Sub-task/i })).toBeInTheDocument();
  });

  it('populates "Assign to" dropdown with kids from UserContext', () => {
    renderFormComponent();
    const assignDropdown = screen.getByLabelText(/Assign to \(Optional\)/i);
    expect(assignDropdown).toHaveDisplayValue('Unassigned');
    expect(screen.getByRole('option', { name: 'Unassigned' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Kid One' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Kid Two' })).toBeInTheDocument();
  });

  // More tests for input changes, submissions, dynamic UI will follow

  it('updates state when user types into text fields', async () => {
    const user = userEvent.setup();
    renderFormComponent();

    const titleInput = screen.getByLabelText(/Title/i);
    await user.type(titleInput, 'Mow the Lawn');
    expect(titleInput).toHaveValue('Mow the Lawn');

    const descriptionInput = screen.getByLabelText(/Description \(Optional\)/i);
    await user.type(descriptionInput, 'Use the push mower.');
    expect(descriptionInput).toHaveValue('Use the push mower.');

    const rewardInput = screen.getByLabelText(/Reward Amount \(Optional\)/i);
    await user.clear(rewardInput); // Clear existing value if any (e.g. from previous test or default)
    await user.type(rewardInput, '15.50');
    expect(rewardInput).toHaveValue(15.50); // number input

    const tagsInput = screen.getByLabelText(/Tags \(comma-separated, Optional\)/i);
    await user.type(tagsInput, 'outdoor, yard work');
    expect(tagsInput).toHaveValue('outdoor, yard work');
  });

  it('updates state when user selects an assigned kid', async () => {
    const user = userEvent.setup();
    renderFormComponent();
    const assignDropdown = screen.getByLabelText(/Assign to \(Optional\)/i);
    await user.selectOptions(assignDropdown, 'kid1');
    expect(assignDropdown).toHaveValue('kid1');
  });

  it('updates state when due date is changed', async () => {
    const user = userEvent.setup();
    renderFormComponent();
    const dueDateInput = screen.getByLabelText(/Due Date \(Optional, or Start Date for Recurring\)/i);
    await user.type(dueDateInput, '2024-07-15'); // userEvent.type for date inputs
    expect(dueDateInput).toHaveValue('2024-07-15');
  });

  it('shows/hides recurrence-specific fields based on selection', async () => {
    const user = userEvent.setup();
    renderFormComponent();
    const recurrenceDropdown = screen.getByLabelText(/Repeats/i);

    // Initially, day of week/month should not be visible
    expect(screen.queryByLabelText(/Day of the Week/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Day of the Month/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Repeat Until \(Optional\)/i)).not.toBeInTheDocument();

    // Select Weekly
    await user.selectOptions(recurrenceDropdown, 'weekly');
    expect(screen.getByLabelText(/Day of the Week/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Day of the Month/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Repeat Until \(Optional\)/i)).toBeInTheDocument();

    // Select Monthly
    await user.selectOptions(recurrenceDropdown, 'monthly');
    expect(screen.queryByLabelText(/Day of the Week/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Day of the Month/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Repeat Until \(Optional\)/i)).toBeInTheDocument();

    // Select Daily
    await user.selectOptions(recurrenceDropdown, 'daily');
    expect(screen.queryByLabelText(/Day of the Week/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Day of the Month/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Repeat Until \(Optional\)/i)).toBeInTheDocument();

    // Select None
    await user.selectOptions(recurrenceDropdown, 'none');
    expect(screen.queryByLabelText(/Day of the Week/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Day of the Month/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Repeat Until \(Optional\)/i)).not.toBeInTheDocument();
  });

  it('allows adding, typing into, and removing sub-tasks', async () => {
    const user = userEvent.setup();
    renderFormComponent();
    const addSubTaskButton = screen.getByRole('button', { name: /\+ Add Sub-task/i });

    // Add first sub-task
    await user.click(addSubTaskButton);
    let subTaskInputs = screen.getAllByPlaceholderText(/Sub-task \d+/i);
    expect(subTaskInputs.length).toBe(1);
    await user.type(subTaskInputs[0], 'First sub-task details');
    expect(subTaskInputs[0]).toHaveValue('First sub-task details');

    // Add second sub-task
    await user.click(addSubTaskButton);
    subTaskInputs = screen.getAllByPlaceholderText(/Sub-task \d+/i);
    expect(subTaskInputs.length).toBe(2);
    await user.type(subTaskInputs[1], 'Second sub-task details');
    expect(subTaskInputs[1]).toHaveValue('Second sub-task details');
    expect(subTaskInputs[0]).toHaveValue('First sub-task details'); // Ensure first one is still there

    // Remove first sub-task
    const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
    expect(removeButtons.length).toBe(2);
    await user.click(removeButtons[0]);

    subTaskInputs = screen.getAllByPlaceholderText(/Sub-task \d+/i);
    expect(subTaskInputs.length).toBe(1);
    expect(subTaskInputs[0]).toHaveValue('Second sub-task details'); // Second one is now the first
  });

  describe('form submission', () => {
    it('calls addChoreDefinition with correct data and resets form on valid submission', async () => {
      const user = userEvent.setup();
      renderFormComponent();

      // Fill out the form
      await user.type(screen.getByLabelText(/Title/i), 'Submit Test Chore');
      await user.type(screen.getByLabelText(/Description \(Optional\)/i), 'Submission description');
      await user.selectOptions(screen.getByLabelText(/Assign to \(Optional\)/i), 'kid1');
      // Due date input requires yyyy-mm-dd format for typing
      const dueDateInput = screen.getByLabelText(/Due Date \(Optional, or Start Date for Recurring\)/i);
      fireEvent.change(dueDateInput, { target: { value: '2024-08-01' } }); // fireEvent for date for reliability

      const rewardInput = screen.getByLabelText(/Reward Amount \(Optional\)/i);
      await user.clear(rewardInput);
      await user.type(rewardInput, '7.25');

      await user.type(screen.getByLabelText(/Tags \(comma-separated, Optional\)/i), 'submit, test');

      // Recurrence
      const recurrenceDropdown = screen.getByLabelText(/Repeats/i);
      await user.selectOptions(recurrenceDropdown, 'weekly');
      await user.selectOptions(screen.getByLabelText(/Day of the Week/i), '3'); // Wednesday
      const recurrenceEndDateInput = screen.getByLabelText(/Repeat Until \(Optional\)/i);
      fireEvent.change(recurrenceEndDateInput, { target: { value: '2024-08-31' } });


      // Sub-tasks
      const addSubTaskButton = screen.getByRole('button', { name: /\+ Add Sub-task/i });
      await user.click(addSubTaskButton);
      await user.type(screen.getByPlaceholderText(/Sub-task \d+/i), 'Sub 1 for submit');

      // Submit
      const submitButton = screen.getByRole('button', { name: /Add Chore/i });
      await user.click(submitButton);

      // Verify addChoreDefinition was called
      expect(mockAddChoreDefinition).toHaveBeenCalledTimes(1);
      const expectedChoreData = {
        title: 'Submit Test Chore',
        description: 'Submission description',
        assignedKidId: 'kid1',
        dueDate: '2024-08-01',
        rewardAmount: 7.25,
        recurrenceType: 'weekly',
        recurrenceDay: 3,
        recurrenceEndDate: '2024-08-31',
        tags: ['submit', 'test'],
        subTasks: expect.arrayContaining([
          expect.objectContaining({ title: 'Sub 1 for submit', isComplete: false })
        ]),
      };
      expect(mockAddChoreDefinition).toHaveBeenCalledWith(expect.objectContaining(expectedChoreData));

      // Verify alert was shown (as per current form logic)
      expect(window.alert).toHaveBeenCalledWith('Chore added!');

      // Verify form fields are reset (checking a few key fields)
      expect(screen.getByLabelText(/Title/i)).toHaveValue('');
      expect(screen.getByLabelText(/Description \(Optional\)/i)).toHaveValue('');
      // Selects reset to first option or placeholder
      expect(screen.getByLabelText(/Assign to \(Optional\)/i)).toHaveValue(''); // Unassigned
      expect(screen.getByLabelText(/Repeats/i)).toHaveValue('none');
      expect(screen.queryByPlaceholderText(/Sub-task \d+/i)).not.toBeInTheDocument(); // Sub-tasks are removed
    });

    it('shows an alert if title is missing on submission', async () => {
      const user = userEvent.setup();
      renderFormComponent();

      // Intentionally leave title blank
      await user.type(screen.getByLabelText(/Description \(Optional\)/i), 'No title chore');

      const submitButton = screen.getByRole('button', { name: /Add Chore/i });
      await user.click(submitButton);

      expect(mockAddChoreDefinition).not.toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('Please enter a chore title.');
    });

    it('handles empty optional fields correctly on submission', async () => {
        const user = userEvent.setup();
        renderFormComponent();

        await user.type(screen.getByLabelText(/Title/i), 'Minimal Chore');
        // Leave all optional fields empty

        const submitButton = screen.getByRole('button', { name: /Add Chore/i });
        await user.click(submitButton);

        expect(mockAddChoreDefinition).toHaveBeenCalledTimes(1);
        expect(mockAddChoreDefinition).toHaveBeenCalledWith({
            title: 'Minimal Chore',
            description: undefined, // Handled by trim() || undefined
            assignedKidId: undefined,
            dueDate: undefined, // Handled by '' || undefined
            rewardAmount: undefined, // Handled by parseFloat('') -> NaN, then undefined
            recurrenceType: null, // Default
            recurrenceDay: null,
            recurrenceEndDate: null,
            tags: undefined,
            subTasks: undefined,
        });
        expect(window.alert).toHaveBeenCalledWith('Chore added!');
    });
  });
});
```
