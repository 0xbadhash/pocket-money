// src/ui/DashboardView.tsx
import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useChoresContext } from '../contexts/ChoresContext'; // CHANGED: Use new context hook
import { UserRole, ParentUser as ParentUserType, KidUser, ChoreDefinition, ChoreInstance } from '../types'; // Renamed ParentUser, added ChoreDefinition, ChoreInstance
import { AddChoreForm } from '../components/AddChoreForm'; // Use the updated AddChoreForm
// import { EditChoreForm } from '../components/EditChoreForm'; // Will need to be updated to use ChoreDefinition/Instance
import { Link } from 'react-router-dom'; // Added for navigation with react-router-dom

// Helper to format recurrence for display (adapted to ChoreDefinition structure)
const formatChoreDefinitionRecurrence = (choreDef: ChoreDefinition): string => {
  if (choreDef.recurrenceType === 'one-time' || !choreDef.recurrenceType) return 'One-time';
  switch (choreDef.recurrenceType) {
    case 'daily': return 'Daily';
    case 'weekly': return `Weekly (Day ${choreDef.recurrenceDay !== null ? choreDef.recurrenceDay : 'N/A'})`;
    case 'monthly': return `Monthly (Day ${choreDef.recurrenceDay !== null ? choreDef.recurrenceDay : 'N/A'})`;
    // If 'specificDays' were supported in ChoreDefinition, logic would go here.
    default: return 'Recurring';
  }
};

const DashboardView: React.FC = () => { // Removed DashboardViewProps as onNavigate is handled by router
  const { currentUser } = useUser();
  const { choresDefinitions, toggleChoreInstanceComplete, deleteChoreDefinition } = useChoresContext(); // CHANGED: Use choreDefinitions, toggleChoreInstanceComplete, deleteChoreDefinition
  // const [editingChore, setEditingChore] = useState<ChoreDefinition | null>(null); // State for editing if you re-implement EditChoreForm for definitions

  const containerStyle: React.CSSProperties = {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    borderBottom: '1px solid #eee',
    paddingBottom: '10px',
    marginBottom: '20px',
  };

  const sectionStyle: React.CSSProperties = {
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #eee',
  };

  const kidsListStyle: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
  };

  const kidItemStyle: React.CSSProperties = {
    backgroundColor: '#f9f9f9',
    border: '1px solid #eee',
    borderRadius: '4px',
    padding: '10px 15px',
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9em',
  };

  if (!currentUser) {
    return (
      <div style={containerStyle}>
        <h1 style={headerStyle}>Dashboard</h1>
        <p>Please log in to view your dashboard.</p>
      </div>
    );
  }

  const parentUser = currentUser.role === UserRole.PARENT ? (currentUser as ParentUserType) : null;

  // Assuming you'd display ChoreInstances on the Dashboard, but for simplicity,
  // let's show ChoreDefinitions for management here as it's a common pattern.
  // In a full Kanban view, you'd generate and display instances.

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>Dashboard</h1>
      <p>Welcome to your dashboard, <strong>{currentUser.name}!</strong></p>

      <div>
        <p>This is your main dashboard area. From here, you can manage your account and access application features.</p>
      </div>

      {/* My Kids Section for Parent Users */}
      {parentUser && (
        <div style={sectionStyle}>
          <h2>My Kids</h2>
          {parentUser.kids && parentUser.kids.length > 0 ? (
            <ul style={kidsListStyle}>
              {parentUser.kids.map((kid: KidUser) => (
                <li key={kid.id} style={kidItemStyle}>
                  <div>
                    <strong>{kid.name}</strong> (Age: {kid.age !== undefined ? kid.age : 'N/A'})
                  </div>
                  {/* Use Link from react-router-dom for navigation */}
                  <Link to={`/kid/${kid.id}`} style={{ textDecoration: 'none' }}>
                    <button
                      style={{...buttonStyle, backgroundColor: '#6c757d'}}
                    >
                      Manage Kid
                    </button>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>You haven't added any kid accounts yet.</p>
          )}
          {/* Use Link if you have an "Add Kid" route */}
          <button
            onClick={() => alert('Navigate to Add Kid form (Not implemented yet)')}
            style={{...buttonStyle, marginTop: '10px'}}
          >
            Add Kid
          </button>
        </div>
      )}

      {/* Chore Management Section (from the other branch) */}
      <div style={sectionStyle}>
        <h2>Chore Definitions</h2> {/* Changed heading to reflect definitions */}
        {/*
          // Re-implement if you create an EditChoreForm for ChoreDefinition
          {editingChore && (
            <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ padding: '20px', background: 'white', borderRadius: '5px', minWidth: '300px', maxWidth: '500px' }}>
                <EditChoreForm choreDefinitionToEdit={editingChore} onClose={() => setEditingChore(null)} />
              </div>
            </div>
          )}
        */}

        <h3>Add New Chore Definition</h3>
        <AddChoreForm />

        <hr style={{ margin: '20px 0' }}/>
        <h3>All Chore Definitions</h3>
        {choresDefinitions.length === 0 ? (
          <p>No chore definitions yet. Add some!</p>
        ) : (
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {choresDefinitions.map(choreDef => ( // Iterate over ChoreDefinitions
              <li key={choreDef.id} style={{ marginBottom: '15px', padding: '15px', border: '1px solid #eee', borderRadius: '5px', backgroundColor: choreDef.isComplete ? '#e6ffe6' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h4 style={{ margin: '0', flexGrow: 1 }}>{choreDef.title}</h4> {/* Use choreDef.title */}
                  {/* Completion checkbox for a definition might mean "archive" or "deactivate" */}
                  {/* For now, removing direct checkbox here, as it's more relevant for instances */}
                  {/* If you want to show "active/inactive" status, you can do that instead */}
                </div>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', color: '#555' }}>{choreDef.description}</p>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.8em', color: '#777' }}>
                  Start/Due Date: {choreDef.dueDate ? new Date(choreDef.dueDate + 'T00:00:00').toLocaleDateString() : 'N/A'}
                </p>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.8em', color: '#777' }}>
                  Recurrence: {formatChoreDefinitionRecurrence(choreDef)} {/* Use new formatter */}
                </p>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.8em', color: '#777' }}>
                  Reward: {choreDef.rewardAmount !== undefined ? `$${choreDef.rewardAmount.toFixed(2)}` : 'N/A'}
                </p>
                <div>
                  {/* <button onClick={() => handleEdit(choreDef)} style={{ marginRight: '10px', padding: '5px 10px', fontSize: '0.9em' }}>Edit</button> */}
                  <button onClick={() => deleteChoreDefinition(choreDef.id)} style={{ padding: '5px 10px', fontSize: '0.9em', backgroundColor: '#dc3545', color: 'white', border: 'none' }}>Delete Definition</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* A link to the full Kanban Board view */}
      <div style={sectionStyle}>
          <h2>Kanban Board</h2>
          <p>Go to the dedicated Kanban Board to manage daily chore instances.</p>
          <Link to="/kanban" style={{ textDecoration: 'none' }}>
              <button style={buttonStyle}>Go to Kanban Board</button>
          </Link>
      </div>

    </div>
  );
};

export default DashboardView;