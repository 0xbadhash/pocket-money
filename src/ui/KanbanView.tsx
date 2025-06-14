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
   * Handles the selection of a kid.
   * Updates the selectedKidId state with the ID of the clicked kid.
   * @param {string} kidId - The ID of the kid to select.
   */
  const handleKidSelection = (kidId: string) => {
    setSelectedKidId(kidId);
  };

  return (
    <div className="kanban-view" style={{ padding: '16px' }}>
      <header className="view-header">
        <h1>Chore Kanban Board</h1>
      </header>

      <section className="kid-selection" style={{ marginBottom: '20px' }}>
        <h2>Select Kid</h2>
        {kids.length > 0 ? (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {kids.map((kid: Kid) => (
              <button
                key={kid.id}
                onClick={() => handleKidSelection(kid.id)}
                style={{
                  fontWeight: selectedKidId === kid.id ? 'bold' : 'normal',
                  background: selectedKidId === kid.id ? '#1976d2' : '#f5f5f5', // Example active/inactive colors
                  color: selectedKidId === kid.id ? '#fff' : '#333',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                }}
                aria-pressed={selectedKidId === kid.id}
              >
                {kid.name}
              </button>
            ))}
          </div>
        ) : (
          <p>No kids found. Please add kids in settings.</p>
        )}
      </section>

      {selectedKidId ? (
        <KidKanbanBoard kidId={selectedKidId} />
      ) : (
        kids.length > 0 && <p>Select a kid to view their Kanban board.</p>
      )}
    </div>
  );
};

export default KanbanView;
