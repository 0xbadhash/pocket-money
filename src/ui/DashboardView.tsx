// src/ui/DashboardView.tsx
import React, { useState, useEffect } from 'react';
import { useUserContext } from '../contexts/UserContext'; // Changed useUser to useUserContext
import { useChoresContext } from '../contexts/ChoresContext';
import { UserRole, ParentUser as ParentUserType, KidUser, ChoreDefinition, ChoreInstance } from '../types';
import { AddChoreForm } from '../components/AddChoreForm';
import { Link } from 'react-router-dom';

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

const DashboardView: React.FC = () => {
  const { user: currentUser, loading } = useUserContext(); // Changed useUser and destructuring
  // Destructure both choreDefinitions and choreInstances as planned
  // choresDefinitions renamed to choreDefinitions
  // deleteChoreDefinition is not in context (commented out below)
  const { choreDefinitions, choreInstances, toggleChoreInstanceComplete /*, deleteChoreDefinition */ } = useChoresContext();

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

  if (loading) { // Added loading state check
    return (
      <div style={containerStyle}>
        <h1 style={headerStyle}>Dashboard</h1>
        <p>Loading user data...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={containerStyle}>
        <h1 style={headerStyle}>Dashboard</h1>
        <p>Please log in to view your dashboard.</p>
      </div>
    );
  }

  const parentUser = currentUser.role === UserRole.PARENT ? (currentUser as ParentUserType) : null;

  // Adapt the 'Upcoming Chores Summary' logic to use choreInstances
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  const fourDaysFromTodayStart = new Date(todayStart);
  fourDaysFromTodayStart.setDate(todayStart.getDate() + 4);

  let dueTodayCount = 0;
  let dueNext3DaysCount = 0;

  // Iterate over choreInstances from context for this summary
  choreInstances.forEach(instance => {
    if (!instance.isComplete) {
      const instanceDueDate = new Date(instance.instanceDate + 'T00:00:00'); // Parse instance's due date as local

      // Check for due today
      if (instanceDueDate.getTime() === todayStart.getTime()) {
        dueTodayCount++;
      }
      // Check for due in the next 3 days (tomorrow, day after, day after that)
      else if (instanceDueDate >= tomorrowStart && instanceDueDate < fourDaysFromTodayStart) {
        dueNext3DaysCount++;
      }
    }
  });

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>Dashboard</h1>
      <p>Welcome to your dashboard, <strong>{currentUser.name}!</strong></p>

      <div>
        <p>This is your main dashboard area. From here, you can manage your account and access application features.</p>
      </div>

      {/* NEW Upcoming Chores Summary Section - Inserted here */}
      <div style={{ padding: '10px 15px', marginBottom: '20px', background: '#f0f8ff', border: '1px solid #cce5ff', borderRadius: '5px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#004085' }}>Upcoming Chores Summary</h3>
        <p style={{ margin: '5px 0' }}>Chores Due Today: <strong>{dueTodayCount}</strong></p>
        <p style={{ margin: '5px 0' }}>Chores Due in Next 3 Days (excluding today): <strong>{dueNext3DaysCount}</strong></p>
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

      {/* Chore Management Section */}
      <div style={sectionStyle}>
        <h2>Chore Definitions</h2>
        {/* The EditChoreForm placeholder is commented out as it needs to be updated for ChoreDefinition */}
        {/*
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
            {choresDefinitions.map(choreDef => (
              <li key={choreDef.id} style={{ marginBottom: '15px', padding: '15px', border: '1px solid #eee', borderRadius: '5px', backgroundColor: choreDef.isComplete ? '#e6ffe6' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h4 style={{ margin: '0', flexGrow: 1 }}>{choreDef.title}</h4>
                </div>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', color: '#555' }}>{choreDef.description}</p>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.8em', color: '#777' }}>
                  Start/Due Date: {choreDef.dueDate ? new Date(choreDef.dueDate + 'T00:00:00').toLocaleDateString() : 'N/A'}
                </p>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.8em', color: '#777' }}>
                  Recurrence: {formatChoreDefinitionRecurrence(choreDef)}
                </p>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.8em', color: '#777' }}>
                  Reward: {choreDef.rewardAmount !== undefined ? `$${choreDef.rewardAmount.toFixed(2)}` : 'N/A'}
                </p>
                <div>
                  {/* The Edit button is commented out until EditChoreForm is updated */}
                  {/* <button onClick={() => handleEdit(choreDef)} style={{ marginRight: '10px', padding: '5px 10px', fontSize: '0.9em' }}>Edit</button> */}
                  {/* <button onClick={() => deleteChoreDefinition(choreDef.id)} style={{ padding: '5px 10px', fontSize: '0.9em', backgroundColor: '#dc3545', color: 'white', border: 'none' }}>Delete Definition</button> */}
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
