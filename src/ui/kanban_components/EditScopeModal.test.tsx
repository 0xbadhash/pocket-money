import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EditScopeModal from './EditScopeModal'; // Adjust path as necessary
import { describe, it, test, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

describe('EditScopeModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirmScope = vi.fn();

  const defaultProps = {
    isVisible: true,
    onClose: mockOnClose,
    onConfirmScope: mockOnConfirmScope,
    fieldName: 'due date',
    newValue: '2024-12-25',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('does not render when isVisible is false', () => {
    render(<EditScopeModal {...defaultProps} isVisible={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders correctly when isVisible is true', () => {
    render(<EditScopeModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Edit Scope')).toBeInTheDocument();
    // Custom text matcher for the paragraph due to dynamic content and whitespace
    const pElement = screen.getByText((content, node) => {
      const nodeText = node?.textContent || "";
      return node?.tagName.toLowerCase() === 'p' &&
        nodeText.includes("You've edited") &&
        nodeText.includes(defaultProps.fieldName!) &&
        nodeText.includes(`to "${defaultProps.newValue}"`) &&
        nodeText.includes(". Apply this change to:");
    });
    expect(pElement).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /This instance only/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /This and all future instances/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  test('renders default fieldName and newValue when props are not provided', () => {
    render(<EditScopeModal isVisible={true} onClose={mockOnClose} onConfirmScope={mockOnConfirmScope} />);
    expect(screen.getByText(/You've edited the field to the new value. Apply this change to:/i)).toBeInTheDocument();
  });

  test('renders newValue correctly even for numbers (e.g. reward)', () => {
    const propsWithNumber = {...defaultProps, fieldName:"reward", newValue: 10};
    render(<EditScopeModal {...propsWithNumber} />);
    const pElement = screen.getByText((content, node) => {
      const nodeText = node?.textContent || "";
      return node?.tagName.toLowerCase() === 'p' &&
        nodeText.includes("You've edited") &&
        nodeText.includes(propsWithNumber.fieldName!) &&
        nodeText.includes(`to "${propsWithNumber.newValue}"`) &&
        nodeText.includes(". Apply this change to:");
    });
    expect(pElement).toBeInTheDocument();
  });


  test('clicking "This instance only" button calls onConfirmScope with "instance"', () => {
    render(<EditScopeModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /This instance only/i }));
    expect(mockOnConfirmScope).toHaveBeenCalledWith('instance');
    expect(mockOnConfirmScope).toHaveBeenCalledTimes(1);
  });

  test('clicking "This and all future instances" button calls onConfirmScope with "series"', () => {
    render(<EditScopeModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /This and all future instances/i }));
    expect(mockOnConfirmScope).toHaveBeenCalledWith('series');
    expect(mockOnConfirmScope).toHaveBeenCalledTimes(1);
  });

  test('clicking "Cancel" button calls onClose', () => {
    render(<EditScopeModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('clicking overlay calls onClose (simulating modal dismiss)', () => {
    render(<EditScopeModal {...defaultProps} />);
    const dialogElement = screen.getByRole('dialog');
    fireEvent.click(dialogElement); // Click on the overlay part (assuming modalOverlayStyle is on the dialog's parent)
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
