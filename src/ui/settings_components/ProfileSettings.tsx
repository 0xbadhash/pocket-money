// src/ui/settings_components/ProfileSettings.tsx
import { useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import { UserRole, AppUser } from '../../types'; // Import AppUser

const ProfileSettings = () => {
  const userContext = useContext(UserContext);
  const currentUser = userContext?.user;
  const loading = userContext?.loading;

  // Cast currentUser to AppUser to access role
  const appUser = currentUser as AppUser | null;

  if (loading) {
    return (
      <div className="settings-section">
        <h2>Profile Management</h2>
        <p>Loading profile information...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="settings-section">
        <h2>Profile Management</h2>
        <p>No user logged in. Please log in to view your profile settings.</p>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <h2>Profile Management</h2>
      <div className="settings-item">
        <label>Name:</label> <span>{currentUser.name || 'N/A'}</span>
      </div>
      <div className="settings-item">
        <label>Email:</label> <span>{currentUser.email || 'N/A'}</span>
      </div>
      <div className="settings-item">
        <label>Role:</label> <span>{appUser?.role === UserRole.PARENT ? 'Parent' : appUser?.role === UserRole.KID ? 'Kid' : 'Admin'}</span>
      </div>
      {/* Assuming password changes are handled externally, e.g., via Google Account settings */}
      <div className="settings-item">
        <button disabled>Change Password (via Google Account)</button>
      </div>
    </div>
  );
};
export default ProfileSettings;