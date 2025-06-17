// src/ui/kanban_components/DateColumnView.tsx
import React, { useMemo } from 'react';
import KanbanCard from './KanbanCard';
import { useChoresContext } from '../../contexts/ChoresContext';
// useUserContext is not used in this component after changes.
// import { useUserContext } from '../../contexts/UserContext';
import type { MatrixKanbanCategory, ChoreInstance, ChoreDefinition } from '../../types';
import { useDroppable } from '@dnd-kit/core';

interface DateColumnViewProps {
  date: Date;
  category: MatrixKanbanCategory;
  onEditChore?: (chore: ChoreDefinition) => void;
  kidId?: string;
  selectedInstanceIds: string[];
  onToggleSelection: (instanceId: string, isSelected: boolean) => void;
}

const categoryDisplayTitles: Record<MatrixKanbanCategory, string> = {
  TO_DO: "To Do",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed"
};

const categoryStyles: Record<MatrixKanbanCategory, { backgroundColor: string; textColor: string; borderColor: string }> = {
  TO_DO: { backgroundColor: '#FFEBEB', textColor: '#A31A1A', borderColor: '#FFC5C5' }, // Light Red
  IN_PROGRESS: { backgroundColor: '#EBF5FF', textColor: '#1A57A3', borderColor: '#C5E0FF' }, // Light Blue
  COMPLETED: { backgroundColor: '#EBFFF0', textColor: '#1A7A2E', borderColor: '#C5FFD6' }, // Light Green
};


const DateColumnView: React.FC<DateColumnViewProps> = ({
  date,
  category,
  onEditChore,
  kidId,
  selectedInstanceIds,
  onToggleSelection,
}) => {
  const { choreInstances, choreDefinitions } = useChoresContext();
  const dateString = date.toISOString().split('T')[0];
  const choreFilterKey = category; // Directly use the category prop

  const droppableId = `${dateString}|${category}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const choresForThisDate = useMemo(
    () =>
      choreInstances.filter((instance) => {
        const def = choreDefinitions.find(d => d.id === instance.choreDefinitionId);
        return (
          def &&
          (!def.isComplete) &&
          (!kidId || def.assignedKidId === kidId) &&
          instance.instanceDate === dateString &&
          instance.categoryStatus === choreFilterKey
        );
      }),
    [choreInstances, dateString, kidId, choreDefinitions, choreFilterKey]
  );

  const styles = categoryStyles[category] || { backgroundColor: '#FFFFFF', textColor: '#333333', borderColor: '#CCCCCC' };

  return (
    <div
      ref={setNodeRef}
      className={`swimlane-view swimlane-${category.toLowerCase().replace(/_/g, '-')}`}
      style={{
        backgroundColor: isOver ? '#D3D3D3' : styles.backgroundColor, // Example hover effect
        color: styles.textColor,
        borderLeft: `4px solid ${styles.borderColor}`,
        borderRadius: 6,
        marginBottom: 8,
        padding: '8px 6px 8px 12px',
        minHeight: 80,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        transition: 'background-color 0.2s, color 0.2s',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: '1em' }}>
        {categoryDisplayTitles[category]}
      </div>
      {choresForThisDate.length === 0 ? (
        <p style={{fontSize: '0.8em', color: styles.textColor === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)', textAlign: 'center', marginTop: '20px' }}>
          No chores here for this date.
        </p>
      ) : (
        choresForThisDate.map((instance) => {
          const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
          if (!definition) return null;
          return (
            <KanbanCard
              key={instance.id}
              instance={instance}
              definition={definition}
              onEditChore={onEditChore}
              isSelected={selectedInstanceIds.includes(instance.id)}
              onToggleSelection={onToggleSelection}
            />
          );
        })
      )}
    </div>
  );
};

export default React.memo(DateColumnView);
