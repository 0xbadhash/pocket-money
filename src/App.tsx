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
import { FinancialProvider } from './contexts/FinancialContext';
import { ChoresProvider } from './contexts/ChoresContext';
import { NotificationProvider } from './contexts/NotificationContext'; // Added import

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
      <FinancialProvider>
        <ChoresProvider>
          <NotificationProvider>
            <div>
              <nav style={{
                marginBottom: 'var(--spacing-md)', /* Using CSS var */
              background: 'var(--surface-color-hover)', /* Using CSS var */
              padding: 'var(--spacing-sm) var(--spacing-md)', /* Using CSS var */
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: 'var(--border-width) solid var(--border-color)' /* Adding a bottom border */
            }}>
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', gap: 'var(--spacing-md)' /* Using CSS var */ }}>
                <li><Link to="/">Dashboard</Link></li>
                <li><Link to="/funds">Funds Management</Link></li>
                <li><Link to="/settings">Settings</Link></li>
                <li><Link to="/activity">Activity Monitoring</Link></li>
                <li><Link to="/chores">Chores</Link></li>
                <li><Link to="/kanban">Kanban Board</Link></li>
              </ul>
              <button
                onClick={toggleTheme}
                className="theme-toggle-button"
              >
                Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
              </button>
            </nav>

            {/* Removed <hr /> as nav now has a borderBottom */}

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
        </ChoresProvider>
      </FinancialProvider>
    </BrowserRouter>
  );
}

export default App;
