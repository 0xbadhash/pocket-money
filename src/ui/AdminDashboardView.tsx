// src/ui/AdminDashboardView.tsx
import React, { useState, useEffect } from 'react';
import { AppUser, UserRole, ParentUser, KidUser } from '../types';
import { getAllUsers } from '../api/apiService';
import { useUser } from '../contexts/UserContext';

const AdminDashboardView: React.FC = () => {
  const { currentUser, authToken } = useUser(); // Get currentUser as well
  const [users, setUsers] = useState<AppUser[]>([]);
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true); // Start true as we check auth then fetch
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      setError("Access Denied. You must be an admin to view this page.");
      setLoading(false);
      return; // Stop execution if not admin
    }

    const fetchUsers = async () => {
      setLoading(true); // Ensure loading is true before fetch, though already set initially
      setError(null);
      try {
        const response = await getAllUsers(authToken);
        setUsers(response.data.users);
      } catch (err: any) {
        if (err.error && err.error.message) {
          setError(err.error.message);
        } else {
          setError('Failed to fetch users. Ensure the backend server is running and accessible.');
        }
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if confirmed admin
    fetchUsers();
  }, [currentUser, authToken]); // Depend on currentUser to re-evaluate if it changes

  // Early return for non-admins, also handles case where currentUser might be null briefly
  if (!loading && (!currentUser || currentUser.role !== UserRole.ADMIN)) {
      // If there's an error message already set (e.g. by useEffect), display that.
      // Otherwise, default to a generic access denied message.
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h1>Admin Dashboard</h1>
        <p>{error || "Access Denied. You must be an admin to view this page."}</p>
      </div>
    );
  }

  // The rest of the component remains largely the same, but wrapped in this check
  // or only rendered if the user is admin.

  const handleViewDetails = (user: AppUser) => {
    alert(`Viewing details for ${user.name} (ID: ${user.id}). Actual implementation needed.`);
  };

  const handleSuspendAccount = (user: AppUser) => {
    alert(`Suspending account for ${user.name} (ID: ${user.id}). Actual implementation needed.`);
  };

  const filteredUsers = users
    .filter(user => filterRole === 'all' || user.role === filterRole)
    .filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const tableHeaderStyle: React.CSSProperties = {
    backgroundColor: '#f0f0f0',
    padding: '10px',
    borderBottom: '1px solid #ddd',
    textAlign: 'left',
  };

  const tableCellStyle: React.CSSProperties = {
    padding: '10px',
    borderBottom: '1px solid #eee',
  };

  const buttonStyle: React.CSSProperties = {
    marginRight: '5px',
    padding: '5px 10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
  };

  // Loading and error states specific to data fetching (after admin check passes)
  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading users...</div>;
  }

  // This error is for data fetching errors, distinct from auth error
  if (error && currentUser && currentUser.role === UserRole.ADMIN) {
     return (
        <div style={{ padding: '20px' }}>
            <h1>Admin Dashboard</h1>
            <p style={{textAlign: 'center', color: 'red' }}>Error: {error}</p>
        </div>
     );
  }


  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Dashboard</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '8px', minWidth: '250px', flexGrow: 1 }}
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
          style={{ padding: '8px', minWidth: '150px' }}
        >
          <option value="all">All Roles</option>
          <option value={UserRole.PARENT}>Parents</option>
          <option value={UserRole.KID}>Kids</option>
          <option value={UserRole.ADMIN}>Admins</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd', minWidth: '600px' }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Name</th>
              <th style={tableHeaderStyle}>Email</th>
              <th style={tableHeaderStyle}>Role</th>
              <th style={tableHeaderStyle}>Details</th>
              <th style={tableHeaderStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? filteredUsers.map(user => (
              <tr key={user.id}>
                <td style={tableCellStyle}>{user.name}</td>
                <td style={tableCellStyle}>{user.email || 'N/A'}</td>
                <td style={tableCellStyle}>{user.role}</td>
                <td style={tableCellStyle}>
                  {user.role === UserRole.PARENT && `Kids: ${(user as ParentUser).kids?.length || 0}`}
                  {user.role === UserRole.KID && `Age: ${(user as KidUser).age !== undefined ? (user as KidUser).age : 'N/A'}, Parent: ${(user as KidUser).parentAccountId ? (user as KidUser).parentAccountId.substring(0,6) + '...' : 'N/A'}`}
                </td>
                <td style={tableCellStyle}>
                  <button onClick={() => handleViewDetails(user)} style={buttonStyle}>Details</button>
                  <button onClick={() => handleSuspendAccount(user)} style={{...buttonStyle, backgroundColor: '#ffdddd'}}>
                    Suspend
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} style={{...tableCellStyle, textAlign: 'center'}}>No users found matching your criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboardView;
