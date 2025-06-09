// src/ui/kanban_components/KanbanColumn.tsx
import React from 'react';
import type { KanbanColumn as KanbanColumnType } from '../../types';
import KanbanCard from './KanbanCard'; // Will be created later

interface KanbanColumnProps {
  column: KanbanColumnType;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column }) => {
  return (
    <div className="kanban-column" style={{ border: '1px solid #eee', padding: '10px', borderRadius: '5px', minWidth: '250px', backgroundColor: '#f9f9f9' }}>
      <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>{column.title}</h3>
      <div className="kanban-cards-container" style={{ minHeight: '100px' /* So drop targets are visible for empty columns */ }}>
        {column.chores.length > 0 ? (
          column.chores.map(chore => (
            <KanbanCard key={chore.id} chore={chore} /> // This will be enabled once KanbanCard is created
            // <div key={chore.id} className="kanban-card-placeholder" style={{ border: '1px dashed #aaa', padding: '8px', marginBottom: '8px', backgroundColor: '#fff' }}>
            //   <p>{chore.title}</p>
            //   <p><small>{chore.isComplete ? "Completed" : "Pending"}</small></p>
            // </div>
          ))
        ) : (
          <p style={{ color: '#888', textAlign: 'center', paddingTop: '20px' }}>No chores in this column.</p>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
