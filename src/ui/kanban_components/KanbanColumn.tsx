// src/ui/kanban_components/KanbanColumn.tsx
import React from 'react';
// Import ColumnThemeOption from types
import type { KanbanColumn as KanbanColumnType, ChoreInstance, ChoreDefinition, ColumnThemeOption } from '../../types';
import KanbanCard from './KanbanCard';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface KanbanColumnProps {
  column: KanbanColumnType;
  getDefinitionForInstance: (instance: ChoreInstance) => ChoreDefinition | undefined;
  theme: ColumnThemeOption; // Add theme prop
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, getDefinitionForInstance, theme }) => {
  const choreInstanceIds = column.chores.map(instance => instance.id);

  return (
    <div
      className={`kanban-column kanban-column-theme-${theme}`} // Dynamically set class
      style={{
        // border: '1px solid #eee', // Will be managed by theme CSS or base .kanban-column style
        padding: '10px',
        borderRadius: 'var(--border-radius-lg)', // Keep or manage via theme
        minWidth: '250px', // Adjusted this in styles.css, but keeping it here for now to avoid breaking if styles.css is not loaded
        // backgroundColor: '#f9f9f9', // Removed, will be handled by theme CSS
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)' // Keep or manage via theme/base
      }}
    >
      <h3 style={{
          // borderBottom: '1px solid #ddd', // Will be managed by theme CSS or base .kanban-column h3 style
          paddingBottom: '5px', // Adjusted this in styles.css
          marginBottom: '10px' // This is now `gap` in styles.css for the parent .kanban-column
          // color: var(--text-color-strong) // Removed, will be handled by theme CSS
        }}
      >
        {column.title}
      </h3>
      <SortableContext items={choreInstanceIds} strategy={verticalListSortingStrategy}>
        <div className="kanban-cards-container" style={{ minHeight: '100px' }}>
          {column.chores.length > 0 ? (
            column.chores.map(instance => {
              const definition = getDefinitionForInstance(instance);
              if (!definition) {
                console.warn(`Definition not found for instance ${instance.id}`);
                return null;
              }
              return (
                <KanbanCard
                  key={instance.id}
                  instance={instance}
                  definition={definition}
                />
              );
            })
          ) : (
            <p style={{ color: '#888', textAlign: 'center', paddingTop: '20px' }}>No chores in this column.</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export default KanbanColumn;
