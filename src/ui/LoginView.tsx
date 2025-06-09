// src/ui/LoginView.tsx
import React, { useState } from 'react';

const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Placeholder for custom login logic
    console.log('Login attempt with:', { email, password });
    alert('Custom login functionality is not implemented yet.');
  };

  const handleGoogleLogin = () => {
    // Placeholder for Google login logic
    console.log('Attempting Google login...');
    alert('Login with Google functionality is not implemented yet.');
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Login</h2>

      {/* Custom Login Form */}
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd' }}
        />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd' }}
        />
      </div>
      <button
        onClick={handleLogin}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          marginBottom: '10px'
        }}
      >
        Login
      </button>

      {/* Separator */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
        <hr style={{ flexGrow: 1, border: 'none', borderTop: '1px solid #eee' }} />
        <span style={{ padding: '0 10px', color: '#aaa' }}>OR</span>
        <hr style={{ flexGrow: 1, border: 'none', borderTop: '1px solid #eee' }} />
      </div>

      {/* Google Login Button */}
      <button
        onClick={handleGoogleLogin}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#db4437', // Google's red color
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Basic Google G Icon (SVG or Font Icon could be used here for better visuals) */}
        <span style={{ marginRight: '10px', fontWeight: 'bold' }}>G</span>
        Login with Google
      </button>
    </div>
  );
};

export default LoginView;
