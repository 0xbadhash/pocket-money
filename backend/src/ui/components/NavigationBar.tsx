// src/ui/components/NavigationBar.tsx
import React from 'react';
import { useUser } from '../../contexts/UserContext';
import { UserRole } from '../../types';

interface NavigationBarProps {
  // This function will be called when a navigation link is clicked,
  // App.tsx can use it to change the currently displayed view.
  onNavigate: (view: 'login' | 'register' | 'dashboard' | 'admin_dashboard' | 'home') => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ onNavigate }) => {
  const { currentUser, logoutContext } = useUser();

  const navStyle: React.CSSProperties = {
    backgroundColor: '#333',
    padding: '10px 20px',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: 'Arial, sans-serif',
  };

  const navBrandStyle: React.CSSProperties = {
    fontSize: '1.5em',
    fontWeight: 'bold',
    cursor: 'pointer',
  };

  const navLinksStyle: React.CSSProperties = {
    display: 'flex',
    gap: '15px',
  };

  const linkStyle: React.CSSProperties = {
    color: 'white',
    textDecoration: 'none',
    cursor: 'pointer',
    padding: '5px 0',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#555',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
  };

  const userInfoStyle: React.CSSProperties = {
      marginRight: '15px',
      fontStyle: 'italic',
  };

  return (
    <nav style={navStyle}>
      <div style={navBrandStyle} onClick={() => onNavigate(currentUser ? 'dashboard' : 'home')}>
        KidFinanceApp
      </div>
      <div style={navLinksStyle}>
        {currentUser ? (
          <>
            <span style={userInfoStyle}>Hi, {currentUser.name}!</span>
            <a style={linkStyle} onClick={() => onNavigate('dashboard')}>Dashboard</a>
            {currentUser.role === UserRole.ADMIN && (
              <a style={linkStyle} onClick={() => onNavigate('admin_dashboard')}>Admin Panel</a>
            )}
            <button onClick={() => { logoutContext(); onNavigate('login'); }} style={buttonStyle}>
              Logout
            </button>
          </>
        ) : (
          <>
            <a style={linkStyle} onClick={() => onNavigate('login')}>Login</a>
            <a style={linkStyle} onClick={() => onNavigate('register')}>Create Account</a>
          </>
        )}
      </div>
    </nav>
  );
};

export default NavigationBar;
