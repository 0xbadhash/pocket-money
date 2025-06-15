// src/ui/kanban_components/DateColumnView.tsx
import React, { useMemo } from 'react';
import KanbanCard from './KanbanCard';
import { useChoresContext } from '../../contexts/ChoresContext';
import { useUserContext } from '../../contexts/UserContext';
import type { MatrixKanbanCategory, ChoreInstance, ChoreDefinition, KanbanColumnConfig } from '../../types';

// Duplicate import removed by consolidation above

interface DateColumnViewProps {
  date: Date;
  onEditChore?: (chore: ChoreDefinition) => void;
  getSwimlaneId?: (dateString: string, category: MatrixKanbanCategory) => string; // May not be needed if dndContext defines droppable areas based on swimlaneConfig.id + date
  kidId?: string;
  swimlaneConfig: KanbanColumnConfig;
  selectedInstanceIds: string[];
  onToggleSelection: (instanceId: string, isSelected: boolean) => void;
}

const DateColumnView: React.FC<DateColumnViewProps> = ({
  date,
  onEditChore,
  // getSwimlaneId, // Keep if needed for drag-n-drop ID generation
  kidId,
  swimlaneConfig,
  selectedInstanceIds,
  onToggleSelection,
}) => {
  const { choreInstances, choreDefinitions } = useChoresContext();

  const dateString = date.toISOString().split('T')[0];

  // Determine swimlane key (MatrixKanbanCategory) for filtering chores.
  // This logic maps the user-defined swimlane title to one of the fixed chore statuses.
  let choreFilterKey: MatrixKanbanCategory = 'TO_DO'; // Default category
  const configTitleUpper = swimlaneConfig.title.toUpperCase();
  if (configTitleUpper.includes('PROGRESS')) {
    choreFilterKey = 'IN_PROGRESS';
  } else if (configTitleUpper.includes('COMPLETE') || configTitleUpper.includes('DONE')) {
    choreFilterKey = 'COMPLETED';
  }
  // If a swimlane is titled "Archive" or similar, it might not map to these,
  // so chores won't appear unless their categoryStatus is explicitly set,
  // or this logic is expanded. For now, it defaults to TO_DO if no keywords match.

  // Show all chores (including recurring) for this kid, date, and mapped swimlane category (choreFilterKey)
  const choresForThisDate = useMemo(
    () =>
      choreInstances.filter((instance) => {
        const def = choreDefinitions.find(d => d.id === instance.choreDefinitionId);
        return (
          def &&
          (!def.isComplete) && // Definition is not archived
          (!kidId || def.assignedKidId === kidId) &&
          instance.instanceDate === dateString &&
          instance.categoryStatus === choreFilterKey // Filter by the mapped MatrixKanbanCategory
        );
      }),
    [choreInstances, dateString, kidId, choreDefinitions, choreFilterKey]
  );

  // Determine text color based on background luminance (simple version)
  // This helps ensure text is readable on different background colors.
  const getTextColorForBackground = (hexColor: string): string => {
    if (!hexColor) return '#333333'; // Default dark text
    try {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#333333' : '#FFFFFF'; // Dark text on light bg, White text on dark bg
    } catch (e) {
      return '#333333'; // Fallback in case of parsing error
    }
  };

  const backgroundColor = swimlaneConfig.color || '#FFFFFF'; // Default to white if no color
  const textColor = getTextColorForBackground(backgroundColor);

  return (
    <div
      // className is kept for potential specific styling not overridden by inline styles
      className={`swimlane-view swimlane-${swimlaneConfig.title.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        backgroundColor: backgroundColor,
        color: textColor,
        borderLeft: `4px solid ${swimlaneConfig.color || '#CCCCCC'}`, // Use swimlane color or default gray for border
        borderRadius: 6,
        marginBottom: 8,
        padding: '8px 6px 8px 12px',
        minHeight: 80,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        transition: 'background-color 0.2s, color 0.2s', // Smooth transition for color changes
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: '1em' }}>
        {swimlaneConfig.title}
      </div>
      {choresForThisDate.length === 0 ? (
        <p style={{fontSize: '0.8em', color: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)', textAlign: 'center', marginTop: '20px' }}>
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
