import React from 'react';
import { render, screen, fireEvent, act as reactAct } from '@testing-library/react'; // Renamed act to avoid conflict
import KidAssignmentModal from './KidAssignmentModal';
import { UserContext, UserContextType } from '../../contexts/UserContext';
import { ChoresContext, ChoresContextType } from '../../contexts/ChoresContext';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import type { Kid } from '../../types';

const mockBatchAssignChoreDefinitionsToKid = vi.fn();
const mockUserKids: Kid[] = [
  { id: 'kid1', name: 'Kid One', age: 8, avatarFilename: 'avatar1.png', totalFunds: 10, kanbanColumnConfigs: [] },
  { id: 'kid2', name: 'Kid Two', age: 10, avatarFilename: 'avatar2.png', totalFunds: 20, kanbanColumnConfigs: [] },
];

const mockUserContextValue: Partial<UserContextType> = {
  user: {
    id: 'user1',
    username: 'Test User',
    email: 'test@example.com',
    kids: mockUserKids,
    // settings, createdAt, updatedAt can be added if needed by component
  },
  // Other UserContext fields can be mocked if used by the component
};

const mockChoresContextValue: Partial<ChoresContextType> = {
  batchAssignChoreDefinitionsToKid: mockBatchAssignChoreDefinitionsToKid,
};

// Helper to wrap component with context providers
const renderWithContexts = (ui: React.ReactElement) => {
  return render(
    <UserContext.Provider value={mockUserContextValue as UserContextType}>
      <ChoresContext.Provider value={mockChoresContextValue as ChoresContextType}>
        {ui}
      </ChoresContext.Provider>
    </UserContext.Provider>
  );
};

describe('KidAssignmentModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnActionSuccess = vi.fn();
  const defaultSelectedDefinitionIds = ['defId1', 'defId2'];

  const defaultProps = {
    isVisible: true,
    onClose: mockOnClose,
    onActionSuccess: mockOnActionSuccess,
    selectedDefinitionIds: defaultSelectedDefinitionIds,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('does not render when isVisible is false', () => {
    renderWithContexts(<KidAssignmentModal {...defaultProps} isVisible={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders correctly when isVisible is true', () => {
    renderWithContexts(<KidAssignmentModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Assign to Kid')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument(); // The select element
    mockUserKids.forEach(kid => {
      expect(screen.getByRole('option', { name: kid.name })).toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: 'Unassign' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  test('selecting a kid updates internal state and dropdown value', () => {
    renderWithContexts(<KidAssignmentModal {...defaultProps} />);
    const selectElement = screen.getByRole('combobox');

    fireEvent.change(selectElement, { target: { value: 'kid1' } });
    expect((selectElement as HTMLSelectElement).value).toBe('kid1');

    fireEvent.change(selectElement, { target: { value: 'UNASSIGNED' } });
    expect((selectElement as HTMLSelectElement).value).toBe('UNASSIGNED');
  });

  test('Confirm button is initially disabled, enabled after selection', () => {
    renderWithContexts(<KidAssignmentModal {...defaultProps} />);
    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    expect(confirmButton).toBeDisabled();

    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'kid1' } });
    expect(confirmButton).not.toBeDisabled();
  });

  test('Confirm button is disabled if selectedDefinitionIds is empty', () => {
    renderWithContexts(<KidAssignmentModal {...defaultProps} selectedDefinitionIds={[]} />);
    const confirmButton = screen.getByRole('button', { name: /Confirm/i });

    // Select a kid
    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'kid1' } });

    expect(confirmButton).toBeDisabled(); // Still disabled due to empty selectedDefinitionIds
  });

  test('clicking "Confirm" calls batchAssign, onActionSuccess, and onClose with selected kid ID', async () => {
    mockBatchAssignChoreDefinitionsToKid.mockResolvedValueOnce(undefined);
    renderWithContexts(<KidAssignmentModal {...defaultProps} />);

    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'kid1' } });

    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    await reactAct(async () => { // Use reactAct for async operations within tests
        fireEvent.click(confirmButton);
    });

    expect(mockBatchAssignChoreDefinitionsToKid).toHaveBeenCalledTimes(1);
    expect(mockBatchAssignChoreDefinitionsToKid).toHaveBeenCalledWith(defaultSelectedDefinitionIds, 'kid1');
    expect(mockOnActionSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('clicking "Confirm" calls batchAssign with null for "Unassign"', async () => {
    mockBatchAssignChoreDefinitionsToKid.mockResolvedValueOnce(undefined);
    renderWithContexts(<KidAssignmentModal {...defaultProps} />);

    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'UNASSIGNED' } });

    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    await reactAct(async () => {
        fireEvent.click(confirmButton);
    });

    expect(mockBatchAssignChoreDefinitionsToKid).toHaveBeenCalledTimes(1);
    expect(mockBatchAssignChoreDefinitionsToKid).toHaveBeenCalledWith(defaultSelectedDefinitionIds, null);
    expect(mockOnActionSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // Removed test for alert when clicking confirm without selection,
  // as the button should be disabled, and that disabled state is tested elsewhere.
  // The alert is a defensive measure in code but not reachable via user click if disabled logic is correct.

  test('clicking "Cancel" calls onClose and not others', () => {
    renderWithContexts(<KidAssignmentModal {...defaultProps} />);
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockBatchAssignChoreDefinitionsToKid).not.toHaveBeenCalled();
    expect(mockOnActionSuccess).not.toHaveBeenCalled();
  });

  test('useEffect resets selection when modal becomes visible after being hidden', () => {
    const { rerender } = renderWithContexts(<KidAssignmentModal {...defaultProps} isVisible={false} />);
    let selectElement = screen.queryByRole('combobox') as HTMLSelectElement | null;
    expect(selectElement).toBeNull(); // Not visible

    // Make it visible
    rerender(
      <UserContext.Provider value={mockUserContextValue as UserContextType}>
        <ChoresContext.Provider value={mockChoresContextValue as ChoresContextType}>
          <KidAssignmentModal {...defaultProps} isVisible={true} />
        </ChoresContext.Provider>
      </UserContext.Provider>
    );
    selectElement = screen.getByRole('combobox') as HTMLSelectElement;
    expect(selectElement.value).toBe(""); // Initial value after becoming visible

    // Select a kid
    fireEvent.change(selectElement, { target: { value: 'kid1' } });
    expect(selectElement.value).toBe('kid1');

    // Hide and re-show the modal
    rerender(
      <UserContext.Provider value={mockUserContextValue as UserContextType}>
        <ChoresContext.Provider value={mockChoresContextValue as ChoresContextType}>
          <KidAssignmentModal {...defaultProps} isVisible={false} />
        </ChoresContext.Provider>
      </UserContext.Provider>
    );
     rerender(
      <UserContext.Provider value={mockUserContextValue as UserContextType}>
        <ChoresContext.Provider value={mockChoresContextValue as ChoresContextType}>
          <KidAssignmentModal {...defaultProps} isVisible={true} />
        </ChoresContext.Provider>
      </UserContext.Provider>
    );
    selectElement = screen.getByRole('combobox') as HTMLSelectElement;
    expect(selectElement.value).toBe(""); // Should be reset
  });
});
