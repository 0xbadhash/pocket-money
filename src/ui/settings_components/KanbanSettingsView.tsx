/**
 * @file KanbanSettingsView.tsx
 * Component for managing custom Kanban column configurations for each kid.
 * Allows creating, reading, updating, deleting, and reordering Kanban columns.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useUserContext, User } from '../../contexts/UserContext'; // Assuming User type is exported from UserContext
import type { Kid, KanbanColumnConfig } from '../../types';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  Active,
  Over
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Represents a single sortable Kanban column configuration item in the settings UI.
 */
interface SortableColumnItemProps {
  config: KanbanColumnConfig;
  onEdit: (config: KanbanColumnConfig) => void;
  onDelete: (configId: string) => void;
  isEditing: boolean;
  currentEditTitle: string;
  onEditTitleChange: (title: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

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
    <div ref={setNodeRef} style={style} {...attributes}>
      {isEditing ? (
        <>
          <input
            type="text"
            value={currentEditTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            autoFocus
            style={{ flexGrow: 1, marginRight: '8px' }}
          />
          <button onClick={onSaveEdit} style={{ marginRight: '4px' }}>Save</button>
          <button onClick={onCancelEdit}>Cancel</button>
        </>
      ) : (
        <>
          <span {...listeners} style={{ flexGrow: 1 }}>{config.title} (Order: {config.order})</span>
          <div>
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

  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  const [columnsForSelectedKid, setColumnsForSelectedKid] = useState<KanbanColumnConfig[]>([]);
  const [editingColumn, setEditingColumn] = useState<KanbanColumnConfig | null>(null);
  const [currentEditTitle, setCurrentEditTitle] = useState<string>('');
  const [newColumnTitle, setNewColumnTitle] = useState<string>('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const kids = user?.kids || [];

  useEffect(() => {
    if (selectedKidId) {
      const configs = getKanbanColumnConfigs(selectedKidId);
      setColumnsForSelectedKid(configs);
    } else {
      setColumnsForSelectedKid([]);
    }
  }, [selectedKidId, user, getKanbanColumnConfigs]); // user dependency to refresh if configs change externally

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleKidSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const kidId = event.target.value;
    setSelectedKidId(kidId || null);
    setEditingColumn(null); // Reset editing state
  };

  const handleAddColumn = async () => {
    if (selectedKidId && newColumnTitle.trim()) {
      await addKanbanColumnConfig(selectedKidId, newColumnTitle.trim());
      setNewColumnTitle('');
      // Data will refresh via useEffect listening to 'user' context changes
    }
  };

  const handleEditColumn = (config: KanbanColumnConfig) => {
    setEditingColumn(config);
    setCurrentEditTitle(config.title);
  };

  const handleSaveEdit = async () => {
    if (editingColumn && currentEditTitle.trim()) {
      await updateKanbanColumnConfig({ ...editingColumn, title: currentEditTitle.trim() });
      setEditingColumn(null);
      setCurrentEditTitle('');
    }
  };

  const handleCancelEdit = () => {
    setEditingColumn(null);
    setCurrentEditTitle('');
  };

  const handleDeleteColumn = async (configId: string) => {
    if (selectedKidId && window.confirm('Are you sure you want to delete this column? Chores in this column will need to be reassigned.')) {
      await deleteKanbanColumnConfig(selectedKidId, configId);
      // TODO: Implement UI for chore reassignment or automatic reassignment to a default column.
      // For now, KidKanbanBoard will need to handle instances with missing kanbanColumnId.
    }
  };

  const handleSetupDefaultColumns = async () => {
    if (!selectedKidId) return;
    const defaultTitles = ["To Do", "In Progress", "Done"];
    // Ensure operations are sequential or UserContext handles batching if setUser is async
    for (const title of defaultTitles) {
        await addKanbanColumnConfig(selectedKidId, title);
    }
    // Re-fetch or rely on context update
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
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
      <select onChange={handleKidSelection} value={selectedKidId || ''} style={{ marginBottom: '10px' }}>
        <option value="">Select a Kid</option>
        {kids.map(kid => (
          <option key={kid.id} value={kid.id}>{kid.name}</option>
        ))}
      </select>

      {selectedKidId && (
        <div>
          <h5>Add New Column for {kids.find(k => k.id === selectedKidId)?.name}</h5>
          <input
            type="text"
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            placeholder="New column title"
            style={{ marginRight: '8px' }}
          />
          <button onClick={handleAddColumn}>Add Column</button>

          <h5 style={{ marginTop: '20px' }}>Existing Columns:</h5>
          {columnsForSelectedKid.length === 0 && (
            <div>
              <p>No custom columns defined for this kid.</p>
              <button onClick={handleSetupDefaultColumns}>Setup Default Columns (To Do, In Progress, Done)</button>
            </div>
          )}

          {columnsForSelectedKid.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
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
              <DragOverlay>
                {activeDragId && editingColumn?.id !== activeDragId ? ( // Don't show overlay if editing the dragged item
                  <div style={{ padding: '8px', border: '1px dashed #555', backgroundColor: '#eee'}}>
                    {columnsForSelectedKid.find(c => c.id === activeDragId)?.title}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
};

export default KanbanSettingsView;
