// src/ui/kanban_components/CategorySwimlaneView.tsx
import React from 'react';
import { MatrixKanbanCategory, ChoreInstance, ChoreDefinition } from '../../types';
import KanbanCard from './KanbanCard';
import { useChoresContext } from '../../contexts/ChoresContext';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface CategorySwimlaneViewProps {
  date: Date;
  category: MatrixKanbanCategory;
}

const CategorySwimlaneView: React.FC<CategorySwimlaneViewProps> = ({ date, category }) => {
  const { choreInstances, choreDefinitions } = useChoresContext();
  const droppableId = `${date.toISOString().split('T')[0]}-${category}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
  });

  const getDefinitionForInstance = (instance: ChoreInstance): ChoreDefinition | undefined => {
    return choreDefinitions.find(def => def.id === instance.choreDefinitionId);
  };

  const relevantChores = choreInstances.filter(
    instance => instance.instanceDate === date.toISOString().split('T')[0] && instance.categoryStatus === category
  );

  const choreInstanceIds = relevantChores.map(instance => instance.id);

  const categoryTitles: Record<MatrixKanbanCategory, string> = {
    TO_DO: "To Do",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed"
  };

  // Basic styling for visual distinction - can be enhanced with CSS classes
  const swimlaneStyles: Record<MatrixKanbanCategory, React.CSSProperties> = {
    TO_DO: { backgroundColor: isOver ? '#fff9c4' : '#ffecb3', borderLeft: '3px solid #ffd54f' },
    IN_PROGRESS: { backgroundColor: isOver ? '#e3f2fd' : '#bbdefb', borderLeft: '3px solid #64b5f6' },
    COMPLETED: { backgroundColor: isOver ? '#e8f5e9' : '#c8e6c9', borderLeft: '3px solid #81c784' }
  };

  return (
    <div
      ref={setNodeRef}
      className={`category-swimlane-view category-${category.toLowerCase()} ${isOver ? 'over' : ''}`}
      style={{
        border: '1px solid #e0e0e0',
        padding: '8px',
        minHeight: '120px',
        borderRadius: '4px',
        transition: 'background-color 0.2s ease-in-out',
        ...swimlaneStyles[category]
      }}
    >
      <h5 style={{ marginTop: '0', marginBottom: '8px', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
        {categoryTitles[category]}
      </h5>
      <SortableContext items={choreInstanceIds} strategy={verticalListSortingStrategy}>
        <div className="cards-container" style={{ minHeight: '80px' }}>
          {relevantChores.length > 0 ? (
            relevantChores.map(instance => {
              const definition = getDefinitionForInstance(instance);
              if (!definition) {
                console.warn(`Definition not found for instance ${instance.id} in swimlane ${category} for date ${date.toISOString().split('T')[0]}`);
                return null;
              }
              return <KanbanCard key={instance.id} instance={instance} definition={definition} />;
            })
          ) : (
            <p style={{fontSize: '0.8em', color: '#777', textAlign: 'center', marginTop: '20px' }}>
              No chores in {categoryTitles[category].toLowerCase()} for this date.
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export default CategorySwimlaneView;
