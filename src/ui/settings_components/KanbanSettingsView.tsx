/**
 * @file KanbanSettingsView.tsx
 * Component for managing custom Kanban column configurations for each kid.
 * Allows creating, reading, updating, deleting, and reordering Kanban columns.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useUserContext, User } from '../../contexts/UserContext'; // Assuming User type is exported from UserContext
import type { Kid, KanbanColumnConfig } from '../../types';
import * as DndKit from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * @interface SortableColumnItemProps
 * Props for the `SortableColumnItem` component, which represents a single,
 * editable, and deletable Kanban column configuration in a sortable list.
 */
interface SortableColumnItemProps {
  /** The Kanban column configuration object to display and manage. */
  config: KanbanColumnConfig;
  /** Callback function triggered when the 'Edit' button for a column is clicked. */
  onEdit: (config: KanbanColumnConfig) => void;
  /** Callback function triggered when the 'Delete' button for a column is clicked. */
  onDelete: (configId: string) => void;
  /** Boolean indicating if this specific column item is currently in edit mode. */
  isEditing: boolean;
  /** The current value of the title input field when this item is in edit mode. */
  currentEditTitle: string;
  /** Callback to update the `currentEditTitle` state as the user types in the edit input. */
  onEditTitleChange: (title: string) => void;
  /** Callback triggered when the 'Save' button is clicked after editing a title. */
  onSaveEdit: () => void;
  /** Callback triggered when the 'Cancel' button is clicked during an edit. */
  onCancelEdit: () => void;
}

/**
 * SortableColumnItem component.
 * Renders a single item in the list of Kanban column configurations.
 * Provides functionality for inline editing of the title, deleting the column,
 * and drag handles for reordering.
 * @param {SortableColumnItemProps} props - The component props.
 * @returns {JSX.Element} A sortable list item representing a Kanban column configuration.
 */
