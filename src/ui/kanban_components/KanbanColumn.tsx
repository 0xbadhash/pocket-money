// src/ui/kanban_components/KanbanColumn.tsx
import React from 'react';
import type { KanbanColumn as KanbanColumnType, ChoreInstance, ChoreDefinition } from '../../types';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  column: KanbanColumnType;
  getDefinitionForInstance: (instance: ChoreInstance) => ChoreDefinition | undefined;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, getDefinitionForInstance }) => {
  return (
    <div className="kanban-column" style={{ border: '1px solid #eee', padding: '10px', borderRadius: '5px', minWidth: '250px', backgroundColor: '#f9f9f9' }}>
      <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>{column.title}</h3>
      <div className="kanban-cards-container" style={{ minHeight: '100px' }}>
        {column.chores.length > 0 ? (
          column.chores.map(instance => { // This is now an array of ChoreInstance
            const definition = getDefinitionForInstance(instance);
            if (!definition) {
              console.warn(`Definition not found for instance ${instance.id}`);
              return null;
            }
            return (
              <KanbanCard
                key={instance.id}
                instance={instance} // Pass instance
                definition={definition} // Pass definition
              />
            );
          })
        ) : (
          <p style={{ color: '#888', textAlign: 'center', paddingTop: '20px' }}>No chores in this column.</p>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
