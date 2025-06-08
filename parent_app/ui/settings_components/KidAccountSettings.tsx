// parent_app/ui/settings_components/KidAccountSettings.tsx
const KidAccountSettings = () => {
  return (
    <div className="settings-section">
      <h2>Kid Account Management</h2>
      <div className="settings-item">
        <p>Kid A (View Details)</p> {/* Placeholder for link/button */}
      </div>
      <div className="settings-item">
        <p>Kid B (View Details)</p> {/* Placeholder for link/button */}
      </div>
      <div className="settings-item">
        <button disabled>Add New Kid (via Family Link)</button>
      </div>
    </div>
  );
};
export default KidAccountSettings;
