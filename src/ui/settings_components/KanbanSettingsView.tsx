/**
 * @file KanbanSettingsView.tsx
 * Component for managing custom Kanban swimlane configurations for each kid.
 * Allows creating, reading, updating, deleting, and reordering Kanban swimlanes.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useUserContext } from '../../contexts/UserContext';
import { useChoresContext } from '../../contexts/ChoresContext'; // Import useChoresContext
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
 * @interface SortableSwimlaneItemProps
 * Props for the `SortableSwimlaneItem` component, which represents a single,
 * editable, and deletable Kanban swimlane configuration in a sortable list.
 */
interface SortableSwimlaneItemProps {
  /** The Kanban swimlane configuration object to display and manage. */
  config: KanbanColumnConfig; // Type remains KanbanColumnConfig, context is swimlane
  /** Callback function triggered when the 'Edit' button for a swimlane is clicked. */
  onEdit: (config: KanbanColumnConfig) => void;
  /** Callback function triggered when the 'Delete' button for a swimlane is clicked. */
  onDelete: (configId: string) => void;
  /** Boolean indicating if this specific swimlane item is currently in edit mode. */
  isEditing: boolean;
  /** The current value of the title input field when this item is in edit mode. */
  currentEditTitle: string;
  /** Callback to update the `currentEditTitle` state as the user types in the edit input. */
  onEditTitleChange: (title: string) => void;
  /** The current value of the color input field when this item is in edit mode. */
  currentEditColor: string;
  /** Callback to update the `currentEditColor` state. */
  onEditColorChange: (color: string) => void;
  /** The current value of the 'isCompletedColumn' checkbox when this item is in edit mode. */
  currentEditIsCompleted: boolean;
  /** Callback to update the `currentEditIsCompleted` state. */
  onEditIsCompletedChange: (isCompleted: boolean) => void;
  /** Callback triggered when the 'Save' button is clicked after editing a title or color. */
  onSaveEdit: () => void;
  /** Callback triggered when the 'Cancel' button is clicked during an edit. */
  onCancelEdit: () => void;
}

/**
 * SortableSwimlaneItem component.
 * Renders a single item in the list of Kanban swimlane configurations.
 * Provides functionality for inline editing of the title, deleting the swimlane,
 * and drag handles for reordering.
 * @param {SortableSwimlaneItemProps} props - The component props.
 * @returns {JSX.Element} A sortable list item representing a Kanban swimlane configuration.
 */
