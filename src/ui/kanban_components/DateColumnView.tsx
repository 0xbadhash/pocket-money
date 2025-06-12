// src/ui/kanban_components/DateColumnView.tsx
import React from 'react';
import CategorySwimlaneView from './CategorySwimlaneView';
import { MatrixKanbanCategory } from '../../types';

interface DateColumnViewProps {
  date: Date;
}

const DateColumnView: React.FC<DateColumnViewProps> = ({ date }) => {
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
    </div>
  );
};

export default DateColumnView;
