import React from 'react';
import { render, screen, fireEvent, act as reactAct } from '../../../src/test-utils'; // Use customRender
import KidAssignmentModal from './KidAssignmentModal';
// Import hooks to mock
import { useUserContext } from '../../contexts/UserContext';
import { useChoresContext } from '../../contexts/ChoresContext';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import type { Kid } from '../../types';

const mockBatchAssignChoreDefinitionsToKid = vi.fn();
const mockUserKids: Kid[] = [
  { id: 'kid1', name: 'Kid One', age: 8, avatarFilename: 'avatar1.png', totalFunds: 10, kanbanColumnConfigs: [] },
  { id: 'kid2', name: 'Kid Two', age: 10, avatarFilename: 'avatar2.png', totalFunds: 20, kanbanColumnConfigs: [] },
];

// Mock the hooks
vi.mock('../../contexts/UserContext', async () => {
  const actual = await vi.importActual('../../contexts/UserContext') as any;
  return {
    ...actual,
    useUserContext: vi.fn(() => ({ // Default mock, can be overridden in tests
      user: {
        id: 'user1',
        username: 'Test User',
        email: 'test@example.com',
        kids: mockUserKids,
        settings: {}, createdAt: '', updatedAt: '',
      },
      loading: false, error: null, login: vi.fn(), logout: vi.fn(), updateUser: vi.fn(),
      addKid: vi.fn(() => 'new_kid_id'), updateKid: vi.fn(), deleteKid: vi.fn(),
      getKanbanColumnConfigs: vi.fn(() => []), addKanbanColumnConfig: vi.fn(async () => {}),
      updateKanbanColumnConfig: vi.fn(async () => {}), deleteKanbanColumnConfig: vi.fn(async () => {}),
      reorderKanbanColumnConfigs: vi.fn(async () => {}),
    })),
  };
});

