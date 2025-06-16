import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EditScopeModal from './EditScopeModal'; // Adjust path as necessary
import { vi } from 'vitest';
import '@testing-library/jest-dom';

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
    const { container } = render(<EditScopeModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Confirm Edit Scope', level: 2 })).toBeInTheDocument();

    const pElement = container.querySelector('#edit-scope-modal-message');
    expect(pElement).toBeInTheDocument();
    expect(pElement).toHaveTextContent(`You've edited ${defaultProps.fieldName} to "${defaultProps.newValue}".`);
    // The <br /> might result in a space or just concatenation.
    // Testing the key parts is more robust:
    expect(pElement).toHaveTextContent("You've edited");
    expect(pElement).toHaveTextContent(defaultProps.fieldName!);
    expect(pElement).toHaveTextContent(`to "${defaultProps.newValue}"`);
    expect(pElement).toHaveTextContent("Apply this change to:");

    expect(screen.getByRole('button', { name: /This instance only/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /This and all future instances/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  test('renders default fieldName and newValue when props are not provided', () => {
    const { container } = render(<EditScopeModal isVisible={true} onClose={mockOnClose} onConfirmScope={mockOnConfirmScope} />);
    const pElement = container.querySelector('#edit-scope-modal-message');
    expect(pElement).toBeInTheDocument();
    // Default values are "the field" and "the new value"
    expect(pElement).toHaveTextContent(`You've edited the field to the new value.`);
    expect(pElement).toHaveTextContent("Apply this change to:");
  });

  test('renders newValue correctly even for numbers (e.g. reward)', () => {
    const propsWithNumber = {...defaultProps, fieldName:"reward", newValue: 10};
    const { container } = render(<EditScopeModal {...propsWithNumber} />);
    const pElement = container.querySelector('#edit-scope-modal-message');
    expect(pElement).toBeInTheDocument();
    expect(pElement).toHaveTextContent(`You've edited ${propsWithNumber.fieldName} to "${propsWithNumber.newValue}".`);
    expect(pElement).toHaveTextContent("Apply this change to:");
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
