// src/ui/ChoreManagementView.tsx
import React from 'react';
// Placeholders for sub-components to be created later
// import AddChoreForm from './chore_components/AddChoreForm';
// import ChoreList from './chore_components/ChoreList';

const ChoreManagementView = () => {
  return (
    <div className="chore-management-view" style={{ padding: '16px' }}>
      <header className="view-header">
        <h1>Chore Management</h1>
      </header>

      <section className="add-chore-section" style={{ marginBottom: '20px' }}>
        <h2>Assign New Chore</h2>
        {/* Placeholder for AddChoreForm component */}
        <p>[Add Chore Form Placeholder]</p>
      </section>

      <section className="chore-list-section">
        <h2>Chore List</h2>
        {/* Placeholder for ChoreList component */}
        {/* Could also have filters here later, e.g., by kid, by completion status */}
        <p>[Chore List Placeholder]</p>
      </section>
    </div>
  );
};

export default ChoreManagementView;
