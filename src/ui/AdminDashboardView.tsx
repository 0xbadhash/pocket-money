// src/ui/AdminDashboardView.tsx
import React, { useState, useEffect } from 'react';
import { AppUser, UserRole, ParentUser, KidUser, AdminUser } from '../types'; // Assuming types are updated

// Mock data for demonstration
const mockUsers: AppUser[] = [
  { id: 'admin1', name: 'Super Admin', email: 'admin@example.com', role: UserRole.ADMIN, createdAt: new Date(), updatedAt: new Date() },
  { id: 'parent1', name: 'Parent One', email: 'parent1@example.com', role: UserRole.PARENT, kids: [], createdAt: new Date(), updatedAt: new Date() },
  { id: 'kid1', name: 'Kid Alpha', email: 'kida@example.com', role: UserRole.KID, age: 10, parentAccountId: 'parent1', createdAt: new Date(), updatedAt: new Date() },
  { id: 'parent2', name: 'Parent Two', email: 'parent2@example.com', role: UserRole.PARENT, kids: [], createdAt: new Date(), updatedAt: new Date() },
  { id: 'kid2', name: 'Kid Beta', email: 'kidb@example.com', role: UserRole.KID, age: 8, parentAccountId: 'parent2', createdAt: new Date(), updatedAt: new Date() },
];

// Assign kids to parents for mock data
(mockUsers[1] as ParentUser).kids.push(mockUsers[2] as KidUser);
(mockUsers[3] as ParentUser).kids.push(mockUsers[4] as KidUser);


const AdminDashboardView: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // In a real app, fetch users from an API
    setUsers(mockUsers);
  }, []);

  const handleViewDetails = (user: AppUser) => {
    alert(`Viewing details for ${user.name} (ID: ${user.id}). Actual implementation needed.`);
    // Placeholder: In a real app, navigate to a user detail page or show a modal
  };

  const handleSuspendAccount = (user: AppUser) => {
    if (user.role === UserRole.ADMIN && users.filter(u => u.role === UserRole.ADMIN).length <= 1) {
        alert("Cannot suspend the only admin account.");
        return;
    }
    alert(`Suspending account for ${user.name} (ID: ${user.id}). Actual implementation needed.`);
    // Placeholder: In a real app, call an API to change account status
  };

  const filteredUsers = users
    .filter(user => filterRole === 'all' || user.role === filterRole)
    .filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase()));

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

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Dashboard</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '8px', width: '300px' }}
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
          style={{ padding: '8px' }}
        >
          <option value="all">All Roles</option>
          <option value={UserRole.PARENT}>Parents</option>
          <option value={UserRole.KID}>Kids</option>
          <option value={UserRole.ADMIN}>Admins</option>
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
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
          {filteredUsers.map(user => (
            <tr key={user.id}>
              <td style={tableCellStyle}>{user.name}</td>
              <td style={tableCellStyle}>{user.email}</td>
              <td style={tableCellStyle}>{user.role}</td>
              <td style={tableCellStyle}>
                {user.role === UserRole.PARENT && `Kids: ${(user as ParentUser).kids.length}`}
                {user.role === UserRole.KID && `Age: ${(user as KidUser).age}, Parent ID: ${(user as KidUser).parentAccountId}`}
              </td>
              <td style={tableCellStyle}>
                <button onClick={() => handleViewDetails(user)} style={buttonStyle}>View Details</button>
                <button onClick={() => handleSuspendAccount(user)} style={{...buttonStyle, backgroundColor: '#ffdddd'}}>
                  Suspend
                </button>
                {/* Add more actions as needed, e.g., Edit, Delete, Reset Password */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredUsers.length === 0 && <p style={{textAlign: 'center', marginTop: '20px'}}>No users found.</p>}
    </div>
  );
};

export default AdminDashboardView;
