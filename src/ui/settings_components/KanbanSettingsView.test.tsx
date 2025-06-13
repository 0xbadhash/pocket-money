// src/ui/settings_components/KanbanSettingsView.test.tsx
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KanbanSettingsView from './KanbanSettingsView';
import { UserContext, UserContextType, User } from '../../contexts/UserContext';
// ChoresContext is not directly used by KanbanSettingsView, so a minimal or no mock is needed unless UserProvider depends on it.
// For now, assuming UserProvider is self-contained for these tests.
import type { Kid, KanbanColumnConfig } from '../../types';
import { vi } from 'vitest';
import type { DragEndEvent } from '@dnd-kit/core';
import type { ReactNode } from 'react'; // Import as type only

// Mock dnd-kit
let dndContextProps: any = {}; // To capture DndContext props like onDragEnd
vi.mock('@dnd-kit/core', async (importOriginal) => {
    const actual = await importOriginal() as object;
    return {
        ...actual,
        DndContext: vi.fn((props) => {
            dndContextProps = props; // Capture props
            return <>{props.children}</>;
        }),
        DragOverlay: vi.fn(({ children }) => children ? <div data-testid="drag-overlay-content">{children}</div> : null), // Basic mock
        useSensor: vi.fn(),
        useSensors: vi.fn(() => []), // Return an empty array of sensors
    };
});
vi.mock('@dnd-kit/sortable', async (importOriginal) => {
    const actual = await importOriginal() as object;
    // Mock useSortable to provide necessary context for SortableColumnItem
    const useSortableMock = vi.fn(() => ({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        transition: null,
        isDragging: false,
    }));
    return {
        ...actual,
        SortableContext: vi.fn(({ children }) => <>{children}</>), // Simple pass-through
        useSortable: useSortableMock,
        sortableKeyboardCoordinates: vi.fn(),
        arrayMove: vi.fn((array, from, to) => { // Actual simple arrayMove
            const newArray = [...array];
            const [element] = newArray.splice(from, 1);
            newArray.splice(to, 0, element);
            return newArray;
        }),
        verticalListSortingStrategy: vi.fn(), // Mock strategy
    };
});


// Mock UserContext
const mockGetKanbanColumnConfigs = vi.fn();
const mockAddKanbanColumnConfig = vi.fn();
const mockUpdateKanbanColumnConfig = vi.fn();
const mockDeleteKanbanColumnConfig = vi.fn();
const mockReorderKanbanColumnConfigs = vi.fn();

let mockUserKids: Kid[] = [];