vi.mock('../../contexts/ChoresContext', async () => {
  const actual = await vi.importActual('../../contexts/ChoresContext') as any;
  return {
    ...actual,
    useChoresContext: vi.fn(() => ({
      choreInstances: [],
      choreDefinitions: [],
      batchAssignChoreDefinitionsToKid: mockBatchAssignChoreDefinitionsToKid, // Use the spy here
      addChoreDefinition: vi.fn(),
      updateChoreDefinition: vi.fn(async () => {}),
      toggleChoreInstanceComplete: vi.fn(),
      getChoreDefinitionsForKid: vi.fn(() => []),
      generateInstancesForPeriod: vi.fn(),
      toggleSubtaskCompletionOnInstance: vi.fn(),
      toggleChoreDefinitionActiveState: vi.fn(),
      updateChoreInstanceCategory: vi.fn(),
      updateChoreInstanceField: vi.fn(async () => {}),
      batchToggleCompleteChoreInstances: vi.fn().mockResolvedValue({succeededCount:0, failedCount:0, succeededIds:[], failedIds:[]}),
      batchUpdateChoreInstancesCategory: vi.fn().mockResolvedValue({succeededCount:0, failedCount:0, succeededIds:[], failedIds:[]}),
      updateChoreSeries: vi.fn(async () => {}),
    })),
  };
});

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
    render(<KidAssignmentModal {...defaultProps} isVisible={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders correctly when isVisible is true', () => {
    render(<KidAssignmentModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Assign Chores to Kid', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    mockUserKids.forEach(kid => {
      expect(screen.getByRole('option', { name: kid.name })).toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: 'Unassign Chores' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm Assignment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  test('selecting a kid updates internal state and dropdown value', () => {
    render(<KidAssignmentModal {...defaultProps} />);
    const selectElement = screen.getByRole('combobox');

    fireEvent.change(selectElement, { target: { value: 'kid1' } });
    expect((selectElement as HTMLSelectElement).value).toBe('kid1');

    fireEvent.change(selectElement, { target: { value: 'UNASSIGNED' } });
    expect((selectElement as HTMLSelectElement).value).toBe('UNASSIGNED');
  });

  test('Confirm button is initially disabled, enabled after selection', () => {
    render(<KidAssignmentModal {...defaultProps} />);
    const confirmButton = screen.getByRole('button', { name: /Confirm Assignment/i });
    expect(confirmButton).toBeDisabled();

    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'kid1' } });
    expect(confirmButton).not.toBeDisabled();
  });

  test('Confirm button is disabled if selectedDefinitionIds is empty', () => {
    render(<KidAssignmentModal {...defaultProps} selectedDefinitionIds={[]} />);
    const confirmButton = screen.getByRole('button', { name: /Confirm Assignment/i });

    // Select a kid
    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'kid1' } });

    expect(confirmButton).toBeDisabled();
  });

  test('clicking "Confirm" calls batchAssign, onActionSuccess, and onClose with selected kid ID', async () => {
    mockBatchAssignChoreDefinitionsToKid.mockResolvedValueOnce({succeededCount: defaultSelectedDefinitionIds.length, failedCount: 0, succeededIds: defaultSelectedDefinitionIds, failedIds: []});
    render(<KidAssignmentModal {...defaultProps} />);

    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'kid1' } });

    const confirmButton = screen.getByRole('button', { name: /Confirm Assignment/i });
    await reactAct(async () => { // Use reactAct for async operations within tests
        fireEvent.click(confirmButton);
    });

    expect(mockBatchAssignChoreDefinitionsToKid).toHaveBeenCalledTimes(1);
    expect(mockBatchAssignChoreDefinitionsToKid).toHaveBeenCalledWith(defaultSelectedDefinitionIds, 'kid1');
    expect(mockOnActionSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('clicking "Confirm" calls batchAssign with null for "Unassign"', async () => {
    mockBatchAssignChoreDefinitionsToKid.mockResolvedValueOnce({succeededCount: defaultSelectedDefinitionIds.length, failedCount: 0, succeededIds: defaultSelectedDefinitionIds, failedIds: []});
    render(<KidAssignmentModal {...defaultProps} />);

    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'UNASSIGNED' } });

    const confirmButton = screen.getByRole('button', { name: /Confirm Assignment/i });
    await reactAct(async () => {
        fireEvent.click(confirmButton);
    });

    expect(mockBatchAssignChoreDefinitionsToKid).toHaveBeenCalledTimes(1);
    expect(mockBatchAssignChoreDefinitionsToKid).toHaveBeenCalledWith(defaultSelectedDefinitionIds, null);
    expect(mockOnActionSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // Removed test for alert when clicking confirm without selection,
  // Removed test for alert - now uses NotificationProvider.

  test('clicking "Cancel" calls onClose and not others', () => {
    render(<KidAssignmentModal {...defaultProps} />);
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockBatchAssignChoreDefinitionsToKid).not.toHaveBeenCalled();
    expect(mockOnActionSuccess).not.toHaveBeenCalled();
  });

  test('useEffect resets selection when modal becomes visible after being hidden', () => {
    const { rerender } = render(<KidAssignmentModal {...defaultProps} isVisible={false} />);
    let selectElement = screen.queryByRole('combobox') as HTMLSelectElement | null;
    expect(selectElement).toBeNull();

    // Make it visible
    rerender(<KidAssignmentModal {...defaultProps} isVisible={true} />);
    selectElement = screen.getByRole('combobox') as HTMLSelectElement;
    expect(selectElement.value).toBe("");

    // Select a kid
    fireEvent.change(selectElement, { target: { value: 'kid1' } });
    expect(selectElement.value).toBe('kid1');

    // Hide and re-show the modal
    rerender(<KidAssignmentModal {...defaultProps} isVisible={false} />);
    rerender(<KidAssignmentModal {...defaultProps} isVisible={true} />);
    selectElement = screen.getByRole('combobox') as HTMLSelectElement;
    expect(selectElement.value).toBe("");
  });
});
