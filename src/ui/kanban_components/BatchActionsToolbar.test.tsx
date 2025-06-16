import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BatchActionsToolbar from './BatchActionsToolbar';
import { describe, it, test, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

describe('BatchActionsToolbar Component', () => {
  const mockOnClearSelection = vi.fn();
  const mockOnOpenCategoryModal = vi.fn();
  const mockOnOpenKidAssignmentModal = vi.fn();
  const mockOnMarkComplete = vi.fn();
  const mockOnMarkIncomplete = vi.fn();

  const defaultProps = {
    selectedCount: 2,
    onClearSelection: mockOnClearSelection,
    onOpenCategoryModal: mockOnOpenCategoryModal,
    onOpenKidAssignmentModal: mockOnOpenKidAssignmentModal,
    onMarkComplete: mockOnMarkComplete,
    onMarkIncomplete: mockOnMarkIncomplete,
  };

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  test('renders correctly with selectedCount', () => {
    render(<BatchActionsToolbar {...defaultProps} />);
    // Text is "2 selected", split across elements, so match flexibly
    expect(screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' && content.startsWith(defaultProps.selectedCount.toString()) && content.includes('selected');
    })).toBeInTheDocument();
  });

  test('renders all action buttons', () => {
    render(<BatchActionsToolbar {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Clear Selection/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change Swimlane/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Assign to Kid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark as Complete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark as Incomplete/i })).toBeInTheDocument();
  });

  test('calls onClearSelection when "Clear Selection" button is clicked', () => {
    render(<BatchActionsToolbar {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Clear Selection/i }));
    expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
  });

  test('calls onOpenCategoryModal when "Change Swimlane/Category" button is clicked', () => {
    render(<BatchActionsToolbar {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Change Swimlane/i }));
    expect(mockOnOpenCategoryModal).toHaveBeenCalledTimes(1);
  });

  test('calls onOpenKidAssignmentModal when "Assign to Kid" button is clicked', () => {
    render(<BatchActionsToolbar {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Assign to Kid/i }));
    expect(mockOnOpenKidAssignmentModal).toHaveBeenCalledTimes(1);
  });

  test('calls onMarkComplete when "Mark as Complete" button is clicked', () => {
    render(<BatchActionsToolbar {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Mark as Complete/i }));
    expect(mockOnMarkComplete).toHaveBeenCalledTimes(1);
  });

  test('calls onMarkIncomplete when "Mark as Incomplete" button is clicked', () => {
    render(<BatchActionsToolbar {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Mark as Incomplete/i }));
    expect(mockOnMarkIncomplete).toHaveBeenCalledTimes(1);
  });

  // Optional: Test for selectedCount = 0.
  // The BatchActionsToolbar itself doesn't hide based on selectedCount;
  // its parent KidKanbanBoard decides whether to render it.
  // So, this test is just to ensure it renders text for 0 items if passed.
  test('renders null when selectedCount is 0', () => {
    const { container } = render(<BatchActionsToolbar {...defaultProps} selectedCount={0} />);
    // The component returns null when selectedCount is 0
    expect(container.firstChild).toBeNull();
  });
});
