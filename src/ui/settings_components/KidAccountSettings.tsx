// src/ui/settings_components/KidAccountSettings.tsx
import React, { useContext } from 'react'; // Import useContext
import { Link } from 'react-router-dom'; // <-- New Import
import { UserContext } from '../../contexts/UserContext'; // Adjust path as needed

const KidAccountSettings = () => {
  const userContext = useContext(UserContext);

  // Early return or loading state if user or user.kids is not yet available
  if (!userContext || userContext.loading) {
    return (
      <div className="settings-section">
        <h2>Kid Account Management</h2>
        <p>Loading kid information...</p>
      </div>
    );
  }

  const { user } = userContext;

  if (!user || !user.kids || user.kids.length === 0) {
    return (
      <div className="settings-section">
        <h2>Kid Account Management</h2>
        <p>No kids associated with this account.</p>
        <div className="settings-item">
          <button disabled>Add New Kid (via Family Link)</button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <h2>Kid Account Management</h2>
      {user.kids.map(kid => (
        <div className="settings-item" key={kid.id}>
          <span>{kid.name} (Age: {kid.age || 'N/A'})</span>
          {/* Replace button with Link */}
          <Link to={`/kid/${kid.id}`} className="button-link-styled">
            View Details
          </Link>
        </div>
      ))}
      <div className="settings-item" style={{ marginTop: '10px' }}>
        <button disabled>Add New Kid (via Family Link)</button>
      </div>
    </div>
  );
};

export default KidAccountSettings;
