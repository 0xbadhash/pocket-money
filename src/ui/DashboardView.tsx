// src/ui/DashboardView.tsx
import React from 'react';
import { useUser } from '../contexts/UserContext';

interface DashboardViewProps {
  // Example: a function to navigate to other parts of the app,
  // similar to what NavigationBar uses.
  // onNavigate?: (view: 'profile_settings' | 'financial_overview') => void;
}

const DashboardView: React.FC<DashboardViewProps> = (/*{ onNavigate }*/) => {
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

  const contentStyle: React.CSSProperties = {
    // Add styles for dashboard content layout if needed
  };

  if (!currentUser) {
    // This should ideally not happen if App.tsx routes correctly,
    // but as a fallback:
    return (
      <div style={containerStyle}>
        <h1 style={headerStyle}>Dashboard</h1>
        <p>Please log in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>Dashboard</h1>
      <p>Welcome to your dashboard, <strong>{currentUser.name}!</strong></p>
      <div style={contentStyle}>
        <p>This is your main dashboard area. From here, you can manage your account and access application features.</p>
        {/*
          Placeholder for future dashboard content:
          - Quick summary of finances
          - Recent activity
          - Links to manage chores, funds, kid accounts, etc.
        */}
        <p><em>(More content and features will be added here.)</em></p>

        {/* Example of how onNavigate could be used if passed in:
        {onNavigate && (
          <>
            <button onClick={() => onNavigate('profile_settings')}>Profile Settings</button>
            <button onClick={() => onNavigate('financial_overview')}>Financial Overview</button>
          </>
        )}
        */}
      </div>
    </div>
  );
};

export default DashboardView;
