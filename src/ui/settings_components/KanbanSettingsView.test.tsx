// src/ui/settings_components/KanbanSettingsView.test.tsx
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// import KanbanSettingsView from './KanbanSettingsView'; // Removed import as the file does not exist
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

  test('renders kid selection dropdown and loads swimlanes on kid selection', async () => {
    const user = userEvent.setup();
    const kid1Configs: KanbanColumnConfig[] = [
      { id: 'cfg1', kidId: 'kid1', title: 'To Do', order: 0, color: '#FFFFFF', createdAt: 't', updatedAt: 't' },
      { id: 'cfg2', kidId: 'kid1', title: 'Done', order: 1, color: '#90EE90', createdAt: 't', updatedAt: 't' },
    ];
    mockUserKids[0].kanbanColumnConfigs = kid1Configs; // Setup kid1 with configs

    render(<KanbanSettingsView />, { wrapper: wrapper(mockUserKids) });

    const kidSelect = screen.getByLabelText('Select a kid to manage their Kanban swimlanes'); // Terminology updated
    expect(kidSelect).toBeInTheDocument();
    expect(kidSelect).toHaveRole('combobox');

    await user.selectOptions(kidSelect, 'kid1');

    expect(mockGetKanbanColumnConfigs).toHaveBeenCalledWith('kid1');
    await waitFor(() => {
      expect(screen.getByText(/To Do/i)).toBeInTheDocument();
      expect(screen.getByText(/Done/i)).toBeInTheDocument();
    });

    // Verify swimlane list ARIA attributes
    const swimlaneList = screen.getByRole('list', { name: /Existing Swimlanes:/i }); // Terminology updated
    expect(swimlaneList).toBeInTheDocument();
    const swimlaneItems = screen.getAllByRole('listitem');
    expect(swimlaneItems.length).toBe(kid1Configs.length);
  });

  test('adds a new swimlane with title and color when form is submitted', async () => {
    const user = userEvent.setup();
    render(<KanbanSettingsView />, { wrapper: wrapper(mockUserKids) });

    const kidSelect = screen.getByLabelText('Select a kid to manage their Kanban swimlanes');
    await user.selectOptions(kidSelect, 'kid1');

    const titleInput = screen.getByLabelText('Title for new swimlane'); // Terminology updated
    expect(titleInput).toBeInTheDocument();
    const colorInput = screen.getByLabelText('Color for new swimlane');
    expect(colorInput).toBeInTheDocument();
    expect(colorInput).toHaveValue('#e0e0e0'); // Default color

    const addButton = screen.getByRole('button', { name: 'Add Swimlane' }); // Terminology updated

    await user.type(titleInput, 'Backlog');
    // For <input type="color">, userEvent.type() might not work as expected.
    // Directly changing the value is more reliable for testing.
    fireEvent.input(colorInput, { target: { value: '#aabbcc' } });

    await user.click(addButton);

    expect(mockAddKanbanColumnConfig).toHaveBeenCalledWith('kid1', 'Backlog', '#aabbcc');
  });

  test('edits a swimlane title and color', async () => {
    const user = userEvent.setup();
    const initialColor = '#123456';
    const kid1Configs: KanbanColumnConfig[] = [
      { id: 'cfg1', kidId: 'kid1', title: 'To Do', order: 0, color: initialColor, createdAt: 't', updatedAt: 't' },
    ];
    mockUserKids[0].kanbanColumnConfigs = kid1Configs;
    mockGetKanbanColumnConfigs.mockImplementation((kidId: string) => {
        const kid = mockUserKids.find(k => k.id === kidId);
        return kid?.kanbanColumnConfigs || [];
    });

    render(<KanbanSettingsView />, { wrapper: wrapper(mockUserKids) });
    await user.selectOptions(screen.getByRole('combobox'), 'kid1');

    await waitFor(() => {
        expect(screen.getByText(/To Do/i)).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]);

    const editTitleInput = screen.getByLabelText(`Edit title for swimlane ${kid1Configs[0].title}`);
    expect(editTitleInput).toBeInTheDocument();
    expect(editTitleInput).toHaveValue(kid1Configs[0].title);

    const editColorInput = screen.getByLabelText(`Edit color for swimlane ${kid1Configs[0].title}`);
    expect(editColorInput).toBeInTheDocument();
    expect(editColorInput).toHaveValue(initialColor);

    await user.clear(editTitleInput);
    await user.type(editTitleInput, 'My Tasks Updated');
    fireEvent.input(editColorInput, { target: { value: '#fedcba' } });

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(mockUpdateKanbanColumnConfig).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cfg1', title: 'My Tasks Updated', color: '#fedcba' })
    );
  });

  test('deletes a swimlane after confirmation', async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => true); // Mock confirm
    const kid1Configs: KanbanColumnConfig[] = [
      { id: 'cfg1', kidId: 'kid1', title: 'To Delete', order: 0, color: '#111', createdAt: 't', updatedAt: 't' },
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

  test('does not delete a swimlane if confirmation is cancelled', async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => false); // Mock confirm to return false
    const kid1Configs: KanbanColumnConfig[] = [
      { id: 'cfg1', kidId: 'kid1', title: 'To Keep', order: 0, color: '#222', createdAt: 't', updatedAt: 't' },
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

  test('reorders swimlanes on drag end', async () => {
    const kid1Id = 'kid1';
    const initialConfigs: KanbanColumnConfig[] = [
      { id: 'cfgA', kidId: kid1Id, title: 'Swimlane A', order: 0, color: '#AAA', createdAt: 't', updatedAt: 't' },
      { id: 'cfgB', kidId: kid1Id, title: 'Swimlane B', order: 1, color: '#BBB', createdAt: 't', updatedAt: 't' },
      { id: 'cfgC', kidId: kid1Id, title: 'Swimlane C', order: 2, color: '#CCC', createdAt: 't', updatedAt: 't' },
    ];
    mockUserKids[0].kanbanColumnConfigs = initialConfigs;

    render(<KanbanSettingsView />, { wrapper: wrapper(mockUserKids) });
    await userEvent.selectOptions(screen.getByRole('combobox'), kid1Id);

    await waitFor(() => {
      expect(screen.getByText(/Swimlane A/i)).toBeInTheDocument();
    });

    const dragEndEvent: DragEndEvent = {
      active: { id: 'cfgC', data: { current: { sortable: { index: 2, containerId: kid1Id } } } } as any,
      over: { id: 'cfgA', data: { current: { sortable: { index: 0, containerId: kid1Id } } } } as any,
      delta: {x:0, y:0}, collisions: null,
      activatorEvent: {} as any,
    };

    if (dndContextProps.onDragEnd) {
        act(() => {
            dndContextProps.onDragEnd(dragEndEvent);
        });
    } else {
        throw new Error("onDragEnd is not defined on dndContextProps");
    }

    const expectedReorderedConfigs = [
      expect.objectContaining({ id: 'cfgC', order: 0 }),
      expect.objectContaining({ id: 'cfgA', order: 1 }),
      expect.objectContaining({ id: 'cfgB', order: 2 }),
    ];
    expect(mockReorderKanbanColumnConfigs).toHaveBeenCalledWith(kid1Id, expect.arrayContaining(expectedReorderedConfigs));

    const swimlaneList = screen.getByRole('list', { name: /Existing Swimlanes:/i });
    expect(swimlaneList).toBeInTheDocument();
    const swimlaneItems = screen.getAllByRole('listitem');
    expect(swimlaneItems.length).toBe(initialConfigs.length);
  });

  test('shows "Setup Default Swimlanes" button and calls addKanbanColumnConfig with correct colors', async () => {
    const user = userEvent.setup();
    mockUserKids[0].kanbanColumnConfigs = []; // Ensure kid1 has no swimlanes

    render(<KanbanSettingsView />, { wrapper: wrapper(mockUserKids) });
    await user.selectOptions(screen.getByRole('combobox'), 'kid1');

    const setupButton = await screen.findByRole('button', { name: /Setup Default Swimlanes/i }); // Terminology updated
    expect(setupButton).toBeInTheDocument();

    await user.click(setupButton);

    expect(mockAddKanbanColumnConfig).toHaveBeenCalledTimes(3);
    expect(mockAddKanbanColumnConfig).toHaveBeenCalledWith('kid1', 'To Do', '#FFFFFF');
    expect(mockAddKanbanColumnConfig).toHaveBeenCalledWith('kid1', 'In Progress', '#FFFFE0');
    expect(mockAddKanbanColumnConfig).toHaveBeenCalledWith('kid1', 'Done', '#90EE90');
  });

});
