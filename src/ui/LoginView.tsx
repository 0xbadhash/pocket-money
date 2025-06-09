// src/ui/LoginView.tsx
import React, { useState, useContext } from 'react';
import { loginUser } from '../api/apiService'; // Adjusted path assuming apiService is in src/api
import { UserContext } from '../contexts/UserContext'; // Import UserContext

const LoginView: React.FC = () => {
  const userContext = useContext(UserContext); // Use the context
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Temporary state to show login success
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null);


  const handleLogin = async () => {
    setError(null);
    setLoginSuccessMessage(null);
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const response = await loginUser(email, password);
      console.log('Login successful:', response.data.user);
      console.log('Received token:', response.data.token);

      // Use loginContext to update global state
      if (userContext) {
        userContext.loginContext(response.data.user, response.data.token);
      }

      setLoginSuccessMessage(`Login successful! Welcome ${response.data.user.name}. You are now logged in.`);
      // Clear form or redirect user
      setEmail('');
      setPassword('');
    } catch (err: any) {
      if (err.error && err.error.message) {
        setError(err.error.message);
      } else {
        setError('An unexpected error occurred during login.');
      }
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Placeholder for Google login logic
    console.log('Attempting Google login...');
    alert('Login with Google functionality is not implemented yet.');
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Login</h2>

      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      {loginSuccessMessage && <p style={{ color: 'green', textAlign: 'center' }}>{loginSuccessMessage}</p>}

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
          disabled={loading}
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
          disabled={loading}
        />
      </div>
      <button
        onClick={handleLogin}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          marginBottom: '10px'
        }}
        disabled={loading}
      >
        {loading ? 'Logging in...' : 'Login'}
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
          backgroundColor: '#db4437',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        disabled={loading}
      >
        <span style={{ marginRight: '10px', fontWeight: 'bold' }}>G</span>
        Login with Google
      </button>
    </div>
  );
};

export default LoginView;
