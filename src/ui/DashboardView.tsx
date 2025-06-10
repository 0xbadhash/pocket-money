// src/ui/DashboardView.tsx
import React from 'react';
import { useUser } from '../contexts/UserContext';
import { UserRole, ParentUser as ParentUserType, KidUser } from '../types'; // Renamed ParentUser to avoid conflict

interface DashboardViewProps {
  onNavigate?: (view: string) => void; // Made onNavigate more generic for App.tsx
}

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { currentUser } = useUser();

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

  // Cast currentUser to ParentUserType if it's a parent to access the 'kids' array
  const parentUser = currentUser.role === UserRole.PARENT ? (currentUser as ParentUserType) : null;

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>Dashboard</h1>
      <p>Welcome to your dashboard, <strong>{currentUser.name}!</strong></p>

      <div>
        <p>This is your main dashboard area. From here, you can manage your account and access application features.</p>
        <p><em>(More content and features will be added here.)</em></p>
      </div>

      {/* My Kids Section for Parent Users */}
      {parentUser && (
        <div style={sectionStyle}>
          <h2>My Kids</h2>
          {parentUser.kids && parentUser.kids.length > 0 ? (
            <ul style={kidsListStyle}>
              {parentUser.kids.map((kid: KidUser) => ( // Specify KidUser type here
                <li key={kid.id} style={kidItemStyle}>
                  <div>
                    <strong>{kid.name}</strong> (Age: {kid.age !== undefined ? kid.age : 'N/A'})
                  </div>
                  <button
                    onClick={() => alert(`Manage details for ${kid.name} (Not implemented yet)`)}
                    style={{...buttonStyle, backgroundColor: '#6c757d'}}
                  >
                    Manage Kid
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>You haven't added any kid accounts yet.</p>
          )}
          <button
            onClick={() => alert('Navigate to Add Kid form (Not implemented yet)')}
            style={{...buttonStyle, marginTop: '10px'}}
          >
            Add Kid
          </button>
        </div>
      )}

      {/* Placeholder for other dashboard sections like financial overview, chores, etc. */}
      {/* Example of onNavigate usage from props */}
      {/*
      {onNavigate && (
        <div style={sectionStyle}>
            <button onClick={() => onNavigate('profile_settings')}>Profile Settings</button>
        </div>
      )}
      */}
    </div>
  );
};

export default DashboardView;
