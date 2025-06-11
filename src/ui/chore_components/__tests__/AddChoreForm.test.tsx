// src/ui/chore_components/__tests__/AddChoreForm.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddChoreForm from '../AddChoreForm';
import { ChoresContext, ChoresContextType } from '../../../contexts/ChoresContext';
import { UserContext, UserContextType as ActualUserContextType } from '../../../contexts/UserContext';
import { FinancialContext, FinancialContextType as ActualFinancialContextType } from '../../../contexts/FinancialContext';
import type { Kid } from '../../../types';
import { vi } from 'vitest';
import { getTodayDateString as actualGetTodayDateString } from '../../utils/dateUtils'; // Import to potentially use actual or ensure path is right

vi.mock('../../utils/dateUtils', async () => {
  return {
    getTodayDateString: vi.fn(() => '2024-01-01'), // Mocked date
    // If dateUtils exports other functions, you might need to mock them or provide actual implementations
    // For example:
    // ...await vi.importActual('../../utils/dateUtils'), // if you want to keep other functions real
  };
});

// Mocks
const mockAddChoreDefinition = vi.fn();
const mockGenerateInstancesForPeriod = vi.fn();
const mockToggleChoreInstanceComplete = vi.fn();
const mockGetChoreDefinitionsForKid = vi.fn(() => []);
const mockToggleSubTaskComplete = vi.fn();

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
    addFunds: vi.fn(),
    addTransaction: vi.fn(),
    addKidReward: vi.fn(),
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
    mockGenerateInstancesForPeriod.mockClear();
    mockToggleChoreInstanceComplete.mockClear();
    mockGetChoreDefinitionsForKid.mockClear();
    mockToggleSubTaskComplete.mockClear();
    window.alert = vi.fn();
  });

  afterEach(() => {
    (window.alert as ReturnType<typeof vi.fn>).mockRestore();
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
    expect(screen.getByRole('heading', { level: 3, name: /Sub-tasks \(Optional\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Chore/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Sub-task/i })).toBeInTheDocument();
  });

  it('populates "Assign to" dropdown with kids from UserContext', () => {
    renderFormComponent();
    const assignDropdown = screen.getByLabelText(/Assign to \(Optional\)/i);
    expect(assignDropdown).toHaveDisplayValue('Unassigned');
    expect(screen.getByRole('option', { name: 'Unassigned' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Kid One' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Kid Two' })).toBeInTheDocument();
  });

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
    await user.clear(rewardInput);
    await user.type(rewardInput, '15.50');
    expect(rewardInput).toHaveValue(15.50);

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
    await user.type(dueDateInput, '2024-07-15');
    expect(dueDateInput).toHaveValue('2024-07-15');
  });

  it('shows/hides recurrence-specific fields based on selection', async () => {
    const user = userEvent.setup();
    renderFormComponent();
    const recurrenceDropdown = screen.getByLabelText(/Repeats/i);

    expect(screen.queryByLabelText(/Day of the Week/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Day of the Month/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Repeat Until \(Optional\)/i)).not.toBeInTheDocument();

    await user.selectOptions(recurrenceDropdown, 'weekly');
    expect(screen.getByLabelText(/Day of the Week/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Day of the Month/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Repeat Until \(Optional\)/i)).toBeInTheDocument();

    await user.selectOptions(recurrenceDropdown, 'monthly');
    expect(screen.queryByLabelText(/Day of the Week/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Day of the Month/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Repeat Until \(Optional\)/i)).toBeInTheDocument();

    await user.selectOptions(recurrenceDropdown, 'daily');
    expect(screen.queryByLabelText(/Day of the Week/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Day of the Month/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Repeat Until \(Optional\)/i)).toBeInTheDocument();

    await user.selectOptions(recurrenceDropdown, 'none');
    expect(screen.queryByLabelText(/Day of the Week/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Day of the Month/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Repeat Until \(Optional\)/i)).not.toBeInTheDocument();
  });

  it('allows adding, typing into, and removing sub-tasks', async () => {
    const user = userEvent.setup();
    renderFormComponent();
    const addSubTaskButton = screen.getByRole('button', { name: /Add Sub-task/i });

    await user.click(addSubTaskButton);
    let subTaskInputs = screen.getAllByPlaceholderText(/Sub-task title/i);
    expect(subTaskInputs.length).toBe(1);
    await user.type(subTaskInputs[0], 'First sub-task details');
    expect(subTaskInputs[0]).toHaveValue('First sub-task details');

    await user.click(addSubTaskButton);
    subTaskInputs = screen.getAllByPlaceholderText(/Sub-task title/i);
    expect(subTaskInputs.length).toBe(2);
    await user.type(subTaskInputs[1], 'Second sub-task details');
    expect(subTaskInputs[1]).toHaveValue('Second sub-task details');
    expect(subTaskInputs[0]).toHaveValue('First sub-task details');

    const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
    expect(removeButtons.length).toBe(2);
    await user.click(removeButtons[0]);

    subTaskInputs = screen.getAllByPlaceholderText(/Sub-task title/i);
    expect(subTaskInputs.length).toBe(1);
    expect(subTaskInputs[0]).toHaveValue('Second sub-task details');
  });

  describe('form submission', () => {
    it('calls addChoreDefinition with correct data and resets form on valid submission', async () => {
      const user = userEvent.setup();
      renderFormComponent();

      await user.type(screen.getByLabelText(/Title/i), 'Submit Test Chore');
      await user.type(screen.getByLabelText(/Description \(Optional\)/i), 'Submission description');
      await user.selectOptions(screen.getByLabelText(/Assign to \(Optional\)/i), 'kid1');
      const dueDateInput = screen.getByLabelText(/Due Date \(Optional, or Start Date for Recurring\)/i);
      fireEvent.change(dueDateInput, { target: { value: '2024-08-01' } });

      const rewardInput = screen.getByLabelText(/Reward Amount \(Optional\)/i);
      await user.clear(rewardInput);
      await user.type(rewardInput, '7.25');

      await user.type(screen.getByLabelText(/Tags \(comma-separated, Optional\)/i), 'submit, test');

      const recurrenceDropdown = screen.getByLabelText(/Repeats/i);
      await user.selectOptions(recurrenceDropdown, 'weekly');
      await user.selectOptions(screen.getByLabelText(/Day of the Week/i), '3');
      // Corrected typo: recururrenceEndDateInput to recurrenceEndDateInput
      const recurrenceEndDateInput = screen.getByLabelText(/Repeat Until \(Optional\)/i); // Line 229
      fireEvent.change(recurrenceEndDateInput, { target: { value: '2024-08-31' } });

      const addSubTaskButton = screen.getByRole('button', { name: /Add Sub-task/i });
      await user.click(addSubTaskButton);
      await user.type(screen.getByPlaceholderText(/Sub-task title/i), 'Sub 1 for submit');

      const submitButton = screen.getByRole('button', { name: /Add Chore/i });
      await user.click(submitButton);

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

      expect(window.alert).toHaveBeenCalledWith('Chore added!');

      expect(screen.getByLabelText(/Title/i)).toHaveValue('');
      expect(screen.getByLabelText(/Description \(Optional\)/i)).toHaveValue('');
      expect(screen.getByLabelText(/Assign to \(Optional\)/i)).toHaveValue('');
      expect(screen.getByLabelText(/Repeats/i)).toHaveValue('none');
      expect(screen.queryByPlaceholderText(/Sub-task title/i)).not.toBeInTheDocument();
    });

    it('shows an alert if title is missing on submission', async () => {
      const user = userEvent.setup();
      renderFormComponent();

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

        const submitButton = screen.getByRole('button', { name: /Add Chore/i });
        await user.click(submitButton);

        expect(mockAddChoreDefinition).toHaveBeenCalledTimes(1);
        expect(mockAddChoreDefinition).toHaveBeenCalledWith({
            title: 'Minimal Chore',
            description: undefined,
            assignedKidId: undefined,
            dueDate: '2024-01-01', // Updated to mocked date
            rewardAmount: undefined,
            recurrenceType: null,
            recurrenceDay: null,
            recurrenceEndDate: null,
            tags: undefined,
            subTasks: undefined,
        });
        expect(window.alert).toHaveBeenCalledWith('Chore added!');
    });
  });
});