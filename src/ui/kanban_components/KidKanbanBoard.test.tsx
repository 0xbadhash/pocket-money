import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import KidKanbanBoard from './KidKanbanBoard';
import { useChoresContext, ChoresContextType } from '../../contexts/ChoresContext';
import { useUserContext, UserContextType } from '../../contexts/UserContext';
import type { ChoreInstance, ChoreDefinition, User, Kid, KanbanColumnConfig } from '../../types';

// --- Mocking Setup ---
let capturedDndOnDragEnd: ((event: any) => void) | null = null;
let mockOpenDetailModalPropCaptured: ((instance: ChoreInstance, definition: ChoreDefinition) => void) | null = null;

vi.mock('@dnd-kit/core', async () => {
  const actualDnd = await vi.importActual('@dnd-kit/core');
  return {
    ...actualDnd,
    DndContext: vi.fn(({ children, onDragEnd }) => {
      capturedDndOnDragEnd = onDragEnd;
      return <div data-testid="mock-dnd-context">{children}</div>;
    }),
    DragOverlay: vi.fn(({ children }) => <div data-testid="mock-drag-overlay">{children}</div>),
    useSensor: vi.fn(),
    useSensors: vi.fn(),
    PointerSensor: vi.fn(),
    KeyboardSensor: vi.fn(),
    closestCenter: vi.fn(),
  };
});

vi.mock('./DateColumnView', () => ({
  default: vi.fn((props) => {
    if (props.openDetailModal) {
      mockOpenDetailModalPropCaptured = props.openDetailModal;
    }
    // Simplified mock, focusing on capturing the prop
    return (
      <div data-testid={`mock-date-column-${props.date.toISOString().split('T')[0]}-${props.statusColumn.id}`}>
        {/* Simulate a card that can be "clicked" to open the modal */}
        {props.kidId === 'kid1' && props.statusColumn.id === 'todo' && props.date.toISOString().split('T')[0] === initialMockChoreInstances[0].instanceDate &&
          initialMockChoreInstances.filter(inst => inst.instanceDate === props.date.toISOString().split('T')[0] && inst.categoryStatus === props.statusColumn.id)
          .map(inst => {
            const def = initialMockChoreDefinitions.find(d => d.id === inst.choreDefinitionId);
            if (def) {
              return <button key={inst.id} data-testid={`mock-card-trigger-${inst.id}`} onClick={() => mockOpenDetailModalPropCaptured!(inst, def)}>Open Modal for {inst.id}</button>
            }
            return null;
          })
        }
      </div>
    );
  }),
}));

vi.mock('./AddChoreForm', () => ({
  default: vi.fn(() => <div data-testid="mock-add-chore-form">AddChoreForm</div>),
}));

// Mock InstanceDetailModal
const MockedInstanceDetailModal = vi.fn(() => <div data-testid="mock-instance-detail-modal">InstanceDetailModal</div>);
vi.mock('./InstanceDetailModal', () => ({
  default: MockedInstanceDetailModal,
}));


vi.mock('../../contexts/ChoresContext');
vi.mock('../../contexts/UserContext');

const mockGenerateInstancesForPeriod = vi.fn();
const mockUpdateChoreInstanceCategory = vi.fn();
const mockUpdateChoreInstanceField = vi.fn();
const mockGetDefinitionForInstance = vi.fn((inst: ChoreInstance) => initialMockChoreDefinitions.find(def => def.id === inst.choreDefinitionId));


const initialMockChoreDefinitions: ChoreDefinition[] = [
  { id: 'def1', title: 'Chore Def 1', description: "Def 1 Desc", assignedKidId: 'kid1', recurrenceType: 'daily', rewardAmount: 10, isComplete: false, subTasks: [] },
  { id: 'def2', title: 'Chore Def 2', description: "Def 2 Desc", assignedKidId: 'kid1', recurrenceType: 'daily', rewardAmount: 20, isComplete: false, subTasks: [] },
];
const initialMockChoreInstances: ChoreInstance[] = [
  { id: 'inst1', choreDefinitionId: 'def1', instanceDate: '2023-10-26', categoryStatus: 'todo', isComplete: false, subtaskCompletions: {} },
  { id: 'inst2', choreDefinitionId: 'def2', instanceDate: '2023-10-26', categoryStatus: 'inprogress', isComplete: false, subtaskCompletions: {} },
];

