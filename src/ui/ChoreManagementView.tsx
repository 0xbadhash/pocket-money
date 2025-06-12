// src/ui/ChoreManagementView.tsx
import React from 'react'; // useContext might be needed if fetching kids here
import AddChoreForm from './chore_components/AddChoreForm'; // Import AddChoreForm
import ChoreList from './chore_components/ChoreList';       // Import ChoreList
import { useChoresContext } from '../contexts/ChoresContext'; // Import useChoresContext
// import { UserContext } from '../../contexts/UserContext'; // Only if passing kids explicitly

const ChoreManagementView = () => {
  const { choreDefinitions } = useChoresContext(); // Get choreDefinitions from context
  // const userContext = useContext(UserContext); // Example if passing kids as prop
  // const kids = userContext?.user?.kids || [];

  // For now, display all chores. Filtering can be added later.
  const choresToDisplay = choreDefinitions || [];

  return (
    <div className="chore-management-view" style={{ padding: '16px' }}>
      <header className="view-header">
        <h1>Chore Management</h1>
      </header>

      <section className="add-chore-section" style={{ marginBottom: '20px' }}>
        <h2>Assign New Chore</h2>
        <AddChoreForm /> {/* Render AddChoreForm */}
      </section>

      <section className="chore-list-section">
        <h2>Chore List</h2>
        {/* Render ChoreList, passing chores from context */}
        <ChoreList choresToDisplay={choresToDisplay} /* kids={kids} // If passing kids explicitly */ />
      </section>
    </div>
  );
};

export default ChoreManagementView;
