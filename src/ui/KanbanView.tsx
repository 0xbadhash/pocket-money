// src/ui/KanbanView.tsx
import React, { useState, useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import type { Kid } from '../types';
import KidKanbanBoard from './kanban_components/KidKanbanBoard'; // Will be created later

const KanbanView: React.FC = () => {
  const userContext = useContext(UserContext);
  const kids = userContext?.user?.kids || [];
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);

  if (userContext?.loading) {
    return <p>Loading user data...</p>;
  }

  const handleKidSelection = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedKidId(event.target.value);
  };

  return (
    <div className="kanban-view" style={{ padding: '16px' }}>
      <header className="view-header">
        <h1>Chore Kanban Board</h1>
      </header>

      <section className="kid-selection" style={{ marginBottom: '20px' }}>
        <h2>Select Kid</h2>
        {kids.length > 0 ? (
          <select onChange={handleKidSelection} value={selectedKidId || ''}>
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
        <KidKanbanBoard kidId={selectedKidId} /> // This will be enabled once KidKanbanBoard is created
        // <p>KidKanbanBoard for {kids.find(k => k.id === selectedKidId)?.name} will be here.</p>
      ) : (
        <p>Please select a kid to view their Kanban board.</p>
      )}
    </div>
  );
};

export default KanbanView;
