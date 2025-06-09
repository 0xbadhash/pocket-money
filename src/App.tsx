// src/App.tsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import DashboardView from './ui/DashboardView';
import FundsManagementView from './ui/FundsManagementView';
import SettingsView from './ui/SettingsView';
import ActivityMonitoringView from './ui/ActivityMonitoringView';
import KidDetailView from './ui/KidDetailView';
// ChoreManagementView will be created later, so import might be commented out or added when available
import ChoreManagementView from './ui/ChoreManagementView';
import { UserProvider } from './contexts/UserContext';
import { FinancialProvider } from './contexts/FinancialContext';
import { ChoresProvider } from './contexts/ChoresContext'; // <-- New Import

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <FinancialProvider>
          <ChoresProvider> {/* <-- Wrap with ChoresProvider */}
            <div>
              <nav style={{ marginBottom: '20px', background: '#eee', padding: '10px' }}>
                <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', gap: '15px' }}>
                  <li><Link to="/">Dashboard</Link></li>
                  <li><Link to="/funds">Funds Management</Link></li>
                  <li><Link to="/settings">Settings</Link></li>
                  <li><Link to="/activity">Activity Monitoring</Link></li>
                  <li><Link to="/chores">Chores</Link></li> {/* <-- New Link */}
                </ul>
              </nav>
              <hr />
              <Routes>
                <Route path="/" element={<DashboardView />} />
                <Route path="/funds" element={<FundsManagementView />} />
                <Route path="/settings" element={<SettingsView />} />
                <Route path="/activity" element={<ActivityMonitoringView />} />
                <Route path="/kid/:kidId" element={<KidDetailView />} />
                <Route path="/chores" element={<ChoreManagementView />} /> {/* <-- New Route */}
                <Route path="*" element={<DashboardView />} />
              </Routes>
            </div>
          </ChoresProvider> {/* <-- End ChoresProvider wrap */}
        </FinancialProvider>
      </UserProvider>
    </BrowserRouter>
  );
}
export default App;
