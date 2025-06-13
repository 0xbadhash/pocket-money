// src/ui/kanban_components/DateColumnView.tsx
import React, { useMemo } from 'react';
import KanbanCard from './KanbanCard';
import { useChoresContext } from '../../contexts/ChoresContext';
import { useUserContext } from '../../contexts/UserContext';
import type { MatrixKanbanCategory, ChoreInstance, ChoreDefinition } from '../../types';

interface DateColumnViewProps {
  date: Date;
  onEditChore?: (chore: ChoreDefinition) => void;
  getSwimlaneId?: (dateString: string, category: MatrixKanbanCategory) => string;
  kidId?: string;
  swimlaneCategory?: string;
  swimlaneId?: string;
}

// Default swimlane color mapping (can be extended to use settings)
const DEFAULT_SWIMLANE_COLORS: Record<string, React.CSSProperties> = {
  'TO_DO': { background: '#fff', color: '#222', borderLeft: '4px solid #bbb' },
  'IN_PROGRESS': { background: '#fffbe7', color: '#8a6d1b', borderLeft: '4px solid #ffe082' },
  'COMPLETED': { background: '#e8f5e9', color: '#256029', borderLeft: '4px solid #81c784' },
};

// Add a new modern "Oceanic" theme for swimlanes
const OCEANIC_SWIMLANE_COLORS: Record<string, React.CSSProperties> = {
  'TO_DO': { background: '#e3f2fd', color: '#01579b', borderLeft: '4px solid #0288d1' },         // Light blue
  'IN_PROGRESS': { background: '#e0f7fa', color: '#006064', borderLeft: '4px solid #26c6da' },  // Aqua
  'COMPLETED': { background: '#e8f5e9', color: '#1b5e20', borderLeft: '4px solid #43a047' },    // Green
};

// To use the theme, swap DEFAULT_SWIMLANE_COLORS with OCEANIC_SWIMLANE_COLORS below:
const THEME = OCEANIC_SWIMLANE_COLORS; // Change this to switch themes

const DateColumnView: React.FC<DateColumnViewProps> = ({
  date,
  onEditChore,
  getSwimlaneId,
  kidId,
  swimlaneCategory,
  swimlaneId,
}) => {
  const { choreInstances, choreDefinitions } = useChoresContext();

  const dateString = date.toISOString().split('T')[0];

  // Determine swimlane key (MatrixKanbanCategory) from swimlaneCategory or swimlaneId
  let swimlaneKey: string = '';
  if (swimlaneCategory) {
    if (swimlaneCategory.toUpperCase().includes('PROGRESS')) swimlaneKey = 'IN_PROGRESS';
    else if (swimlaneCategory.toUpperCase().includes('COMPLETE')) swimlaneKey = 'COMPLETED';
    else swimlaneKey = 'TO_DO';
  } else if (swimlaneId) {
    swimlaneKey = swimlaneId;
  }

  // Show all chores (including recurring) for this kid, date, and swimlane
  const choresForThisDate = useMemo(
    () =>
      choreInstances.filter((instance) => {
        const def = choreDefinitions.find(d => d.id === instance.choreDefinitionId);
        // Show if:
        // - assigned to this kid
        // - instance is for this date
        // - instance is in this swimlane/category
        // - definition is not archived
        return (
          def &&
          (!def.isComplete) &&
          (!kidId || def.assignedKidId === kidId) &&
          instance.instanceDate === dateString &&
          instance.categoryStatus === swimlaneKey
        );
      }),
    [choreInstances, dateString, kidId, choreDefinitions, swimlaneKey]
  );

  // Pick color style for swimlane
  const swimlaneStyle = THEME[swimlaneKey] || { background: '#f5f5f5', color: '#333' };

  return (
    <div
      className={`swimlane-view swimlane-${swimlaneKey.toLowerCase()}`}
      style={{
        ...swimlaneStyle,
        borderRadius: 6,
        marginBottom: 8,
        padding: '8px 6px 8px 12px',
        minHeight: 80,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        transition: 'background 0.2s'
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: '1em' }}>
        {swimlaneCategory || swimlaneKey}
      </div>
      {choresForThisDate.length === 0 ? (
        <p style={{fontSize: '0.8em', color: '#777', textAlign: 'center', marginTop: '20px' }}>
          No chores in this swimlane for this date.
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
            />
          );
        })
      )}
    </div>
  );
};

export default DateColumnView;
