// src/App.tsx
import React, { useState, useEffect } from 'react'; // Import useState, useEffect
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import DashboardView from './ui/DashboardView';
import FundsManagementView from './ui/FundsManagementView';
import SettingsView from './ui/SettingsView';
import ActivityMonitoringView from './ui/ActivityMonitoringView';
import KidDetailView from './ui/KidDetailView';
import ChoreManagementView from './ui/ChoreManagementView';
import KanbanView from './ui/KanbanView';
import { UserProvider } from './contexts/UserContext';
import { FinancialProvider } from './contexts/FinancialContext';
import { ChoresProvider } from './contexts/ChoresContext';
import { NotificationProvider } from './contexts/NotificationContext';
import NotificationContainer from './ui/components/NotificationContainer';
import { AppNotificationProvider, useAppNotification } from './contexts/AppNotificationContext'; // Import AppNotificationProvider and hook

// Define AppNotificationDisplay directly in App.tsx or ensure it's imported if moved to a separate file
const AppNotificationDisplay = () => {
  const appNotificationContext = useAppNotification();

  if (!appNotificationContext) { // Should not happen if used within Provider
    return (
      <Link to="#" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', padding: '0 0.5rem' }} aria-label="Notifications loading">
        <span role="img" aria-hidden="true" style={{ fontSize: '1.5rem' }}>🔔</span>
      </Link>
    );
  }

  const { unreadCount } = appNotificationContext;

  return (
    <Link to="/app-notifications" /* Placeholder link for future notifications page */
          style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}
          aria-label={`View notifications. ${unreadCount} unread.`}
    >
      <span role="img" aria-hidden="true" style={{ fontSize: '1.5rem' }}>🔔</span>
      {unreadCount > 0 && (
        <span style={{
          marginLeft: '0.25rem',
          backgroundColor: 'var(--danger-color, red)', // Ensure --danger-color is defined
          color: 'white',
          borderRadius: '50%',
          padding: '0.1rem 0.4rem',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          minWidth: '1rem',
          textAlign: 'center',
          lineHeight: '1rem', // Ensure text fits well
        }}>
          {unreadCount}
        </span>
      )}
    </Link>
  );
};

function App() {
  const [theme, setTheme] = useState('light'); // Default theme

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <UserProvider>
        <FinancialProvider>
          <ChoresProvider>
            <AppNotificationProvider> {/* AppNotificationProvider is inside ChoresProvider */}
              <NotificationProvider>
                <NotificationContainer />
                <div> {/* Main app layout div */}
                  <nav style={{
                    marginBottom: 'var(--spacing-md)',
                    background: 'var(--surface-color-hover)',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: 'var(--border-width) solid var(--border-color)'
                  }}>
                    <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', gap: 'var(--spacing-md)' }}>
                      <li><Link to="/">Dashboard</Link></li>
                      <li><Link to="/funds">Funds Management</Link></li>
                      <li><Link to="/settings">Settings</Link></li>
                      <li><Link to="/activity">Activity Monitoring</Link></li>
                      <li><Link to="/chores">Chores</Link></li>
                      <li><Link to="/kanban">Kanban Board</Link></li>
                    </ul>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <AppNotificationDisplay /> {/* Add the bell icon and count here */}
                      <button
                        onClick={toggleTheme}
                        className="theme-toggle-button"
                      >
                        Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
                      </button>
                    </div>
                  </nav>

                  <Routes>
                    <Route path="/" element={<DashboardView />} />
                <Route path="/funds" element={<FundsManagementView />} />
                <Route path="/settings" element={<SettingsView />} />
                <Route path="/activity" element={<ActivityMonitoringView />} />
                <Route path="/kid/:kidId" element={<KidDetailView />} />
                <Route path="/chores" element={<ChoreManagementView />} />
                <Route path="/kanban" element={<KanbanView />} />
                <Route path="*" element={<DashboardView />} />
              </Routes>
                </div>
              </NotificationProvider>
            </AppNotificationProvider>
          </ChoresProvider>
        </FinancialProvider>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
