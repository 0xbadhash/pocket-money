import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import KidKanbanBoard from './KidKanbanBoard';
import { useChoresContext } from '../../contexts/ChoresContext';
import { useUserContext } from '../../contexts/UserContext';
import type { ChoreInstance, ChoreDefinition, MatrixKanbanCategory, User, Kid } from '../../types';
import { DndContext } from '@dnd-kit/core'; // Import DndContext for wrapping

// Mock DateColumnView
vi.mock('./DateColumnView', () => ({
  default: vi.fn((props) => (
    <div data-testid={`mock-date-column-${props.date.toISOString().split('T')[0]}-${props.category}`} data-date={props.date.toISOString().split('T')[0]} data-category={props.category}>
      DateColumnView ({props.date.toISOString().split('T')[0]} - {props.category})
    </div>
  )),
}));

// Mock AddChoreForm
vi.mock('../../components/AddChoreForm', () => ({
  default: vi.fn(() => <div data-testid="mock-add-chore-form">AddChoreForm</div>),
}));


// Mock context hooks
vi.mock('../../contexts/ChoresContext');
vi.mock('../../contexts/UserContext');

const mockGenerateInstancesForPeriod = vi.fn();
const mockUpdateChoreInstanceCategory = vi.fn();
const mockUpdateChoreInstanceField = vi.fn();
const mockBatchToggleComplete = vi.fn();
const mockBatchUpdateCategory = vi.fn();
const mockBatchAssign = vi.fn();

const initialMockChoreDefinitions: ChoreDefinition[] = [
  { id: 'def1', title: 'Chore Def 1', assignedKidId: 'kid1', recurrenceType: 'daily', pointValue: 10, isComplete: false, enableSubtasks: false, subtasks: [] },
  { id: 'def2', title: 'Chore Def 2', assignedKidId: 'kid1', recurrenceType: 'daily', pointValue: 20, isComplete: false, enableSubtasks: false, subtasks: [] },
];
const initialMockChoreInstances: ChoreInstance[] = [
  { id: 'inst1', choreDefinitionId: 'def1', instanceDate: '2023-10-26', categoryStatus: 'TO_DO', isCompleted: false },
  { id: 'inst2', choreDefinitionId: 'def2', instanceDate: '2023-10-26', categoryStatus: 'IN_PROGRESS', isCompleted: false },
];

