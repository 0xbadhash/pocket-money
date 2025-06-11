/**
 * @file KanbanColumn.tsx
 * Represents a single column within the Kanban board.
 * Displays a list of Kanban cards (chores) and serves as a droppable area for dnd-kit.
 * It is labelled by its own title for accessibility.
 */
import React from 'react';
import type { KanbanColumn as KanbanColumnType, ChoreInstance, ChoreDefinition, ColumnThemeOption } from '../../types';
import KanbanCard from './KanbanCard';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

/**
 * @interface KanbanColumnProps
 * Props for the KanbanColumn component.
 */
interface KanbanColumnProps {
  /** The data for the column, including its ID, title, and the list of chores it contains. */
  column: KanbanColumnType;
  /**
   * Function to retrieve the full chore definition for a given chore instance.
   * @param {ChoreInstance} instance - The chore instance.
   * @returns {ChoreDefinition | undefined} The corresponding chore definition.
   */
  getDefinitionForInstance: (instance: ChoreInstance) => ChoreDefinition | undefined;
  /** The visual theme to apply to the column. */
  theme: ColumnThemeOption;
}

/**
 * KanbanColumn component.
 * Renders a single column in the Kanban board, displaying its title and a list of chore cards.
 * It uses `SortableContext` from dnd-kit to make the cards within it sortable.
 * The column itself is a `role="group"` labelled by its title for screen readers.
 * @param {KanbanColumnProps} props - The component props.
 * @returns {JSX.Element} The KanbanColumn UI.
 */
const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, getDefinitionForInstance, theme }) => {
  /** Array of chore instance IDs, used by `SortableContext` to identify draggable items. */
  const choreInstanceIds = column.chores.map(instance => instance.id);
  /** Generates a unique ID for the column title, used for `aria-labelledby`. */
  const titleId = `kanban-column-title-${column.id}`;

  return (
    <div
      className={`kanban-column kanban-column-theme-${theme}`}
      role="group" // A column is a group of related content (header + list of cards)
      aria-labelledby={titleId} // Labelled by its own h3 title
      style={{
        // Inline styles are kept as they might be dynamically calculated or placeholders
        // for values not yet fully managed by global CSS or theming.
        padding: '10px',
        borderRadius: 'var(--border-radius-lg)',
        minWidth: '250px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}
    >
      <h3
        id={titleId} // ID for aria-labelledby
        style={{
          // These inline styles are overridden by CSS in src/styles.css for themed columns
          // but are kept here as fallbacks or for non-themed scenarios if any.
          paddingBottom: '5px',
          marginBottom: '10px'
        }}
      >
        {column.title}
      </h3>
      <SortableContext items={choreInstanceIds} strategy={verticalListSortingStrategy}>
        {/* Container for the chore cards within this column.
            Labelled for screen readers to provide context for the list of cards. */}
        <div
          className="kanban-cards-container"
          style={{ minHeight: '100px' }}
          aria-label={`Chores in ${column.title} column`}
        >
          {column.chores.length > 0 ? (
            column.chores.map(instance => {
              const definition = getDefinitionForInstance(instance);
              if (!definition) {
                console.warn(`Definition not found for instance ${instance.id}`);
                return null; // Skip rendering if definition is missing
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
            /**
             * Represents the visual state of a Kanban column when it contains no chores.
             * Styled with a dashed border and a message to indicate emptiness.
             */
            <div className="kanban-column-empty-state">
              <p>No chores here yet!</p>
              {/* Optional: Add an SVG icon here later if desired */}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export default KanbanColumn;
