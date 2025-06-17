// src/ui/kanban_components/DateColumnView.tsx
import React, { useMemo } from 'react';
import KanbanCard from './KanbanCard';
import { useChoresContext } from '../../contexts/ChoresContext';
import type { ChoreInstance, ChoreDefinition, KanbanColumnConfig } from '../../types';
import { useDroppable } from '@dnd-kit/core';

interface DateColumnViewProps {
  date: Date;
  statusColumn: KanbanColumnConfig;
  onEditChore?: (chore: ChoreDefinition) => void;
  kidId?: string;
  selectedInstanceIds: string[];
  onToggleSelection: (instanceId: string, isSelected: boolean) => void;
  isToday?: boolean;
  onCardClick?: (instance: ChoreInstance, definition: ChoreDefinition) => void; // New prop
}

// Removed categoryDisplayTitles and categoryStyles

const DateColumnView: React.FC<DateColumnViewProps> = ({
  date,
  statusColumn, // Changed from category
  onEditChore,
  kidId,
  selectedInstanceIds,
  onToggleSelection,
  isToday, // Ensure isToday is destructured
  onCardClick, // Destructure new prop
}) => {
  const { choreInstances, choreDefinitions } = useChoresContext();
  const dateString = date.toISOString().split('T')[0];

  const droppableId = `${dateString}|${statusColumn.id}`; // Use statusColumn.id
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  const choresForThisDate = useMemo(
    () =>
      choreInstances.filter((instance) => {
        const def = choreDefinitions.find(d => d.id === instance.choreDefinitionId);
        return (
          def &&
          (!def.isComplete) && // Chore definition is active
          (!kidId || def.assignedKidId === kidId) && // Belongs to the current kid (if kidId is provided)
          instance.instanceDate === dateString && // Matches the current date column
          instance.categoryStatus === statusColumn.id // Matches the current status column
        );
      }),
    [choreInstances, dateString, kidId, choreDefinitions, statusColumn.id] // Depend on statusColumn.id
  );

  // Define default styles and override with statusColumn.color if available
  const defaultBackgroundColor = '#F0F0F0'; // A neutral default
  const defaultTextColor = '#333333';
  const defaultBorderColor = '#CCCCCC';

  let currentBackgroundColor = statusColumn.color || defaultBackgroundColor;
  if (isOver) {
    currentBackgroundColor = '#D3D3D3'; // Hover effect
  }
  // Note: isToday styling for individual DateColumnView is subtle,
  // primary highlight is on the header and column container via KidKanbanBoard.
  // Adding a specific border or slight background adjustment here if needed.

  const columnStyle = {
    backgroundColor: currentBackgroundColor,
    color: defaultTextColor,
    borderLeft: `4px solid ${statusColumn.color || defaultBorderColor}`,
    // Example: Add a subtle right border to each column inside a "today" container for emphasis
    borderRight: isToday ? `1px dashed var(--primary-color-light, #7bceff)` : `1px solid transparent`,
  };


  return (
    <div
      ref={setNodeRef}
      className={`swimlane-view swimlane-custom-${statusColumn.id} ${isToday ? 'today' : ''}`}
      style={{
        ...columnStyle,
        borderRadius: 6,
        marginBottom: 8,
        padding: '8px 6px 8px 12px',
        minHeight: 80,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        transition: 'background-color 0.2s, color 0.2s',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: '1em' }}>
        {statusColumn.title} {/* Use statusColumn.title */}
      </div>
      {choresForThisDate.length === 0 ? (
        <p style={{fontSize: '0.8em', color: columnStyle.color === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)', textAlign: 'center', marginTop: '20px' }}>
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
              onCardClick={onCardClick} // Pass it down
            />
          );
        })
      )}
    </div>
  );
};

export default React.memo(DateColumnView);
