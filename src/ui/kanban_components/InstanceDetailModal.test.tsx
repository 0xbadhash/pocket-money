import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import InstanceDetailModal from './InstanceDetailModal';
import { ChoresContext, ChoresContextType } from '../../contexts/ChoresContext';
import { UserContext, UserContextType } from '../../contexts/UserContext';
import { ChoreInstance, ChoreDefinition, User, Kid, KanbanColumnConfig, SubTask } from '../../types';

// Mock data
const mockChoreDefinition: ChoreDefinition = {
  id: 'def1',
  title: 'Test Chore Definition',
  description: 'This is a test definition description.',
  assignedKidId: 'kid1',
  dueDate: '2023-01-01', // Start date for recurrence
  rewardAmount: 5,
  isComplete: false, // Means active template
  recurrenceType: 'daily',
  tags: ['test', 'chore'],
  subTasks: [
    { id: 'st1', title: 'Subtask 1', isComplete: false },
    { id: 'st2', title: 'Subtask 2', isComplete: true },
  ],
  priority: 'Medium',
};

const mockChoreInstance: ChoreInstance = {
  id: 'inst1',
  choreDefinitionId: 'def1',
  instanceDate: '2023-10-26',
  isComplete: false,
  categoryStatus: 'col1', // statusId
  subtaskCompletions: { st1: false },
  priority: 'High',
  instanceDescription: 'This is an instance-specific description.',
  instanceComments: [
    { id: 'cmt1', userId: 'user1', userName: 'Tester', text: 'First comment', createdAt: new Date(2023, 9, 25, 10, 0, 0).toISOString() },
    { id: 'cmt2', userId: 'user2', userName: 'AnotherUser', text: 'Second comment, a bit longer to test wrapping and display.', createdAt: new Date(2023, 9, 26, 11, 30, 0).toISOString() },
  ],
  activityLog: [
    { timestamp: new Date(2023, 9, 26, 9, 0, 0).toISOString(), action: 'Created', userName: 'System' },
    { timestamp: new Date(2023, 9, 26, 10, 0, 0).toISOString(), action: 'Priority Changed', userName: 'Tester', details: 'to High' },
  ],
};

const mockKid: Kid = {
  id: 'kid1',
  name: 'Test Kid',
  kanbanColumnConfigs: [
    { id: 'col1', kidId: 'kid1', title: 'To Do', order: 0 },
    { id: 'col2', kidId: 'kid1', title: 'In Progress', order: 1 },
    { id: 'col3', kidId: 'kid1', title: 'Done', order: 2, isCompletedColumn: true },
  ],
};

const mockUser: User = {
  id: 'user1',
  username: 'TestUser',
  email: 'test@example.com',
  kids: [mockKid],
};

// Mock context providers
const mockUpdateChoreInstanceField = jest.fn();
const mockToggleSubtaskCompletionOnInstance = jest.fn();
const mockAddCommentToInstance = jest.fn();

const MockChoresProvider: React.FC<{ children: React.ReactNode, instance?: ChoreInstance }> = ({ children, instance }) => {
  const choresContextValue: Partial<ChoresContextType> = {
    updateChoreInstanceField: mockUpdateChoreInstanceField,
    toggleSubtaskCompletionOnInstance: mockToggleSubtaskCompletionOnInstance,
    addCommentToInstance: mockAddCommentToInstance,
    // Add other functions if needed by the modal directly, though most interactions are covered
  };
  return (
    <ChoresContext.Provider value={choresContextValue as ChoresContextType}>
      {children}
    </ChoresContext.Provider>
  );
};

const MockUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const userContextValue: Partial<UserContextType> = {
    user: mockUser,
    getKanbanColumnConfigs: (kidId: string) => {
      const kid = mockUser.kids.find(k => k.id === kidId);
      return kid?.kanbanColumnConfigs || [];
    },
  };
  return (
    <UserContext.Provider value={userContextValue as UserContextType}>
      {children}
    </UserContext.Provider>
  );
};

const renderModal = (props: Partial<React.ComponentProps<typeof InstanceDetailModal>>, instanceData = mockChoreInstance) => {
  const defaultProps: React.ComponentProps<typeof InstanceDetailModal> = {
    isOpen: true,
    onClose: jest.fn(),
    choreInstance: instanceData,
    choreDefinition: mockChoreDefinition,
    ...props,
  };
  return render(
    <MockUserProvider>
      <MockChoresProvider instance={instanceData}>
        <InstanceDetailModal {...defaultProps} />
      </MockChoresProvider>
    </MockUserProvider>
  );
};