const mockUser: User = {
  id: 'user1',
  username: 'TestUser',
  email: 'test@example.com',
  kids: [{ id: 'kid1', name: 'Kid One', totalFunds: 0, kanbanColumnConfigs: [] }],
  settings: { theme: 'light' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DndContext onDragEnd={() => {}}>
    {children}
  </DndContext>
);


describe('KidKanbanBoard', () => {
  let mockChoresContextValue: any;
  let mockUserContextValue: any;

  beforeEach(() => {
    vi.useFakeTimers(); // Use fake timers for testing timeouts (e.g., feedback message)

    mockChoresContextValue = {
      choreDefinitions: [...initialMockChoreDefinitions],
      choreInstances: [...initialMockChoreInstances],
      generateInstancesForPeriod: mockGenerateInstancesForPeriod,
      updateChoreInstanceCategory: mockUpdateChoreInstanceCategory,
      updateChoreInstanceField: mockUpdateChoreInstanceField,
      batchToggleCompleteChoreInstances: mockBatchToggleComplete,
      batchUpdateChoreInstancesCategory: mockBatchUpdateCategory,
      batchAssignChoreDefinitionsToKid: mockBatchAssign,
    };
    (useChoresContext as vi.Mock).mockReturnValue(mockChoresContextValue);

    mockUserContextValue = {
      user: mockUser,
      loading: false,
      error: null,
      // Add other functions if KidKanbanBoard starts using them
    };
    (useUserContext as vi.Mock).mockReturnValue(mockUserContextValue);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // Restore real timers
  });

  const renderBoard = (kidId = 'kid1') => {
    return render(
      <TestWrapper>
        <KidKanbanBoard kidId={kidId} />
      </TestWrapper>
    );
  };

  describe('Matrix Layout Rendering', () => {
    it('renders the correct number of DateColumnView components (7 days * 3 categories)', () => {
      renderBoard();
      const dateColumnViews = screen.getAllByText(/DateColumnView/);
      expect(dateColumnViews.length).toBe(7 * 3); // 7 days, 3 status categories
    });

    it('calls DateColumnView with correct date and category props for each cell', () => {
      renderBoard();
      const expectedCategories: MatrixKanbanCategory[] = ["TO_DO", "IN_PROGRESS", "COMPLETED"];
      const today = new Date();
      today.setHours(0,0,0,0);

      for (let i = 0; i < 7; i++) {
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() + i);
        const dateString = expectedDate.toISOString().split('T')[0];

        expectedCategories.forEach(category => {
          const testId = `mock-date-column-${dateString}-${category}`;
          const columnView = screen.getByTestId(testId);
          expect(columnView).toBeInTheDocument();
          expect(columnView).toHaveAttribute('data-date', dateString);
          expect(columnView).toHaveAttribute('data-category', category);
        });
      }
    });

    it('passes the correct kidId prop to DateColumnView components', () => {
      const testKidId = 'kidTest123';
      renderBoard(testKidId);
      // Assuming DateColumnView mock would receive kidId and we could check it,
      // for now, this is implicitly tested by filtering logic within DateColumnView.
      // To explicitly test, the mock DateColumnView would need to display/store the kidId prop.
      // For this test, we'll assume the structure and previous DateColumnView tests cover kidId usage.
      // A more direct way:
      const DateColumnViewMock = vi.mocked(require('./DateColumnView').default);
      expect(DateColumnViewMock.mock.calls[0][0].kidId).toBe(testKidId);
    });
  });

  describe('Date Navigation', () => {
    it('calls generateInstancesForPeriod on initial render and when date changes', () => {
      renderBoard();
      // Initial call for the default visible week
      expect(mockGenerateInstancesForPeriod).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('Day >'));
      // Called again for the new period
      expect(mockGenerateInstancesForPeriod).toHaveBeenCalledTimes(2);
    });

    it('updates displayed dates when "Next Day" is clicked', () => {
      renderBoard();
      const initialToday = new Date();
      initialToday.setHours(0,0,0,0);
      const initialTodayString = initialToday.toISOString().split('T')[0];
      expect(screen.getByTestId(`mock-date-column-${initialTodayString}-TO_DO`)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Day >'));

      const tomorrow = new Date(initialToday);
      tomorrow.setDate(initialToday.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      expect(screen.queryByTestId(`mock-date-column-${initialTodayString}-TO_DO`)).not.toBeInTheDocument();
      expect(screen.getByTestId(`mock-date-column-${tomorrowString}-TO_DO`)).toBeInTheDocument();
    });

    it('updates displayed dates when "Previous Week" is clicked', () => {
      renderBoard();
      const initialToday = new Date();
      initialToday.setHours(0,0,0,0);

      fireEvent.click(screen.getByText('< Week'));

      const sevenDaysAgo = new Date(initialToday);
      sevenDaysAgo.setDate(initialToday.getDate() - 7);
      const sevenDaysAgoString = sevenDaysAgo.toISOString().split('T')[0];

      expect(screen.getByTestId(`mock-date-column-${sevenDaysAgoString}-TO_DO`)).toBeInTheDocument();
    });

    it('updates to today when "Today" is clicked', () => {
      renderBoard();
      // First, navigate away from today
      fireEvent.click(screen.getByText('Day >'));
      fireEvent.click(screen.getByText('Day >'));

      const today = new Date();
      today.setHours(0,0,0,0);
      const todayString = today.toISOString().split('T')[0];

      // Check that we are not on today initially after navigation
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(today.getDate() + 2);
      expect(screen.getByTestId(`mock-date-column-${dayAfterTomorrow.toISOString().split('T')[0]}-TO_DO`)).toBeInTheDocument();


      fireEvent.click(screen.getByText('Today'));
      expect(screen.getByTestId(`mock-date-column-${todayString}-TO_DO`)).toBeInTheDocument();
    });
  });

  describe('Drag-and-Drop (handleDragEnd)', () => {
    // Accessing handleDragEnd directly is tricky as it's within DndContext.
    // We will test its effects by checking if the context update functions are called.
    // A more direct test of handleDragEnd would involve exporting it or a more complex DND setup.
    // This helper function tries to get the props of the KidKanbanBoard component from the rendered output.
    // It assumes KidKanbanBoard is a direct child of the DndContext provider in this test setup.
    const getKidKanbanBoardPropsFromWrapper = (wrapper: HTMLElement) => {
       // The structure might be DndContext -> KidKanbanBoard directly, or DndContext -> SomeInternalWrapper -> KidKanbanBoard
       // This depends on how DndContext is implemented and if it adds layers.
       // For this test, we are wrapping KidKanbanBoard directly in DndContext via TestWrapper.
       // The 'props' are not directly on the DOM element, but on the React component instance.
       // Testing library doesn't give direct access to component instances' props after rendering.
       // So, we'll rely on the onDragEnd prop of the DndContext wrapper we created.

       // To test onDragEnd, we need to simulate DndContext calling it.
       // We can't directly call handleDragEnd on KidKanbanBoard instance easily.
       // Instead, we find the DndContext and simulate its onDragEnd.
       // The following approach is a conceptual placeholder for how one might try to get internal props,
       // but it's not how testing library works for props of deeply nested components.
       // console.log(wrapper.querySelector('.kid-kanban-board')); // This would be the div, not the component instance
       // For this test, we will grab the onDragEnd from the DndContext wrapper we provide.
       // This is a bit of an integration test for onDragEnd.

       // This is a simplified way for this test, assuming TestWrapper's DndContext directly passes its onDragEnd
       // to an internal handler that would be KidKanbanBoard's handleDragEnd.
       // In reality, DndContext uses its own internal mechanisms.

       // The KidKanbanBoard's handleDragEnd is passed to DndContext as a prop.
       // We need to find the props of the DndContext component in our TestWrapper.
       // This is not straightforward with RTL.
       // A better way is to make `handleDragEnd` a prop of a testable component or export it.
       // Given the current structure, we'll assume `TestWrapper`'s `onDragEnd` is effectively `KidKanbanBoard`'s `handleDragEnd`
       // if `KidKanbanBoard` was directly passing its `handleDragEnd` to `DndContext`.

       // Let's refine the approach: The KidKanbanBoard itself is wrapped in DndContext.
       // The handleDragEnd is a prop of DndContext.
       // We need to find the props of the DndContext component.
       // This is still not straightforward.
       // The most effective way is to get the DndContext's onDragEnd prop from the *rendered component tree*
       // which is not directly possible.
       // So, we will make a slight modification to TestWrapper to capture the onDragEnd passed to DndContext
       // if KidKanbanBoard itself was rendering DndContext.
       // But KidKanbanBoard *is* the component whose handleDragEnd we want to test.
       // KidKanbanBoard *renders* DndContext. So we need to get the props of that DndContext.

      // The DndContext is rendered *inside* KidKanbanBoard.
      // The `getDndContextImpl` from the previous attempt was closer but still not quite right.
      // Let's assume we test the onDragEnd prop of the DndContext that KidKanbanBoard renders.
      // This requires KidKanbanBoard to be structured such that we can extract this.
      // The easiest way is to mock DndContext itself to see what props it received.
      // However, we already wrapped KidKanbanBoard in DndContext for the test.
      // The `handleDragEnd` is defined inside KidKanbanBoard and passed to the DndContext it renders.

      // The most pragmatic way here is to assume `KidKanbanBoard`'s internal `handleDragEnd` is called
      // by the `DndContext` it renders. We can't easily "spy" on that internal `handleDragEnd` directly
      // without exporting it or making it a prop.
      // The provided solution for `KidKanbanBoard.test.tsx` from previous step had:
      // const kidKanbanBoardProps = getDndContextImpl(container.firstChild as any);
      // act(() => { kidKanbanBoardProps.onDragEnd({ active, over, delta: {x:0, y:0} }); });
      // This implies that `getDndContextImpl` could extract the `onDragEnd` prop.
      // Let's re-evaluate `getDndContextImpl`. If TestWrapper is DndContext, and KidKanbanBoard is its child,
      // then `kidKanbanBoardProps` would be the props of KidKanbanBoard, not DndContext.
      // The `onDragEnd` we want to test is *inside* KidKanbanBoard.

      // The `KidKanbanBoard` component *renders* a `DndContext`.
      // So, we need to find the `onDragEnd` prop of *that specific* `DndContext` instance.
      // This is hard with RTL.
      // A refactor to make `handleDragEnd` testable (e.g. by making it a prop or exporting it) would be ideal.
      // Given the constraints, we will simulate the drag by calling the context functions
      // that `handleDragEnd` *would* call, and verify those calls. This tests the *effect* of `handleDragEnd`.
      // This is not ideal as it doesn't test `handleDragEnd`'s internal logic directly.

      // Let's try to mock DndContext to capture its onDragEnd prop.
      // This is the most robust way without refactoring KidKanbanBoard for testability.
      const MockDndContext = vi.mocked(DndContext);
      const dndContextProps = MockDndContext.mock.calls[MockDndContext.mock.calls.length - 1][0];
      return dndContextProps.onDragEnd as (event: any) => void;
    };

    it('calls updateChoreInstanceCategory when category changes', () => {
      renderBoard(); // Renders KidKanbanBoard which renders DndContext
      const capturedOnDragEnd = getKidKanbanBoardPropsFromWrapper(document.body);

      const active = { id: 'inst1' };
      const over = { id: '2023-10-26|IN_PROGRESS' };

      act(() => {
        capturedOnDragEnd({ active, over, delta: {x:0, y:0} });
      });

      expect(mockUpdateChoreInstanceCategory).toHaveBeenCalledWith('inst1', 'IN_PROGRESS');
      expect(mockUpdateChoreInstanceField).not.toHaveBeenCalled();
    });

    it('calls updateChoreInstanceField when date changes', () => {
      renderBoard();
      const capturedOnDragEnd = getKidKanbanBoardPropsFromWrapper(document.body);

      const active = { id: 'inst1' };
      const over = { id: '2023-10-27|TO_DO' };

      act(() => {
        capturedOnDragEnd({ active, over, delta: {x:0, y:0} });
      });

      expect(mockUpdateChoreInstanceField).toHaveBeenCalledWith('inst1', 'instanceDate', '2023-10-27');
      expect(mockUpdateChoreInstanceCategory).not.toHaveBeenCalled();
    });

    it('calls both update functions if date and category change', () => {
      renderBoard();
      const capturedOnDragEnd = getKidKanbanBoardPropsFromWrapper(document.body);
      const active = { id: 'inst1' };
      const over = { id: '2023-10-27|COMPLETED' };

      act(() => {
        capturedOnDragEnd({ active, over, delta: {x:0, y:0} });
      });

      expect(mockUpdateChoreInstanceField).toHaveBeenCalledWith('inst1', 'instanceDate', '2023-10-27');
      expect(mockUpdateChoreInstanceCategory).toHaveBeenCalledWith('inst1', 'COMPLETED');
    });

    it('does not call update functions if dropped in the same cell (no change)', () => {
      renderBoard();
      const capturedOnDragEnd = getKidKanbanBoardPropsFromWrapper(document.body);
      const active = { id: 'inst1' };
      const over = { id: '2023-10-26|TO_DO' };

      act(() => {
        capturedOnDragEnd({ active, over, delta: {x:0, y:0} });
      });

      expect(mockUpdateChoreInstanceField).not.toHaveBeenCalled();
      expect(mockUpdateChoreInstanceCategory).not.toHaveBeenCalled();
    });

    it('sets feedback message on successful drag', async () => {
      renderBoard();
      const capturedOnDragEnd = getKidKanbanBoardPropsFromWrapper(document.body);

      const active = { id: 'inst1' };
      const over = { id: '2023-10-26|IN_PROGRESS' };

      await act(async () => {
        capturedOnDragEnd({ active, over, delta: {x:0, y:0} });
      });

      expect(screen.getByText(/Chore Def 1 moved to In Progress./i)).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.queryByText(/Chore Def 1 moved to In Progress./i)).not.toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('shows AddChoreForm modal when "Assign New Chore" is clicked', async () => {
      renderBoard();
      const assignButton = screen.getByRole('button', { name: /\+ Assign New Chore/i });
      await userEvent.click(assignButton);
      expect(screen.getByTestId('mock-add-chore-form')).toBeInTheDocument();
    });
  });
});
