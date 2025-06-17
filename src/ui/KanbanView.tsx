/**
 * @file KanbanView.tsx
 * Main view for displaying and interacting with Kanban boards for kids' chores.
 * Allows users to select a kid to view their specific chore Kanban board.
 */
import React, { useState, useEffect } from 'react';
import { useUserContext } from '../contexts/UserContext';
import KidKanbanBoard from './kanban_components/KidKanbanBoard';
// import KanbanFilters from './kanban_components/KanbanFilters'; // If needed later

/**
 * KanbanView component.
 * Renders a kid selection dropdown and the Kanban board for the selected kid.
 * It relies on UserContext to get the list of kids.
 * @returns {JSX.Element} The KanbanView UI.
 */
const KanbanView: React.FC = () => {
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  const { user, loading: userLoading } = useUserContext();
  const kids = user?.kids || [];

  // Automatically select the first kid if available and none is selected
  useEffect(() => {
    if (!selectedKidId && kids.length > 0) {
      setSelectedKidId(kids[0].id);
    }
  }, [kids, selectedKidId]);

  const handleKidSelection = (kidId: string) => {
    setSelectedKidId(kidId);
  };

  if (userLoading) {
    return <p style={{ textAlign: 'center', marginTop: '20px' }}>Loading user data...</p>;
  }

  if (!user || kids.length === 0) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <p>No kids found. Please add kids in settings.</p>
        {/* Optionally, add a link/button to settings page if available */}
      </div>
    );
  }

  return (
    <div className="kanban-view" style={{ padding: '16px' }} data-testid="kanban-view-container">
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {kids.map(kid => (
          <button
            key={kid.id}
            onClick={() => handleKidSelection(kid.id)}
            style={{
              padding: '10px 15px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: selectedKidId === kid.id ? '#007bff' : '#f8f9fa',
              color: selectedKidId === kid.id ? 'white' : 'black',
              fontWeight: selectedKidId === kid.id ? 'bold' : 'normal',
            }}
          >
            {kid.name}
          </button>
        ))}
      </div>

      {selectedKidId ? (
        <KidKanbanBoard kidId={selectedKidId} />
      ) : (
        <p style={{ textAlign: 'center', marginTop: '20px' }}>Select a kid to view their Kanban board.</p>
      )}
      {/* Future location for KanbanFilters if re-added */}
      {/* {selectedKidId && <KanbanFilters ... />} */}
    </div>
  );
};

export default KanbanView;
