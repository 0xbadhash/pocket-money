// src/App.tsx
import { useState, useEffect } from 'react';
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
import { NotificationProvider } from './contexts/NotificationContext';

type Theme = 'light' | 'dark';

interface NavItem {
  path: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard' },
  { path: '/funds', label: 'Funds Management' },
  { path: '/settings', label: 'Settings' },
  { path: '/activity', label: 'Activity Monitoring' },
  { path: '/chores', label: 'Chores' },
  { path: '/kanban', label: 'Kanban Board' },
];

function App() {
  const [theme, setTheme] = useState<Theme>('light');

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
                marginBottom: 'var(--spacing-md)',
                background: 'var(--surface-color-hover)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: 'var(--border-width) solid var(--border-color)'
              }}>
                <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', gap: 'var(--spacing-md)' }}>
                  {NAV_ITEMS.map(item => (
                    <li key={item.path}>
                      <Link to={item.path}>{item.label}</Link>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={toggleTheme}
                  className="theme-toggle-button"
                >
                  Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
                </button>
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
        </ChoresProvider>
      </FinancialProvider>
    </BrowserRouter>
  );
}

export default App;
