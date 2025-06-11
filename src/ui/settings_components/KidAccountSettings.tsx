// src/ui/settings_components/KidAccountSettings.tsx
import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import { UserRole, KidUser, ParentUser } from '../../types'; // Import ParentUser

const KidAccountSettings = () => {
  const userContext = useContext(UserContext);
  const currentUser = userContext?.user;

  // Cast currentUser to ParentUser to access role and correctly typed kids array
  const parentUser = currentUser as ParentUser | null;

  // Only render this section if the current user is a parent and has kids
  if (!parentUser || parentUser.role !== UserRole.PARENT) {
    return (
      <div className="settings-section">
        <h2>Kid Account Management</h2>
        <p>This section is for parent accounts to manage kid profiles.</p>
      </div>
    );
  }

  const parentUserKids: KidUser[] = parentUser.kids || [];

  return (
    <div className="settings-section">
      <h2>Kid Account Management</h2>
      {parentUserKids.length === 0 ? (
        <p>You haven't added any kid accounts yet.</p>
      ) : (
        <>
          {parentUserKids.map((kid) => (
            <div key={kid.id} className="settings-item">
              <p>
                {kid.name} (Age: {kid.age !== undefined ? kid.age : 'N/A'}){' '}
                {/* Link to individual kid's settings or profile */}
                <Link to={`/kid-settings/${kid.id}`} style={{ marginLeft: '10px' }}>
                  View Details
                </Link>
              </p>
            </div>
          ))}
        </>
      )}

      {/* Add New Kid button - This will likely navigate to a registration/onboarding flow */}
      <div className="settings-item">
        <button
          onClick={() => alert('Navigate to Add New Kid form (Not implemented yet)')}
          // Assuming adding new kids might involve a complex flow, keep disabled or link to a dedicated form
          disabled={false} // Enable when the add kid flow is ready
        >
          Add New Kid
        </button>
      </div>
    </div>
  );
};
export default KidAccountSettings;