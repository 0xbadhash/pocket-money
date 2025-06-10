// src/App.tsx
import React, { useState, useEffect } from 'react';
import { UserProvider, useUser } from './contexts/UserContext'; // Import useUser
import { FinancialProvider } from './contexts/FinancialContext';
import { ChoresProvider } from './contexts/ChoresContext';

// Import Views
import DashboardView from './ui/DashboardView';
import FundsManagementView from './ui/FundsManagementView';
import SettingsView from './ui/SettingsView';
import ActivityMonitoringView from './ui/ActivityMonitoringView';
import KidDetailView from './ui/KidDetailView'; // Assuming this view will be conditionally rendered too
import ChoreManagementView from './ui/ChoreManagementView';
import LoginView from './ui/LoginView';
import AccountCreationView from './ui/AccountCreationView';
import AdminDashboardView from './ui/AdminDashboardView';
import NavigationBar from './ui/components/NavigationBar'; // Import the new NavigationBar

// Define the types for the views that can be displayed
export type AppView =
  | 'login'
  | 'register'
  | 'dashboard'
  | 'admin_dashboard'
  | 'funds'
  | 'settings'
  | 'activity'
  | 'chores'
  // | 'kid_detail' // KidDetailView might need special handling if it takes params
  | 'home'; // A generic home/landing page for non-logged-in users

const AppContent: React.FC = () => {
  const { currentUser, loading: userLoading } = useUser();
  // Default to 'login' if no user, 'dashboard' if user exists.
  // This will be re-evaluated once userLoading is false.
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!userLoading) {
      if (currentUser) {
        setCurrentView('dashboard'); // Default to dashboard if logged in
      } else {
        setCurrentView('login'); // Default to login if not logged in
      }
    }
  }, [currentUser, userLoading]);

  const handleNavigate = (view: AppView) => {
    // Basic access control, can be expanded
    if (view === 'admin_dashboard' && currentUser?.role !== 'admin') {
      setCurrentView('dashboard'); // Redirect to dashboard if not admin
      alert("Access denied. Admin role required.");
      return;
    }
    if ((view === 'dashboard' || view === 'admin_dashboard' || view === 'funds' || view === 'settings' || view === 'activity' || view === 'chores') && !currentUser) {
      setCurrentView('login'); // Redirect to login if trying to access protected view without user
      alert("Please log in to access this page.");
      return;
    }
    setCurrentView(view);
  };

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Render a loading state while UserContext is loading (e.g., checking localStorage)
  if (userLoading) {
    return <div style={{textAlign: 'center', marginTop: '50px'}}>Loading application...</div>;
  }

  let viewToRender;
  switch (currentView) {
    case 'login':
      viewToRender = <LoginView />;
      break;
    case 'register':
      viewToRender = <AccountCreationView />;
      break;
    case 'dashboard':
      viewToRender = <DashboardView />;
      break;
    case 'admin_dashboard':
      // Ensure currentUser and role check again, though handleNavigate should prevent this state if not admin
      viewToRender = currentUser?.role === 'admin' ? <AdminDashboardView /> : <DashboardView />; // Fallback to dashboard
      break;
    case 'funds':
      viewToRender = <FundsManagementView />;
      break;
    case 'settings':
      viewToRender = <SettingsView />;
      break;
    case 'activity':
      viewToRender = <ActivityMonitoringView />;
      break;
    case 'chores':
      viewToRender = <ChoreManagementView />;
      break;
    // case 'kid_detail':
    //   // This would need a way to pass kidId, simple state switch is not enough
    //   // For now, KidDetailView might not be reachable via this simple navigation
    //   viewToRender = <KidDetailView kidId="someKidId" />; // Placeholder
    //   break;
    case 'home':
    default:
      // A simple home page for logged-out users, or redirect to login
      viewToRender = (
        <div style={{textAlign: 'center', marginTop: '50px'}}>
          <h1>Welcome to KidFinanceApp</h1>
          <p>Please log in or create an account to continue.</p>
          {/* Optionally, add a button to navigate to login */}
          <button onClick={() => handleNavigate('login')} style={{padding: '10px 20px', fontSize: '16px', cursor: 'pointer'}}>Go to Login</button>
        </div>
      );
      if (currentUser && currentView === 'home') handleNavigate('dashboard'); // If logged in and somehow on 'home', redirect
      else if (!currentUser && currentView !== 'login' && currentView !== 'register') handleNavigate('login'); // If not logged in and not on login/register, redirect
      break;
  }

  return (
    <>
      <NavigationBar onNavigate={handleNavigate} />
      <button
        onClick={toggleTheme}
        className="theme-toggle-button" /* Ensure this class is styled in index.css or similar */
        style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 1001 }}
      >
        Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
      </button>
      <div style={{ padding: 'var(--spacing-md)' }}> {/* Added padding around content area */}
        {viewToRender}
      </div>
    </>
  );
};

// App component now just sets up providers
const App: React.FC = () => {
  return (
    // BrowserRouter is removed as we are not using react-router-dom for navigation in this setup
    <UserProvider>
      <FinancialProvider>
        <ChoresProvider>
          <AppContent />
        </ChoresProvider>
      </FinancialProvider>
    </UserProvider>
  );
}

export default App;
