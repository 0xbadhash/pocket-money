// src/ui/settings_components/ProfileSettings.tsx
import { useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';

const ProfileSettings = () => {
  const userContext = useContext(UserContext);

  // Use the loading flag and check if userContext is defined
  if (!userContext) {
      // This case should ideally not happen if App is wrapped correctly
      return <p>Error: UserContext not found.</p>;
  }

  const { user, loading } = userContext; // Destructure loading state

  if (loading) {
    return (
      <div className="settings-section">
        <h2>Profile Management</h2>
        <p>Loading user data...</p> {/* Show specific loading message */}
      </div>
    );
  }

  if (!user) {
    // This case would be if loading is false but user is still null (e.g. auth failed)
    return (
      <div className="settings-section">
        <h2>Profile Management</h2>
        <p>User not logged in or data not available.</p>
      </div>
    );
  }

  // If loading is false and user exists, display user data
  return (
    <div className="settings-section">
      <h2>Profile Management</h2>
      <div className="settings-item">
        <label>Name:</label> <span>{user.name}</span>
      </div>
      <div className="settings-item">
        <label>Email:</label> <span>{user.email}</span>
      </div>
      <div className="settings-item">
        <button disabled>Change Password (via Google Account)</button>
      </div>
    </div>
  );
};

export default ProfileSettings;