const userContextValueFactory = (kids: Kid[]): UserContextType => ({
  user: {
    id: 'user1',
    username: 'Test User',
    email: 'user@example.com',
    kids: kids,
    settings: { theme: 'light', defaultView: 'dashboard'},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  loading: false,
  error: null,
  getKanbanColumnConfigs: mockGetKanbanColumnConfigs,
  addKanbanColumnConfig: mockAddKanbanColumnConfig,
  updateKanbanColumnConfig: mockUpdateKanbanColumnConfig,
  deleteKanbanColumnConfig: mockDeleteKanbanColumnConfig,
  reorderKanbanColumnConfigs: mockReorderKanbanColumnConfigs,
  // other UserContext functions
  login: vi.fn(), logout: vi.fn(), updateUser: vi.fn(),
  addKid: vi.fn(), updateKid: vi.fn(), deleteKid: vi.fn(),
  // uploadKidAvatar: vi.fn(), fetchUser: vi.fn(), // If these exist on type
});

const wrapper = (kids: Kid[]) => ({ children }: { children: ReactNode }) => (
  <UserContext.Provider value={userContextValueFactory(kids)}>
    {children}
  </UserContext.Provider>
);

describe('KanbanSettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dndContextProps = {}; // Reset captured DndContext props
    mockUserKids = [ // Reset kids for each test
      { id: 'kid1', name: 'Kid Alpha', kanbanColumnConfigs: [] },
      { id: 'kid2', name: 'Kid Beta', kanbanColumnConfigs: [] },
    ];
    // Default mock implementation for getKanbanColumnConfigs
    mockGetKanbanColumnConfigs.mockImplementation((kidId: string) => {
        const kid = mockUserKids.find(k => k.id === kidId);
        return kid?.kanbanColumnConfigs || [];
    });
  });

  test('renders kid selection dropdown and loads columns on kid selection', async () => {
    const user = userEvent.setup();
    const kid1Configs: KanbanColumnConfig[] = [
      { id: 'cfg1', kidId: 'kid1', title: 'To Do', order: 0, createdAt: 't', updatedAt: 't' },
      { id: 'cfg2', kidId: 'kid1', title: 'Done', order: 1, createdAt: 't', updatedAt: 't' },
    ];
    mockUserKids[0].kanbanColumnConfigs = kid1Configs; // Setup kid1 with configs

    render(<KanbanSettingsView />, { wrapper: wrapper(mockUserKids) });

    const kidSelect = screen.getByLabelText('Select a kid to manage their Kanban columns');
    expect(kidSelect).toBeInTheDocument();
    expect(kidSelect).toHaveRole('combobox');
    // expect(screen.getByText('Select a Kid')).toBeInTheDocument(); // This might be the default option, not a label

    await user.selectOptions(kidSelect, 'kid1');

    expect(mockGetKanbanColumnConfigs).toHaveBeenCalledWith('kid1');
    await waitFor(() => {
      expect(screen.getByText(/To Do/i)).toBeInTheDocument();
      expect(screen.getByText(/Done/i)).toBeInTheDocument();
    });

    // Verify column list ARIA attributes
    const columnList = screen.getByRole('list', { name: /Existing Columns:/i });
    expect(columnList).toBeInTheDocument();
    // Verify list items (assuming SortableColumnItem renders with role="listitem")
    const columnItems = screen.getAllByRole('listitem');
    expect(columnItems.length).toBe(kid1Configs.length);
  });

  test('adds a new column when form is submitted', async () => {
    const user = userEvent.setup();
    render(<KanbanSettingsView />, { wrapper: wrapper(mockUserKids) });

    const kidSelect = screen.getByLabelText('Select a kid to manage their Kanban columns');
    await user.selectOptions(kidSelect, 'kid1');

    const titleInput = screen.getByLabelText('Title for new column');
    expect(titleInput).toBeInTheDocument();
    const addButton = screen.getByRole('button', { name: 'Add Column' });

    await user.type(titleInput, 'Backlog');
    await user.click(addButton);

    expect(mockAddKanbanColumnConfig).toHaveBeenCalledWith('kid1', 'Backlog');
  });

  test('edits a column title', async () => {
    const user = userEvent.setup();
    const kid1Configs: KanbanColumnConfig[] = [
      { id: 'cfg1', kidId: 'kid1', title: 'To Do', order: 0, createdAt: 't', updatedAt: 't' },
    ];
    mockUserKids[0].kanbanColumnConfigs = kid1Configs;
     // Mock getKanbanColumnConfigs to return the (updated) list when called after an update
    mockGetKanbanColumnConfigs.mockImplementation((kidId: string) => {
        const kid = mockUserKids.find(k => k.id === kidId);
        return kid?.kanbanColumnConfigs || [];
    });


    render(<KanbanSettingsView />, { wrapper: wrapper(mockUserKids) });
    await user.selectOptions(screen.getByRole('combobox'), 'kid1');

    await waitFor(() => { // Wait for columns to render
        expect(screen.getByText(/To Do/i)).toBeInTheDocument();
    });

    // There should be only one edit button initially if only one column
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]);

    const editInput = screen.getByLabelText(`Edit title for column ${kid1Configs[0].title}`);
    expect(editInput).toBeInTheDocument();
    expect(editInput).toHaveValue(kid1Configs[0].title); // Ensure it's the correct input

    await user.clear(editInput);
    await user.type(editInput, 'My Tasks');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockUpdateKanbanColumnConfig).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cfg1', title: 'My Tasks' })
    );
  });

  test('deletes a column after confirmation', async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => true); // Mock confirm
    const kid1Configs: KanbanColumnConfig[] = [
      { id: 'cfg1', kidId: 'kid1', title: 'To Delete', order: 0, createdAt: 't', updatedAt: 't' },
    ];
    mockUserKids[0].kanbanColumnConfigs = kid1Configs;

    render(<KanbanSettingsView />, { wrapper: wrapper(mockUserKids) });
    await user.selectOptions(screen.getByRole('combobox'), 'kid1');

    await waitFor(() => {
        expect(screen.getByText(/To Delete/i)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteKanbanColumnConfig).toHaveBeenCalledWith('kid1', 'cfg1');
  });

  test('does not delete a column if confirmation is cancelled', async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => false); // Mock confirm to return false
    const kid1Configs: KanbanColumnConfig[] = [
      { id: 'cfg1', kidId: 'kid1', title: 'To Keep', order: 0, createdAt: 't', updatedAt: 't' },
    ];
    mockUserKids[0].kanbanColumnConfigs = kid1Configs;

    render(<KanbanSettingsView />, { wrapper: wrapper(mockUserKids) });
    await user.selectOptions(screen.getByRole('combobox'), 'kid1');

    await waitFor(() => {
        expect(screen.getByText(/To Keep/i)).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteKanbanColumnConfig).not.toHaveBeenCalled();
  });

  test('reorders columns on drag end', async () => {
    const kid1Id = 'kid1';
    const initialConfigs: KanbanColumnConfig[] = [
      { id: 'cfgA', kidId: kid1Id, title: 'Column A', order: 0, createdAt: 't', updatedAt: 't' },
      { id: 'cfgB', kidId: kid1Id, title: 'Column B', order: 1, createdAt: 't', updatedAt: 't' },
      { id: 'cfgC', kidId: kid1Id, title: 'Column C', order: 2, createdAt: 't', updatedAt: 't' },
    ];
    mockUserKids[0].kanbanColumnConfigs = initialConfigs;

    render(<KanbanSettingsView />, { wrapper: wrapper(mockUserKids) });
    await userEvent.selectOptions(screen.getByRole('combobox'), kid1Id);

    await waitFor(() => {
      expect(screen.getByText(/Column A/i)).toBeInTheDocument();
    });

    // Simulate drag end: move Column C (cfgC) to the position of Column A (cfgA)
    // Original order: A, B, C. New order: C, A, B
    const dragEndEvent: DragEndEvent = { // Type DragEndEvent from @dnd-kit/core
      active: { id: 'cfgC', data: { current: { sortable: { index: 2, containerId: kid1Id } } } } as any,
      over: { id: 'cfgA', data: { current: { sortable: { index: 0, containerId: kid1Id } } } } as any,
      delta: {x:0, y:0}, collisions: null,
      activatorEvent: {} as any, // Add dummy property to satisfy type
    };

    // Manually call onDragEnd captured from DndContext mock
    // Ensure onDragEnd is defined before calling
    if (dndContextProps.onDragEnd) {
        act(() => {
            dndContextProps.onDragEnd(dragEndEvent);
        });
    } else {
        throw new Error("onDragEnd is not defined on dndContextProps");
    }

    // Expected reordered array (cfgC, cfgA, cfgB) with updated order properties
    const expectedReorderedConfigs = [
      expect.objectContaining({ id: 'cfgC', order: 0 }),
      expect.objectContaining({ id: 'cfgA', order: 1 }),
      expect.objectContaining({ id: 'cfgB', order: 2 }),
    ];
    expect(mockReorderKanbanColumnConfigs).toHaveBeenCalledWith(kid1Id, expect.arrayContaining(expectedReorderedConfigs));

    // Verify column list ARIA attributes after reorder
    const columnList = screen.getByRole('list', { name: /Existing Columns:/i });
    expect(columnList).toBeInTheDocument();
    const columnItems = screen.getAllByRole('listitem');
    expect(columnItems.length).toBe(initialConfigs.length);
  });

  test('shows "Setup Default Columns" button and calls add multiple times on click', async () => {
    const user = userEvent.setup();
    // Ensure kid1 has no columns initially
    mockUserKids[0].kanbanColumnConfigs = [];

    render(<KanbanSettingsView />, { wrapper: wrapper(mockUserKids) });
    await user.selectOptions(screen.getByRole('combobox'), 'kid1');

    const setupButton = await screen.findByRole('button', { name: /Setup Default Columns/i });
    expect(setupButton).toBeInTheDocument();

    await user.click(setupButton);

    expect(mockAddKanbanColumnConfig).toHaveBeenCalledTimes(3);
    expect(mockAddKanbanColumnConfig).toHaveBeenCalledWith('kid1', 'To Do');
    expect(mockAddKanbanColumnConfig).toHaveBeenCalledWith('kid1', 'In Progress');
    expect(mockAddKanbanColumnConfig).toHaveBeenCalledWith('kid1', 'Done');
  });

});
