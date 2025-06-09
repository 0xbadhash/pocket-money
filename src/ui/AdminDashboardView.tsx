// src/ui/AdminDashboardView.tsx
import React, { useState, useEffect } from 'react';
import { AppUser, UserRole, ParentUser, KidUser } from '../types';
import { getAllUsers } from '../api/apiService'; // Import the API service
import { useUser } from '../contexts/UserContext'; // To get authToken

const AdminDashboardView: React.FC = () => {
  const { authToken } = useUser(); // Get authToken from context
  const [users, setUsers] = useState<AppUser[]>([]);
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        // Pass authToken to getAllUsers.
        // The backend /auth/users endpoint is currently not protected,
        // but we pass the token for future compatibility.
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

    // Only fetch users if an authToken is present (or if backend didn't require it for this specific call)
    // For this mock backend, the /auth/users is open, but in real app, it would be protected.
    // If the token is required by the backend, and it's null, getAllUsers will reject.
    // We could also add an explicit check here: if (!authToken) { setError("Not authenticated"); setLoading(false); return; }
    fetchUsers();
  }, [authToken]); // Re-fetch if authToken changes

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

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading users...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>Error: {error}</div>;
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
                <td style={tableCellStyle}>{user.email || 'N/A'}</td> {/* Display N/A if email is undefined */}
                <td style={tableCellStyle}>{user.role}</td>
                <td style={tableCellStyle}>
                  {user.role === UserRole.PARENT && `Kids: ${(user as ParentUser).kids?.length || 0}`}
                  {/* For KidUser, ensure parentAccountId and age are typically present based on your types */}
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