describe('InstanceDetailModal', () => {
  beforeEach(() => {
    // Clear mock function calls before each test
    mockUpdateChoreInstanceField.mockClear();
    mockToggleSubtaskCompletionOnInstance.mockClear();
    mockAddCommentToInstance.mockClear();
  });

  test('does not render when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders correctly when isOpen is true', () => {
    renderModal({});
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(mockChoreDefinition.title)).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const onCloseMock = jest.fn();
    renderModal({ onClose: onCloseMock });
    fireEvent.click(screen.getByRole('button', { name: /×/i }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  describe('Information Display', () => {
    test('displays ChoreDefinition data', () => {
      renderModal({});
      expect(screen.getByText(mockChoreDefinition.title)).toBeInTheDocument();
      expect(screen.getByText(mockChoreDefinition.description!)).toBeInTheDocument();
      expect(screen.getByText(mockKid.name)).toBeInTheDocument(); // Assigned to
      mockChoreDefinition.tags?.forEach(tag => {
        expect(screen.getByText(tag)).toBeInTheDocument();
      });
    });

    test('displays ChoreInstance data', () => {
      renderModal({});
      // Date (ensure it's formatted - input value will be YYYY-MM-DD)
      expect(screen.getByDisplayValue(mockChoreInstance.instanceDate)).toBeInTheDocument();

      // Status
      const expectedStatus = mockKid.kanbanColumnConfigs?.find(col => col.id === mockChoreInstance.categoryStatus)?.title;
      expect(screen.getByText(expectedStatus!)).toBeInTheDocument();

      // Priority (select value)
      expect(screen.getByDisplayValue(mockChoreInstance.priority!)).toBeInTheDocument(); // 'High'

      // Instance Description (textarea value)
      expect(screen.getByDisplayValue(mockChoreInstance.instanceDescription!)).toBeInTheDocument();

      // Completed / Skipped are typically shown as 'Yes'/'No' or similar text
      expect(screen.getByText('Completed:')).toBeInTheDocument();
      expect(screen.getAllByText('No')[0]).toBeInTheDocument(); // First 'No' for Completed
      expect(screen.getByText('Skipped:')).toBeInTheDocument();
      expect(screen.getAllByText('No')[1]).toBeInTheDocument(); // Second 'No' for Skipped
    });
  });

  // Further tests will be added here for editing, sections, etc.
  // For now, this is a good starting point.
});

// Placeholder for more tests to be added incrementally
describe('InstanceDetailModal Editing', () => {
  test('updates instanceDate field', async () => {
    renderModal({});
    const dateInput = screen.getByDisplayValue(mockChoreInstance.instanceDate) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2023-10-27' } });
    expect(dateInput.value).toBe('2023-10-27');

    // Find the "Save Date" button - assuming unique save buttons. A more robust selector may be needed.
    const saveButtons = screen.getAllByRole('button', { name: /Save/i });
    const saveDateButton = saveButtons.find(btn => btn.textContent?.includes("Date"));
    expect(saveDateButton).toBeDefined();

    fireEvent.click(saveDateButton!);

    await waitFor(() => {
      expect(mockUpdateChoreInstanceField).toHaveBeenCalledWith(mockChoreInstance.id, 'instanceDate', '2023-10-27');
    });
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

   test('updates priority field to a specific value and then to default', async () => {
    renderModal({});
    const prioritySelect = screen.getByDisplayValue(mockChoreInstance.priority!) as HTMLSelectElement;

    // Change to "Low"
    fireEvent.change(prioritySelect, { target: { value: 'Low' } });
    expect(prioritySelect.value).toBe('Low');

    let saveButtons = screen.getAllByRole('button', { name: /Save/i });
    let savePriorityButton = saveButtons.find(btn => btn.textContent?.includes("Priority"));
    expect(savePriorityButton).toBeDefined();
    fireEvent.click(savePriorityButton!);

    await waitFor(() => {
      expect(mockUpdateChoreInstanceField).toHaveBeenCalledWith(mockChoreInstance.id, 'priority', 'Low');
    });
    expect(screen.getByText('Saved!')).toBeInTheDocument();
    mockUpdateChoreInstanceField.mockClear(); // Clear for next assertion

    // Change to "Default"
    fireEvent.change(prioritySelect, { target: { value: 'default' } });
    expect(prioritySelect.value).toBe('default');

    // Re-query save buttons if needed, though it should still be there
    saveButtons = screen.getAllByRole('button', { name: /Save/i });
    savePriorityButton = saveButtons.find(btn => btn.textContent?.includes("Priority"));
    fireEvent.click(savePriorityButton!);

    await waitFor(() => {
      expect(mockUpdateChoreInstanceField).toHaveBeenCalledWith(mockChoreInstance.id, 'priority', undefined); // 'default' maps to undefined
    });
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  test('updates instanceDescription field', async () => {
    renderModal({});
    const descriptionTextarea = screen.getByDisplayValue(mockChoreInstance.instanceDescription!) as HTMLTextAreaElement;

    fireEvent.change(descriptionTextarea, { target: { value: 'New instance description.' } });
    expect(descriptionTextarea.value).toBe('New instance description.');

    const saveDescriptionButton = screen.getByRole('button', { name: /Save Description/i });
    fireEvent.click(saveDescriptionButton);

    await waitFor(() => {
      expect(mockUpdateChoreInstanceField).toHaveBeenCalledWith(mockChoreInstance.id, 'instanceDescription', 'New instance description.');
    });
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });
});

describe('InstanceDetailModal Collapsible Sections', () => {
  test('Subtasks section toggles and shows correct count', () => {
    renderModal({});
    const subtaskHeader = screen.getByText(/Subtasks \(\d\/\d\)/); // Regex to match count
    expect(subtaskHeader).toBeInTheDocument();
    // Assuming it starts open, check for a subtask item
    expect(screen.getByText('Subtask 1')).toBeInTheDocument();

    fireEvent.click(subtaskHeader); // Close it
    expect(screen.queryByText('Subtask 1')).not.toBeInTheDocument();

    fireEvent.click(subtaskHeader); // Open it again
    expect(screen.getByText('Subtask 1')).toBeInTheDocument();
    expect(screen.getByText('Subtasks (1/2)')).toBeInTheDocument(); // 1 out of 2 complete from mock
  });

  test('Subtask completion toggles and disables correctly', async () => {
    renderModal({});
    const subtask1Checkbox = screen.getByLabelText('Subtask 1') as HTMLInputElement;
    expect(subtask1Checkbox.checked).toBe(false);

    fireEvent.click(subtask1Checkbox);
    await waitFor(() => {
      expect(mockToggleSubtaskCompletionOnInstance).toHaveBeenCalledWith(mockChoreInstance.id, 'st1');
    });

    // Test disabled state
    // Create a completed instance
    const completedInstance = { ...mockChoreInstance, isComplete: true };
    renderModal({ choreInstance: completedInstance }, completedInstance);
    const subtask1CheckboxCompleted = screen.getByLabelText('Subtask 1') as HTMLInputElement;
    expect(subtask1CheckboxCompleted).toBeDisabled();
  });

  test('Comments section toggles, shows count, and adds new comment', async () => {
    renderModal({});
    const commentsHeader = screen.getByText(/User Comments \(\d\)/);
    expect(commentsHeader).toBeInTheDocument();
    expect(screen.getByText('First comment')).toBeInTheDocument(); // Starts open

    fireEvent.click(commentsHeader); // Close
    expect(screen.queryByText('First comment')).not.toBeInTheDocument();
    fireEvent.click(commentsHeader); // Open
    expect(screen.getByText('First comment')).toBeInTheDocument();
    expect(screen.getByText('User Comments (2)')).toBeInTheDocument();

    // Add new comment
    const commentTextarea = screen.getByPlaceholderText('Add a comment...') as HTMLTextAreaElement;
    const addCommentButton = screen.getByRole('button', { name: /Add Comment/i });

    fireEvent.change(commentTextarea, { target: { value: 'A new test comment' } });
    expect(commentTextarea.value).toBe('A new test comment');
    fireEvent.click(addCommentButton);

    await waitFor(() => {
      expect(mockAddCommentToInstance).toHaveBeenCalledWith(mockChoreInstance.id, 'A new test comment', mockUser.id, mockUser.username);
    });
     expect(screen.getByText('Comment posted!')).toBeInTheDocument();
     expect(commentTextarea.value).toBe(''); // Textarea cleared
  });

  test('Activity Log section toggles and shows entries', () => {
    // Default isActivityLogOpen is false, so it should be closed initially
    renderModal({});
    const activityLogHeader = screen.getByText(/Activity Log \(\d\)/);
    expect(activityLogHeader).toBeInTheDocument();
    expect(screen.queryByText('Priority Changed')).not.toBeInTheDocument(); // Content hidden

    fireEvent.click(activityLogHeader); // Open it
    expect(screen.getByText('Priority Changed')).toBeInTheDocument();
    expect(screen.getByText('Activity Log (2)')).toBeInTheDocument();
    expect(screen.getByText(/System/i)).toBeInTheDocument(); // Part of an activity log entry

    fireEvent.click(activityLogHeader); // Close it again
    expect(screen.queryByText('Priority Changed')).not.toBeInTheDocument();
  });
});
