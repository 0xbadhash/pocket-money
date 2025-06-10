import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'; // Keep BrowserRouter and routing components
import { UserProvider, useUser } from './contexts/UserContext';
import { FinancialProvider } from './contexts/FinancialContext';
import { ChoresProvider } from './contexts/ChoresContext';

// Import Views
import DashboardView from './ui/DashboardView';
import FundsManagementView from './ui/FundsManagementView';
import SettingsView from './ui/SettingsView';
import ActivityMonitoringView from './ui/ActivityMonitoringView';
import KidDetailView from './ui/KidDetailView';
import ChoreManagementView from './ui/ChoreManagementView';
import LoginView from './ui/LoginView';
import AccountCreationView from './ui/AccountCreationView';
import AdminDashboardView from './ui/AdminDashboardView';
import NavigationBar from './ui/components/NavigationBar'; // Import the new NavigationBar
import KanbanView from './ui/KanbanView'; // Assuming KanbanView will be added/used as per Kanban branch

// Define the types for the views that can be displayed (less relevant for react-router, but can be kept for clarity if specific enums are useful elsewhere)
// export type AppView =
//   | 'login'
//   | 'register'
//   | 'dashboard'
//   | 'admin_dashboard'
//   | 'funds'
//   | 'settings'
//   | 'activity'
//   | 'chores'
//   | 'home';

const AppContent: React.FC = () => {
  const { currentUser, loading: userLoading } = useUser();
  // We no longer manage 'currentView' state here, react-router-dom handles it based on URL.
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // The logic for redirecting based on login status will move into route guards or specific components
  // For now, we'll keep it simple and rely on route setup.

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Render a loading state while UserContext is loading (e.g., checking localStorage)
  if (userLoading) {
    return <div style={{textAlign: 'center', marginTop: '50px'}}>Loading application...</div>;
  }

  // The main application content structure uses react-router-dom
  return (
    <>
      {/* Navigation Bar will be rendered here. It needs to use <Link> components. */}
      {/* Assuming NavigationBar can take a `toggleTheme` prop if needed */}
      <NavigationBar toggleTheme={toggleTheme} currentTheme={theme} currentUser={currentUser} />

      <div style={{ padding: 'var(--spacing-md)' }}> {/* Added padding around content area */}
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginView />} />
          <Route path="/register" element={<AccountCreationView />} />
          <Route path="/" element={currentUser ? <DashboardView /> : <LoginView />} /> {/* Default to dashboard if logged in, else login */}

          {/* Protected Routes - These should ideally have proper route guards or be rendered conditionally */}
          {/* For now, we'll let components handle their own redirects if unauthorized */}
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/funds" element={<FundsManagementView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="/activity" element={<ActivityMonitoringView />} />
          <Route path="/chores" element={<ChoreManagementView />} />
          <Route path="/kanban" element={<KanbanView />} /> {/* Added KanbanView route */}

          {/* Admin Route - Simple check here, a proper guard is recommended */}
          <Route path="/admin" element={currentUser?.role === 'admin' ? <AdminDashboardView /> : <DashboardView />} />

          {/* Kid Detail View - Example of a route with a parameter */}
          <Route path="/kid/:kidId" element={<KidDetailView />} />

          {/* Catch-all route for unmatched paths (redirect to dashboard or login) */}
          <Route path="*" element={currentUser ? <DashboardView /> : <LoginView />} />
        </Routes>
      </div>
    </>
  );
};

// App component now just sets up providers and BrowserRouter
const App: React.FC = () => {
  return (
    <BrowserRouter> {/* BrowserRouter wraps the entire application */}
      <UserProvider>
        <FinancialProvider>
          <ChoresProvider>
            <AppContent />
          </ChoresProvider>
        </FinancialProvider>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;