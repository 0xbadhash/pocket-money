// parent_app/ui/settings_components/ProfileSettings.tsx
const ProfileSettings = () => {
  return (
    <div className="settings-section">
      <h2>Profile Management</h2>
      <div className="settings-item">
        <label>Name:</label> <span>Parent User Name (from Google Account)</span>
      </div>
      <div className="settings-item">
        <label>Email:</label> <span>parent.email@example.com (from Google Account)</span>
      </div>
      <div className="settings-item">
        <button disabled>Change Password (via Google Account)</button>
      </div>
    </div>
  );
};
export default ProfileSettings;
