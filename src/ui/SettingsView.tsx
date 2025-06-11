// /tmp/vite_init_area/temp_pocket_money_app/src/ui/SettingsView.tsx
import ProfileSettings from './settings_components/ProfileSettings';
import NotificationSettings from './settings_components/NotificationSettings';
import PaymentSettings from './settings_components/PaymentSettings';
import KidAccountSettings from './settings_components/KidAccountSettings';
import AppPreferences from './settings_components/AppPreferences';
import SupportLegal from './settings_components/SupportLegal';
import KanbanSettingsView from './settings_components/KanbanSettingsView'; // Import the new component

const SettingsView = () => {
  return (
    <div className="settings-view">
      <header className="view-header">
        <h1>Settings</h1>
      </header>
      <div className="settings-content">
        <ProfileSettings />
        <NotificationSettings />
        <PaymentSettings />
        <KidAccountSettings />
        {/* Add Kanban Settings Section */}
        <div className="settings-section">
          <h2>Kanban Column Settings</h2>
          <p>Customize the columns for each kid's Kanban board (e.g., "To Do", "In Progress", "Awaiting Approval").</p>
          <KanbanSettingsView />
        </div>
        <AppPreferences />
        <SupportLegal />
      </div>
    </div>
  );
};

export default SettingsView;