const SortableSwimlaneItem: React.FC<SortableSwimlaneItemProps> = ({
  config,
  onEdit,
  onDelete,
  isEditing,
  currentEditTitle,
  onEditTitleChange,
  currentEditColor,
  onEditColorChange,
  currentEditIsCompleted,
  onEditIsCompletedChange,
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
            aria-label={`Edit title for swimlane ${config.title}`}
            autoFocus
            style={{ flexGrow: 1, marginRight: '8px' }}
          />
          <input
            type="color"
            value={currentEditColor}
            onChange={(e) => onEditColorChange(e.target.value)}
            aria-label={`Edit color for swimlane ${config.title}`}
            style={{ marginLeft: '8px', marginRight: '8px' }}
          />
          <label style={{ marginLeft: '8px', marginRight: '4px', display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={currentEditIsCompleted}
              onChange={(e) => onEditIsCompletedChange(e.target.checked)}
              aria-label={`Mark as 'Done' column for swimlane ${config.title}`}
            />
            <span style={{fontSize: '0.9em', marginLeft: '4px'}}>Is 'Done' Column?</span>
          </label>
          <button onClick={onSaveEdit} style={{ marginRight: '4px' }}>Save</button>
          <button onClick={onCancelEdit}>Cancel</button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <span
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: config.color || '#E0E0E0',
                border: '1px solid #ccc',
                marginRight: '8px',
                borderRadius: '4px',
              }}
              aria-hidden="true"
            ></span>
            <span {...listeners} style={{ flexGrow: 1 }}>
              {config.title} (Order: {config.order}) {config.isCompletedColumn && <em style={{fontSize: '0.85em', color: 'green'}}>(Done Column)</em>}
            </span>
          </div>
          {/**
           * @section Sortable Swimlane Item Actions
           * Container for action buttons (Edit, Delete) within a sortable swimlane item.
           * This class is targeted by responsive CSS to stack buttons on smaller screens.
           */}
          <div className="sortable-swimlane-item-actions">
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
 * Allows users to manage custom Kanban swimlane configurations for each kid.
 * This includes creating, editing, deleting, and reordering swimlanes.
 * @returns {JSX.Element} The Kanban swimlane settings UI.
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
  const { choreInstances } = useChoresContext(); // Access choreInstances

  /** State for the ID of the currently selected kid whose swimlanes are being managed. */
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  /** State holding the array of Kanban swimlane configurations for the `selectedKidId`. */
  const [columnsForSelectedKid, setColumnsForSelectedKid] = useState<KanbanColumnConfig[]>([]); // Type remains KanbanColumnConfig
  /** State for the swimlane configuration object currently being edited (if any). */
  const [editingColumn, setEditingColumn] = useState<KanbanColumnConfig | null>(null); // Type remains KanbanColumnConfig
  /** State for the title input when editing an existing swimlane. */
  const [currentEditTitle, setCurrentEditTitle] = useState<string>('');
  /** State for the color input when editing an existing swimlane. */
  const [currentEditColor, setCurrentEditColor] = useState<string>('#E0E0E0');
  const [currentEditIsCompleted, setCurrentEditIsCompleted] = useState<boolean>(false);
  /** State for the title input when adding a new swimlane. */
  const [newColumnTitle, setNewColumnTitle] = useState<string>('');
  /** State for the color input when adding a new swimlane. */
  const [newColumnColor, setNewColumnColor] = useState<string>('#E0E0E0');
  const [newColumnIsCompleted, setNewColumnIsCompleted] = useState<boolean>(false);
  /** State for the ID of the swimlane configuration item currently being dragged for reordering. */
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const kids = user?.kids || [];

  /**
   * Effect hook to fetch and update the list of `columnsForSelectedKid` (representing swimlanes)
   * whenever the `selectedKidId` changes or the main `user` data (which might include
   * updated swimlane configs from context operations) changes.
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
   * Updates `selectedKidId` and resets any ongoing swimlane edit.
   * @param {React.ChangeEvent<HTMLSelectElement>} event - The select change event.
   */
  const handleKidSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const kidId = event.target.value;
    setSelectedKidId(kidId || null);
    setEditingColumn(null); // Reset editing state when kid changes
  };

  /**
   * Handles adding a new Kanban swimlane for the selected kid.
   * Calls `addKanbanColumnConfig` from UserContext and clears the input field.
   */
  const handleAddColumn = async () => {
    if (selectedKidId && newColumnTitle.trim()) {
      await addKanbanColumnConfig(selectedKidId, newColumnTitle.trim(), newColumnColor, newColumnIsCompleted);
      setNewColumnTitle('');
      setNewColumnColor('#E0E0E0');
      setNewColumnIsCompleted(false); // Reset checkbox
    }
  };

  /**
   * Sets a swimlane configuration into edit mode.
   * @param {KanbanColumnConfig} config - The swimlane configuration to edit.
   */
  const handleEditColumn = (config: KanbanColumnConfig) => {
    setEditingColumn(config);
    setCurrentEditTitle(config.title);
    setCurrentEditColor(config.color || '#E0E0E0');
    setCurrentEditIsCompleted(config.isCompletedColumn || false);
  };

  /**
   * Saves changes to an edited swimlane's title and/or color.
   * Calls `updateKanbanColumnConfig` from UserContext and exits edit mode.
   */
  const handleSaveEdit = async () => {
    if (editingColumn && currentEditTitle.trim()) {
      await updateKanbanColumnConfig({
        ...editingColumn,
        title: currentEditTitle.trim(),
        color: currentEditColor,
        isCompletedColumn: currentEditIsCompleted,
      });
      setEditingColumn(null);
      setCurrentEditTitle('');
      setCurrentEditColor('#E0E0E0');
      setCurrentEditIsCompleted(false);
    }
  };

  /**
   * Cancels the current swimlane edit operation.
   */
  const handleCancelEdit = () => {
    setEditingColumn(null);
    setCurrentEditTitle('');
    setCurrentEditColor('#E0E0E0');
    setCurrentEditIsCompleted(false);
  };

  /**
   * Handles deleting a Kanban swimlane configuration for the selected kid.
   * Prompts for confirmation before calling `deleteKanbanColumnConfig` from UserContext.
   * Includes a TODO comment regarding chore reassignment logic.
   * @param {string} configId - The ID of the swimlane configuration to delete.
   */
  const handleDeleteColumn = async (configId: string) => {
    if (selectedKidId) {
      const cardsInColumn = choreInstances.filter(
        instance => instance.categoryStatus === configId &&
                    definitionForInstance(instance.choreDefinitionId)?.assignedKidId === selectedKidId
      );

      let confirmMessage = 'Are you sure you want to delete this swimlane?';
      if (cardsInColumn.length > 0) {
        confirmMessage = `Are you sure you want to delete this swimlane? There are ${cardsInColumn.length} card(s) in this swimlane for the selected kid. These cards will become unassigned from a status column. Consider moving them to another column first.`;
      }

      if (window.confirm(confirmMessage)) {
        await deleteKanbanColumnConfig(selectedKidId, configId);
        // Existing TODO about chore reassignment remains relevant for future work.
      }
    }
  };

  // Helper to get definition for an instance - needed for assignedKidId check in handleDeleteColumn
  // This might be slightly redundant if choreInstances already have assignedKidId directly,
  // but choreDefinitions are typically where assignedKidId resides.
  // Assuming ChoreInstance might not directly have assignedKidId, so we look up definition.
  // If ChoreInstance *does* have assignedKidId, this helper can be simplified/removed.
  const { choreDefinitions } = useChoresContext(); // If not already destructured
  const definitionForInstance = (definitionId: string) => {
    return choreDefinitions.find(def => def.id === definitionId);
  };

  /**
   * Sets up a default set of Kanban swimlanes ("To Do", "In Progress", "Done")
   * for the selected kid if they have no swimlanes configured.
   */
  const handleSetupDefaultColumns = async () => {
    if (!selectedKidId) return;
    const defaultSwimlanes = [
      { title: "To Do", color: "#FFFFFF", isCompleted: false },
      { title: "In Progress", color: "#FFFFE0", isCompleted: false },
      { title: "Done", color: "#90EE90", isCompleted: true },
    ];
    for (const { title, color, isCompleted } of defaultSwimlanes) {
        await addKanbanColumnConfig(selectedKidId, title, color, isCompleted);
    }
  };

  /**
   * Handles the start of a drag operation for reordering swimlane configurations.
   * Sets the ID of the actively dragged item.
   * @param {DndKit.DragStartEvent} event - The drag start event from dnd-kit.
   */
  const handleDragStart = (event: DndKit.DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  /**
   * Handles the end of a drag operation for reordering swimlane configurations.
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
      <h4>Manage Kanban Swimlanes</h4>
      <label htmlFor="kanban-kid-select" style={{ marginRight: '8px' }}>Select Kid:</label>
      <select
        id="kanban-kid-select"
        onChange={handleKidSelection}
        value={selectedKidId || ''}
        style={{ marginBottom: '10px' }}
        aria-label="Select a kid to manage their Kanban swimlanes"
      >
        <option value="">Select a Kid</option>
        {kids.map(kid => (
          <option key={kid.id} value={kid.id}>{kid.name}</option>
        ))}
      </select>

      {selectedKidId && (
        <div>
          <h5 id={`add-swimlane-heading-${selectedKidId}`}>Add New Swimlane for {kids.find(k => k.id === selectedKidId)?.name}</h5>
          <label htmlFor={`new-swimlane-title-input-${selectedKidId}`} style={{display: 'none'}}>Title for new swimlane</label> {/* Visually hidden label */}
          <input
            id={`new-swimlane-title-input-${selectedKidId}`}
            type="text"
            value={newColumnTitle} // Value from state newColumnTitle
            onChange={(e) => setNewColumnTitle(e.target.value)}
            placeholder="New swimlane title"
            aria-label="Title for new swimlane"
            aria-labelledby={`add-swimlane-heading-${selectedKidId}`}
            style={{ marginRight: '8px' }}
          />
          <input
            type="color"
            value={newColumnColor}
            onChange={(e) => setNewColumnColor(e.target.value)}
            aria-label="Color for new swimlane"
            style={{ marginRight: '8px', marginLeft: '4px' }}
          />
          <label style={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={newColumnIsCompleted}
              onChange={(e) => setNewColumnIsCompleted(e.target.checked)}
              aria-label="Mark as 'Done' column for new swimlane"
            />
             <span style={{fontSize: '0.9em', marginLeft: '4px'}}>Is 'Done' Column?</span>
          </label>
          <button onClick={handleAddColumn}>Add Swimlane</button>

          <h5 style={{ marginTop: '20px' }} id={`existing-swimlanes-heading-${selectedKidId}`}>Existing Swimlanes:</h5>
          {columnsForSelectedKid.length === 0 && (
            <div>
              <p>No custom swimlanes defined for this kid.</p>
              <button onClick={handleSetupDefaultColumns}>Setup Default Swimlanes (To Do, In Progress, Done)</button>
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
               * labelled by the "Existing Swimlanes" heading.
               */}
              <div role="list" aria-labelledby={`existing-swimlanes-heading-${selectedKidId}`}>
                <SortableContext items={columnsForSelectedKid.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {columnsForSelectedKid.map(config => (
                    <SortableSwimlaneItem
                      key={config.id}
                    config={config}
                    onEdit={handleEditColumn} // Method name unchanged
                    onDelete={handleDeleteColumn} // Method name unchanged
                    isEditing={editingColumn?.id === config.id} // State variable name unchanged
                    currentEditTitle={currentEditTitle}
                    onEditTitleChange={setCurrentEditTitle}
                    currentEditColor={currentEditColor}
                    onEditColorChange={setCurrentEditColor}
                    currentEditIsCompleted={currentEditIsCompleted}
                    onEditIsCompletedChange={setCurrentEditIsCompleted}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                  />
                ))}
              </SortableContext>
              <DndKit.DragOverlay>
                {activeDragId && editingColumn?.id !== activeDragId ? ( // Don't show overlay if editing the dragged item
                  <div style={{ padding: '8px', border: '1px dashed #555', backgroundColor: columnsForSelectedKid.find(c => c.id === activeDragId)?.color || '#eee'}}>
                    {columnsForSelectedKid.find(c => c.id === activeDragId)?.title} {/* State variable name unchanged */}
                  </div>
                ) : null}
              </DndKit.DragOverlay>
              </div>
            </DndKit.DndContext>
          )}
        </div>
      )}
    </div>
  );
};

export default KanbanSettingsView;
