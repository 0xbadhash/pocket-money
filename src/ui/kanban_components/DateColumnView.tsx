// src/ui/kanban_components/DateColumnView.tsx
import React, { useMemo } from 'react';
import CategorySwimlaneView from './CategorySwimlaneView';
import KanbanCard from './KanbanCard';
import { useChoresContext } from '../../contexts/ChoresContext';
import type { MatrixKanbanCategory, ChoreInstance, ChoreDefinition } from '../../types';

interface DateColumnViewProps {
  date: Date;
  onEditChore?: (chore: ChoreDefinition) => void;
  getSwimlaneId?: (dateString: string, category: MatrixKanbanCategory) => string;
}

const DateColumnView: React.FC<DateColumnViewProps> = ({ date, onEditChore, getSwimlaneId }) => {
  const { choreInstances, choreDefinitions } = useChoresContext();

  const dateString = date.toISOString().split('T')[0];

  // Show only chores for this date and the correct category (e.g., "TO_DO")
  const choresForThisDate = useMemo(
    () =>
      choreInstances.filter(
        (instance) =>
          instance.instanceDate === dateString &&
          instance.categoryStatus === "TO_DO" // Only show "To Do" by default
      ),
    [choreInstances, dateString]
  );

  const getDefinitionForInstance = (instance: ChoreInstance) =>
    choreDefinitions.find((def) => def.id === instance.choreDefinitionId);

  // Handler for subtask click (toggle completion or show details)
  const handleSubtaskClick = (subtaskId: string) => {
    // Implement your logic here (e.g., toggle completion, open modal, etc.)
    alert(`Clicked subtask: ${subtaskId}`);
  };

  const categories: MatrixKanbanCategory[] = ["TO_DO", "IN_PROGRESS", "COMPLETED"];

  return (
    <div className="date-column-view" style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: '1 1 0px', minWidth: '150px' /* Adjust as needed */ }}>
      {/* Optional: Display date again here if header is separate or for clarity,
          but KidKanbanBoard already has a main date header for this column. */}
      {/* <h4 className="date-column-header-inline" style={{ textAlign: 'center', marginBottom: '5px' }}>
        {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
      </h4> */}
      {categories.map(category => (
        <CategorySwimlaneView
          key={category}
          date={date}
          category={category}
        />
      ))}
      {/* Assuming choresForThisDate and getDefinitionForInstance are available in this scope */}
      {choresForThisDate.map((instance) => {
        const definition = getDefinitionForInstance(instance);
        if (!definition) return null;
        return (
          <KanbanCard
            key={instance.id}
            instance={instance}
            definition={definition}
            onEditChore={onEditChore}
            onSubtaskClick={handleSubtaskClick}
          />
        );
      })}
    </div>
  );
};

export default DateColumnView;