const SortableColumnItem: React.FC<SortableColumnItemProps> = ({
  config,
  onEdit,
  onDelete,
  isEditing,
  currentEditTitle,
  onEditTitleChange,
  onSaveEdit,
  onCancelEdit,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: config.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    padding: '8px',
    border: '1px solid #ccc',
    marginBottom: '4px',
    backgroundColor: '#f9f9f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} role="listitem">
      {isEditing ? (
        <>
          <input
            type="text"
            value={currentEditTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            aria-label={`Edit title for column ${config.title}`}
            autoFocus
            style={{ flexGrow: 1, marginRight: '8px' }}
          />
          <button onClick={onSaveEdit} style={{ marginRight: '4px' }}>Save</button>
          <button onClick={onCancelEdit}>Cancel</button>
        </>
      ) : (
        <>
          <span {...listeners} style={{ flexGrow: 1 }}>{config.title} (Order: {config.order})</span>
          {/**
           * @section Sortable Column Item Actions
           * Container for action buttons (Edit, Delete) within a sortable column item.
           * This class is targeted by responsive CSS to stack buttons on smaller screens.
           */}
          <div className="sortable-column-item-actions">
            <button onClick={() => onEdit(config)} style={{ marginRight: '4px' }}>Edit</button>
            <button onClick={() => onDelete(config.id)}>Delete</button>
          </div>
        </>
      )}
    </div>
  );
};


/**
 * KanbanSettingsView component.
 * Allows users to manage custom Kanban column configurations for each kid.
 * This includes creating, editing, deleting, and reordering columns.
 * @returns {JSX.Element} The Kanban column settings UI.
 */
const KanbanSettingsView: React.FC = () => {
  const {
    user,
    getKanbanColumnConfigs,
    addKanbanColumnConfig,
    updateKanbanColumnConfig,
    deleteKanbanColumnConfig,
    reorderKanbanColumnConfigs
  } = useUserContext();

  /** State for the ID of the currently selected kid whose columns are being managed. */
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  /** State holding the array of Kanban column configurations for the `selectedKidId`. */
  const [columnsForSelectedKid, setColumnsForSelectedKid] = useState<KanbanColumnConfig[]>([]);
  /** State for the column configuration object currently being edited (if any). */
  const [editingColumn, setEditingColumn] = useState<KanbanColumnConfig | null>(null);
  /** State for the title input when editing an existing column. */
  const [currentEditTitle, setCurrentEditTitle] = useState<string>('');
  /** State for the title input when adding a new column. */
  const [newColumnTitle, setNewColumnTitle] = useState<string>('');
  /** State for the ID of the column configuration item currently being dragged for reordering. */
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const kids = user?.kids || [];

  /**
   * Effect hook to fetch and update the list of `columnsForSelectedKid`
   * whenever the `selectedKidId` changes or the main `user` data (which might include
   * updated column configs from context operations) changes.
   */
  useEffect(() => {
    if (selectedKidId) {
      const configs = getKanbanColumnConfigs(selectedKidId);
      setColumnsForSelectedKid(configs);
    } else {
      setColumnsForSelectedKid([]);
    }
  }, [selectedKidId, user, getKanbanColumnConfigs]); // user dependency to refresh if configs change externally

  const sensors = DndKit.useSensors(
    DndKit.useSensor(DndKit.PointerSensor),
    DndKit.useSensor(DndKit.KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * Handles changes to the kid selection dropdown.
   * Updates `selectedKidId` and resets any ongoing column edit.
   * @param {React.ChangeEvent<HTMLSelectElement>} event - The select change event.
   */
  const handleKidSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const kidId = event.target.value;
    setSelectedKidId(kidId || null);
    setEditingColumn(null); // Reset editing state when kid changes
  };

  /**
   * Handles adding a new Kanban column for the selected kid.
   * Calls `addKanbanColumnConfig` from UserContext and clears the input field.
   */
  const handleAddColumn = async () => {
    if (selectedKidId && newColumnTitle.trim()) {
      await addKanbanColumnConfig(selectedKidId, newColumnTitle.trim());
      setNewColumnTitle('');
      // `columnsForSelectedKid` will auto-update via useEffect watching `user` context.
    }
  };

  /**
   * Sets a column configuration into edit mode.
   * @param {KanbanColumnConfig} config - The column configuration to edit.
   */
  const handleEditColumn = (config: KanbanColumnConfig) => {
    setEditingColumn(config);
    setCurrentEditTitle(config.title);
  };

  /**
   * Saves changes to an edited column's title.
   * Calls `updateKanbanColumnConfig` from UserContext and exits edit mode.
   */
  const handleSaveEdit = async () => {
    if (editingColumn && currentEditTitle.trim()) {
      await updateKanbanColumnConfig({ ...editingColumn, title: currentEditTitle.trim() });
      setEditingColumn(null);
      setCurrentEditTitle('');
    }
  };

  /**
   * Cancels the current column edit operation.
   */
  const handleCancelEdit = () => {
    setEditingColumn(null);
    setCurrentEditTitle('');
  };

  /**
   * Handles deleting a Kanban column configuration for the selected kid.
   * Prompts for confirmation before calling `deleteKanbanColumnConfig` from UserContext.
   * Includes a TODO comment regarding chore reassignment logic.
   * @param {string} configId - The ID of the column configuration to delete.
   */
  const handleDeleteColumn = async (configId: string) => {
    if (selectedKidId && window.confirm('Are you sure you want to delete this column? Chores currently in this column will need to be manually reassigned from the Kanban board or they might become hidden.')) {
      await deleteKanbanColumnConfig(selectedKidId, configId);
      // TODO: Future: Implement UI for chore reassignment or automatic reassignment to a default column
      // when a column is deleted. KidKanbanBoard currently defaults unassigned chores to the first column.
    }
  };

  /**
   * Sets up a default set of Kanban columns ("To Do", "In Progress", "Done")
   * for the selected kid if they have no columns configured.
   */
  const handleSetupDefaultColumns = async () => {
    if (!selectedKidId) return;
    const defaultTitles = ["To Do", "In Progress", "Done"];
    // Assuming addKanbanColumnConfig updates context and triggers re-fetch via useEffect
    for (const title of defaultTitles) {
        await addKanbanColumnConfig(selectedKidId, title);
    }
  };

  /**
   * Handles the start of a drag operation for reordering column configurations.
   * Sets the ID of the actively dragged item.
   * @param {DndKit.DragStartEvent} event - The drag start event from dnd-kit.
   */
  const handleDragStart = (event: DndKit.DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  /**
   * Handles the end of a drag operation for reordering column configurations.
   * Calculates the new order and calls `reorderKanbanColumnConfigs` from UserContext.
   * @param {DndKit.DragEndEvent} event - The drag end event from dnd-kit.
   */
  const handleDragEnd = (event: DndKit.DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (over && active.id !== over.id && selectedKidId) {
      const oldIndex = columnsForSelectedKid.findIndex(col => col.id === active.id);
      const newIndex = columnsForSelectedKid.findIndex(col => col.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(columnsForSelectedKid, oldIndex, newIndex);
        // Update the 'order' property for each config based on the new array index
        const finalConfigs = reordered.map((config, index) => ({ ...config, order: index }));
        reorderKanbanColumnConfigs(selectedKidId, finalConfigs);
        // UI will update via useEffect listening to 'user' context
      }
    }
  };

  return (
    <div>
      <h4>Manage Kanban Columns</h4>
      <label htmlFor="kanban-kid-select" style={{ marginRight: '8px' }}>Select Kid:</label>
      <select
        id="kanban-kid-select"
        onChange={handleKidSelection}
        value={selectedKidId || ''}
        style={{ marginBottom: '10px' }}
        aria-label="Select a kid to manage their Kanban columns"
      >
        <option value="">Select a Kid</option>
        {kids.map(kid => (
          <option key={kid.id} value={kid.id}>{kid.name}</option>
        ))}
      </select>

      {selectedKidId && (
        <div>
          <h5 id={`add-column-heading-${selectedKidId}`}>Add New Column for {kids.find(k => k.id === selectedKidId)?.name}</h5>
          <label htmlFor={`new-column-title-input-${selectedKidId}`} style={{display: 'none'}}>Title for new column</label> {/* Visually hidden label */}
          <input
            id={`new-column-title-input-${selectedKidId}`}
            type="text"
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            placeholder="New column title"
            aria-label="Title for new column" // Use aria-label if placeholder is not sufficient
            aria-labelledby={`add-column-heading-${selectedKidId}`}
            style={{ marginRight: '8px' }}
          />
          <button onClick={handleAddColumn}>Add Column</button>

          <h5 style={{ marginTop: '20px' }} id={`existing-columns-heading-${selectedKidId}`}>Existing Columns:</h5>
          {columnsForSelectedKid.length === 0 && (
            <div>
              <p>No custom columns defined for this kid.</p>
              <button onClick={handleSetupDefaultColumns}>Setup Default Columns (To Do, In Progress, Done)</button>
            </div>
          )}

          {columnsForSelectedKid.length > 0 && (
            <DndKit.DndContext
              sensors={sensors}
              collisionDetection={DndKit.closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/**
               * This div acts as the list container for ARIA purposes,
               * labelled by the "Existing Columns" heading.
               */}
              <div role="list" aria-labelledby={`existing-columns-heading-${selectedKidId}`}>
                <SortableContext items={columnsForSelectedKid.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {columnsForSelectedKid.map(config => (
                    <SortableColumnItem
                      key={config.id}
                    config={config}
                    onEdit={handleEditColumn}
                    onDelete={handleDeleteColumn}
                    isEditing={editingColumn?.id === config.id}
                    currentEditTitle={currentEditTitle}
                    onEditTitleChange={setCurrentEditTitle}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                  />
                ))}
              </SortableContext>
              <DndKit.DragOverlay>
                {activeDragId && editingColumn?.id !== activeDragId ? ( // Don't show overlay if editing the dragged item
                  <div style={{ padding: '8px', border: '1px dashed #555', backgroundColor: '#eee'}}>
                    {columnsForSelectedKid.find(c => c.id === activeDragId)?.title}
                  </div>
                ) : null}
              </DragOverlay>
              </div>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
};

export default KanbanSettingsView;
