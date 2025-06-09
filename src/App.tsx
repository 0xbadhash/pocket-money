// src/App.tsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import DashboardView from './ui/DashboardView';
import FundsManagementView from './ui/FundsManagementView';
import SettingsView from './ui/SettingsView';
import ActivityMonitoringView from './ui/ActivityMonitoringView';
import { UserProvider } from './contexts/UserContext';
import { FinancialProvider } from './contexts/FinancialContext'; // <-- New Import
// We'll import styles globally in main.tsx, but if App.css specific styles were needed:
// import './App.css'; // Assuming Vite's default App.css is present or created

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <FinancialProvider> {/* <-- Wrap with FinancialProvider */}
          <div>
            <nav style={{ marginBottom: '20px', background: '#eee', padding: '10px' }}>
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', gap: '15px' }}>
            <li>
              <Link to="/">Dashboard</Link>
            </li>
            <li>
              <Link to="/funds">Funds Management</Link>
            </li>
            <li>
              <Link to="/settings">Settings</Link>
            </li>
            <li>
              <Link to="/activity">Activity Monitoring</Link> {/* <-- New Link */}
            </li>
          </ul>
        </nav>

        <hr />

        <Routes>
          <Route path="/" element={<DashboardView />} />
          <Route path="/funds" element={<FundsManagementView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="/activity" element={<ActivityMonitoringView />} /> {/* <-- New Route */}
          <Route path="*" element={<DashboardView />} /> {/* Default route */}
        </Routes>
      </div>
        </FinancialProvider> {/* <-- End FinancialProvider wrap */}
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