const mockKidOneKanbanColumns: KanbanColumnConfig[] = [
  { id: 'todo', kidId: 'kid1', title: 'To Do', order: 0, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
  { id: 'inprogress', kidId: 'kid1', title: 'In Progress', order: 1, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
  { id: 'completed', kidId: 'kid1', title: 'Completed', order: 2, isCompletedColumn: true, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
];

const mockUser: User = {
  id: 'user1',
  username: 'TestUser',
  email: 'test@example.com',
  kids: [{ id: 'kid1', name: 'Kid One', totalFunds: 0, kanbanColumnConfigs: mockKidOneKanbanColumns }],
};

describe('KidKanbanBoard', () => {
  let mockChoresContextValue: Partial<ChoresContextType>;
  let mockUserContextValue: Partial<UserContextType>;

  beforeEach(() => {
    vi.useFakeTimers();
    capturedDndOnDragEnd = null;
    mockOpenDetailModalPropCaptured = null;
    MockedInstanceDetailModal.mockClear();


    mockChoresContextValue = {
      choreDefinitions: [...initialMockChoreDefinitions],
      choreInstances: [...initialMockChoreInstances],
      generateInstancesForPeriod: mockGenerateInstancesForPeriod,
      updateChoreInstanceCategory: mockUpdateChoreInstanceCategory,
      updateChoreInstanceField: mockUpdateChoreInstanceField,
      getDefinitionForInstance: mockGetDefinitionForInstance,
      batchToggleCompleteChoreInstances: vi.fn(),
      batchUpdateChoreInstancesCategory: vi.fn(), // Added mock
      batchAssignChoreDefinitionsToKid: vi.fn(),   // Added mock
      // ensure all used context functions have mocks
    };
    (useChoresContext as vi.Mock).mockReturnValue(mockChoresContextValue);

    mockUserContextValue = {
      user: mockUser,
      getKanbanColumnConfigs: (kidId: string) => {
        if (kidId === 'kid1') return mockKidOneKanbanColumns;
        return [];
      }
    };
    (useUserContext as vi.Mock).mockReturnValue(mockUserContextValue);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  const renderBoard = (kidId = 'kid1') => {
    return render(<KidKanbanBoard kidId={kidId} />);
  };

  describe('Date Navigation', () => {
    it('calls generateInstancesForPeriod on initial render and when date changes', () => {
      renderBoard();
      expect(mockGenerateInstancesForPeriod).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByText('Day >'));
      expect(mockGenerateInstancesForPeriod).toHaveBeenCalledTimes(2);
    });
  });

  describe('Drag-and-Drop (handleDragEnd)', () => {
    beforeEach(() => {
      renderBoard();
      expect(capturedDndOnDragEnd).not.toBeNull();
    });

    it('calls updateChoreInstanceCategory when category changes', () => {
      const active = { id: 'inst1' };
      const over = { id: `2023-10-26|inprogress` };

      act(() => { capturedDndOnDragEnd!({ active, over }); });

      expect(mockUpdateChoreInstanceCategory).toHaveBeenCalledWith('inst1', 'inprogress');
      expect(mockUpdateChoreInstanceField).not.toHaveBeenCalled();
    });

    it('calls updateChoreInstanceField when date changes', () => {
        const active = { id: 'inst1' }; // Original: date 2023-10-26, status todo
        const over = { id: `2023-10-27|todo` }; // Target date, original category

        act(() => { capturedDndOnDragEnd!({ active, over }); });

        expect(mockUpdateChoreInstanceField).toHaveBeenCalledWith('inst1', 'instanceDate', '2023-10-27');
        // Check if categoryChanged is false
        const instance = initialMockChoreInstances.find(i => i.id === 'inst1');
        const targetStatusId = 'todo';
        if (instance?.categoryStatus === targetStatusId) {
            expect(mockUpdateChoreInstanceCategory).not.toHaveBeenCalled();
        } else {
            // This case should not happen if logic is correct and date is the only thing changing
            expect(mockUpdateChoreInstanceCategory).toHaveBeenCalledWith('inst1', targetStatusId);
        }
      });

    it('calls both update functions if date and category change', () => {
      const active = { id: 'inst1' };
      const over = { id: `2023-10-27|completed` };

      act(() => { capturedDndOnDragEnd!({ active, over }); });

      expect(mockUpdateChoreInstanceField).toHaveBeenCalledWith('inst1', 'instanceDate', '2023-10-27');
      expect(mockUpdateChoreInstanceCategory).toHaveBeenCalledWith('inst1', 'completed');
    });

    it('sets feedback message on successful drag', async () => {
      const active = { id: 'inst1' };
      const over = { id: `2023-10-26|inprogress` };

      await act(async () => { capturedDndOnDragEnd!({ active, over }); });

      expect(screen.getByText(/Chore Def 1 moved to In Progress/i)).toBeInTheDocument();
      await act(async () => { vi.advanceTimersByTime(3000); });
      expect(screen.queryByText(/Chore Def 1 moved to In Progress/i)).not.toBeInTheDocument();
    });
  });

  describe('Add Chore Modal', () => {
    it('shows AddChoreForm modal when "Assign New Chore" is clicked', async () => {
      renderBoard();
      const assignButton = screen.getByRole('button', { name: /\+ Assign New Chore/i });
      await userEvent.click(assignButton);
      expect(screen.getByTestId('mock-add-chore-form')).toBeInTheDocument();
    });
  });

  describe('Instance Detail Modal Interaction', () => {
    it('initializes with detail modal closed', () => {
      renderBoard();
      // InstanceDetailModal mock is initially not called or called with isOpen: false
      // Check if it's NOT in the document OR if it IS but with isOpen: false
      // If it's conditionally rendered (null when !isOpen), then queryByTestId is appropriate.
      expect(screen.queryByTestId("mock-instance-detail-modal")).toBeNull();
    });

    it('opens detail modal with correct data when a card interaction triggers openDetailModal', () => {
      renderBoard();
      expect(mockOpenDetailModalPropCaptured).toBeInstanceOf(Function); // Ensure it was captured

      const testInstance = initialMockChoreInstances[0];
      const testDefinition = initialMockChoreDefinitions.find(d => d.id === testInstance.choreDefinitionId)!;

      // Simulate the call that would happen inside a child component
      act(() => {
        mockOpenDetailModalPropCaptured!(testInstance, testDefinition);
      });

      // Check if InstanceDetailModal's mock was called with the correct props
      expect(MockedInstanceDetailModal).toHaveBeenCalled();
      const lastCallProps = MockedInstanceDetailModal.mock.calls[MockedInstanceDetailModal.mock.calls.length - 1][0];
      expect(lastCallProps.isOpen).toBe(true);
      expect(lastCallProps.choreInstance).toEqual(testInstance);
      expect(lastCallProps.choreDefinition).toEqual(testDefinition);
      expect(screen.getByTestId("mock-instance-detail-modal")).toBeInTheDocument();
    });

    it('simulates opening via a card click and checks modal props', () => {
        renderBoard();
        // Find the specific button that simulates opening the modal for 'inst1'
        const cardTriggerButton = screen.getByTestId('mock-card-trigger-inst1');
        fireEvent.click(cardTriggerButton);

        expect(MockedInstanceDetailModal).toHaveBeenCalled();
        const lastCallProps = MockedInstanceDetailModal.mock.calls[MockedInstanceDetailModal.mock.calls.length - 1][0];
        expect(lastCallProps.isOpen).toBe(true);
        expect(lastCallProps.choreInstance).toEqual(initialMockChoreInstances[0]);
        expect(lastCallProps.choreDefinition).toEqual(initialMockChoreDefinitions[0]);
        expect(screen.getByTestId("mock-instance-detail-modal")).toBeInTheDocument();
      });

    it('closes detail modal when onClose is called from the modal', () => {
      renderBoard();

      // 1. Open the modal first (e.g. by simulating card click)
      const cardTriggerButton = screen.getByTestId('mock-card-trigger-inst1');
      fireEvent.click(cardTriggerButton);

      expect(MockedInstanceDetailModal).toHaveBeenCalled();
      let lastCallProps = MockedInstanceDetailModal.mock.calls[MockedInstanceDetailModal.mock.calls.length - 1][0];
      expect(lastCallProps.isOpen).toBe(true);

      // 2. Simulate onClose call from the modal
      act(() => {
        lastCallProps.onClose();
      });

      // Check the *next* call to InstanceDetailModal (or lack thereof if unmounted)
      // If the modal is always in the DOM and controlled by isOpen:
      lastCallProps = MockedInstanceDetailModal.mock.calls[MockedInstanceDetailModal.mock.calls.length - 1][0];
      expect(lastCallProps.isOpen).toBe(false);
      // If it unmounts, then queryByTestId should be null after the onClose call and re-render
      // For this test, we assume it's always rendered and controlled by isOpen
    });
  });
});
