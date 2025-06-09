// src/ui/settings_components/ProfileSettings.tsx
import React, { useContext } from 'react'; // Import useContext
import { UserContext } from '../../contexts/UserContext'; // Adjust path as needed

const ProfileSettings = () => {
  const userContext = useContext(UserContext);

  // Handle the case where context might be undefined (though our UserProvider sets a default user)
  if (!userContext || !userContext.user) {
    return (
      <div className="settings-section">
        <h2>Profile Management</h2>
        <p>Loading user data or user not logged in...</p>
      </div>
    );
  }

  const { user } = userContext;

  return (
    <div className="settings-section">
      <h2>Profile Management</h2>
      <div className="settings-item">
        <label>Name:</label> <span>{user.name}</span> {/* Display user name from context */}
      </div>
      <div className="settings-item">
        <label>Email:</label> <span>{user.email}</span> {/* Display user email from context */}
      </div>
      <div className="settings-item">
        <button disabled>Change Password (via Google Account)</button>
      </div>
    </div>
  );
};

export default ProfileSettings;
