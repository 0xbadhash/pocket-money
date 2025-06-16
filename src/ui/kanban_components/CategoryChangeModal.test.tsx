import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CategoryChangeModal from './CategoryChangeModal';
import { ChoresContext, ChoresContextType } from '../../contexts/ChoresContext';
import { describe, it, test, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import type { MatrixKanbanCategory } from '../../types';

const mockBatchUpdateChoreInstancesCategory = vi.fn();

const mockChoresContextValue: Partial<ChoresContextType> = {
  batchUpdateChoreInstancesCategory: mockBatchUpdateChoreInstancesCategory,
};

// Helper to wrap component with context provider
const renderWithContext = (ui: React.ReactElement) => {
  return render(
    <ChoresContext.Provider value={mockChoresContextValue as ChoresContextType}>
      {ui}
    </ChoresContext.Provider>
  );
};

describe('CategoryChangeModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnActionSuccess = vi.fn();
  const defaultCategories: MatrixKanbanCategory[] = ['TO_DO', 'IN_PROGRESS', 'COMPLETED'];
  const defaultSelectedInstanceIds = ['id1', 'id2'];

  const defaultProps = {
    isVisible: true,
    onClose: mockOnClose,
    onActionSuccess: mockOnActionSuccess,
    selectedInstanceIds: defaultSelectedInstanceIds,
    categories: defaultCategories,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('does not render when isVisible is false', () => {
    renderWithContext(<CategoryChangeModal {...defaultProps} isVisible={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders correctly when isVisible is true', () => {
    renderWithContext(<CategoryChangeModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Select New Swimlane/Category')).toBeInTheDocument();
    defaultCategories.forEach(cat => {
      expect(screen.getByRole('button', { name: cat.replace('_', ' ') })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  test('clicking a category button updates internal selection and button style', () => {
    renderWithContext(<CategoryChangeModal {...defaultProps} />);
    const todoButton = screen.getByRole('button', { name: /TO DO/i });
    const inProgressButton = screen.getByRole('button', { name: /IN PROGRESS/i });

    // Check initial style (assuming default is not selected style)
    expect(todoButton).toHaveStyle('background-color: #f0f0f0'); // Example non-selected style

    fireEvent.click(todoButton);
    // Check TO_DO button is styled as selected
    expect(todoButton).toHaveStyle('background-color: #4CAF50'); // Example selected style
    expect(inProgressButton).toHaveStyle('background-color: #f0f0f0');


    fireEvent.click(inProgressButton);
    // Check IN_PROGRESS button is styled as selected, TO_DO is not
    expect(inProgressButton).toHaveStyle('background-color: #4CAF50');
    expect(todoButton).toHaveStyle('background-color: #f0f0f0');
  });

  test('Confirm button is initially disabled if no category selected, enabled after selection', () => {
    renderWithContext(<CategoryChangeModal {...defaultProps} />);
    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    expect(confirmButton).toBeDisabled();

    const todoButton = screen.getByRole('button', { name: /TO DO/i });
    fireEvent.click(todoButton);
    expect(confirmButton).not.toBeDisabled();
  });

  test('Confirm button is disabled if selectedInstanceIds is empty', () => {
    renderWithContext(<CategoryChangeModal {...defaultProps} selectedInstanceIds={[]} />);
    const confirmButton = screen.getByRole('button', { name: /Confirm/i });

    // Select a category
    const todoButton = screen.getByRole('button', { name: /TO DO/i });
    fireEvent.click(todoButton);

    expect(confirmButton).toBeDisabled(); // Still disabled due to empty selectedInstanceIds
  });


  test('clicking "Confirm" calls batchUpdate, onActionSuccess, and onClose', async () => {
    mockBatchUpdateChoreInstancesCategory.mockResolvedValueOnce(undefined); // Mock successful promise
    renderWithContext(<CategoryChangeModal {...defaultProps} />);

    const todoButton = screen.getByRole('button', { name: /TO DO/i });
    fireEvent.click(todoButton); // Select 'TO_DO'

    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    expect(mockBatchUpdateChoreInstancesCategory).toHaveBeenCalledTimes(1);
    expect(mockBatchUpdateChoreInstancesCategory).toHaveBeenCalledWith(defaultSelectedInstanceIds, 'TO_DO');
    expect(mockOnActionSuccess).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // Removed test for alert when clicking confirm without selection,
  // as the button should be disabled, and that disabled state is tested elsewhere.
  // The alert is a defensive measure in code but not reachable via user click if disabled logic is correct.

  test('clicking "Cancel" calls onClose and not others', () => {
    renderWithContext(<CategoryChangeModal {...defaultProps} />);
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockBatchUpdateChoreInstancesCategory).not.toHaveBeenCalled();
    expect(mockOnActionSuccess).not.toHaveBeenCalled();
  });

  test('clicking overlay calls onClose (simulating modal dismiss)', () => {
    renderWithContext(<CategoryChangeModal {...defaultProps} />);
    // The dialog itself is the overlay in this structure due to how it's styled
    const dialogElement = screen.getByRole('dialog');
    fireEvent.click(dialogElement); // Click on the overlay part

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockBatchUpdateChoreInstancesCategory).not.toHaveBeenCalled();
    expect(mockOnActionSuccess).not.toHaveBeenCalled();
  });
});
