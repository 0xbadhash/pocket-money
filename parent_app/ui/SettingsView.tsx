// parent_app/ui/SettingsView.tsx
import ProfileSettings from './settings_components/ProfileSettings';
import NotificationSettings from './settings_components/NotificationSettings';
import PaymentSettings from './settings_components/PaymentSettings';
import KidAccountSettings from './settings_components/KidAccountSettings';
import AppPreferences from './settings_components/AppPreferences';
import SupportLegal from './settings_components/SupportLegal';

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
        <AppPreferences />
        <SupportLegal />
      </div>
    </div>
  );
};

export default SettingsView;
