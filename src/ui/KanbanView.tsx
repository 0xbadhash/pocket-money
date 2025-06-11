/**
 * @file KanbanView.tsx
 * Main view for displaying and interacting with Kanban boards for kids' chores.
 * Allows users to select a kid to view their specific chore Kanban board.
 */
import React, { useState, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { Kid } from '../types';
import KidKanbanBoard from './kanban_components/KidKanbanBoard';

/**
 * KanbanView component.
 * Renders a kid selection dropdown and the Kanban board for the selected kid.
 * It relies on UserContext to get the list of kids.
 * @returns {JSX.Element} The KanbanView UI.
 */
const KanbanView: React.FC = () => {
  const userContext = useContext(UserContext);
  const kids = userContext?.user?.kids || [];

  /**
   * State for the currently selected kid's ID.
   * Null if no kid is selected.
   * @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]}
   */
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);

  if (userContext?.loading) {
    return <p>Loading user data...</p>;
  }

  /**
   * Handles changes in the kid selection dropdown.
   * Updates the selectedKidId state with the new value.
   * @param {React.ChangeEvent<HTMLSelectElement>} event - The change event from the select element.
   */
  const handleKidSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedKidId(event.target.value || null); // Ensure null if value is empty string
  };

  return (
    <div className="kanban-view" style={{ padding: '16px' }}>
      <header className="view-header">
        <h1>Chore Kanban Board</h1>
      </header>

      <section className="kid-selection" style={{ marginBottom: '20px' }}>
        <h2>Select Kid</h2>
        {kids.length > 0 ? (
          <select onChange={handleKidSelection} value={selectedKidId || ''} aria-label="Select a kid">
            <option value="" disabled>Select a kid</option>
            {kids.map((kid: Kid) => (
              <option key={kid.id} value={kid.id}>
                {kid.name}
              </option>
            ))}
          </select>
        ) : (
          <p>No kids found. Please add kids in settings.</p>
        )}
      </section>

      {selectedKidId ? (
        <KidKanbanBoard kidId={selectedKidId} />
      ) : (
        kids.length > 0 && <p>Select a kid to view their Kanban board.</p> // Show only if kids exist but none selected
      )}
    </div>
  );
};

export default KanbanView;
