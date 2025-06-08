// parent_app/ui/settings_components/AppPreferences.tsx
const AppPreferences = () => {
  return (
    <div className="settings-section">
      <h2>App Preferences</h2>
      <div className="settings-item">
        <label htmlFor="theme">Theme:</label>
        <select id="theme" name="theme" disabled>
          <option>System Default</option>
          <option>Light</option>
          <option>Dark</option>
        </select>
      </div>
      <div className="settings-item">
        <label htmlFor="language">Language:</label>
        <select id="language" name="language" disabled>
          <option>English</option>
        </select>
      </div>
    </div>
  );
};
export default AppPreferences;
