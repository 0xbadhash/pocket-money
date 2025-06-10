// src/ui/LoginView.tsx
import React, { useState } from 'react';
import { loginUser, initiateGoogleLogin } from '../api/apiService'; // Import initiateGoogleLogin
import { useUser } from '../contexts/UserContext';

const LoginView: React.FC = () => {
  const { loginContext } = useUser(); // Destructure loginContext directly
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
      // loginContext is guaranteed to be defined by useUser hook
      loginContext(response.data.user, response.data.token);

      setLoginSuccessMessage(`Login successful! Welcome ${response.data.user.name}. You are now logged in.`);
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

  const handleGoogleLogin = async () => {
    setError(null);
    setLoginSuccessMessage(null);
    setLoading(true);
    try {
      const response = await initiateGoogleLogin(); // Call the new API service function
      console.log('Mock Google login successful:', response.data.user);

      // loginContext is guaranteed to be defined by useUser hook
      loginContext(response.data.user, response.data.token);

      setLoginSuccessMessage(`Mock Google login successful! Welcome ${response.data.user.name}. You are now logged in.`);
    } catch (err: any) {
      if (err.error && err.error.message) {
        setError(err.error.message);
      } else {
        setError('An unexpected error occurred during Google login.');
      }
      console.error('Google login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Login</h2>

      {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</p>}
      {loginSuccessMessage && <p style={{ color: 'green', textAlign: 'center', marginBottom: '10px' }}>{loginSuccessMessage}</p>}

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
        {loading ? 'Processing...' : 'Login'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
        <hr style={{ flexGrow: 1, border: 'none', borderTop: '1px solid #eee' }} />
        <span style={{ padding: '0 10px', color: '#aaa' }}>OR</span>
        <hr style={{ flexGrow: 1, border: 'none', borderTop: '1px solid #eee' }} />
      </div>

      <button
        onClick={handleGoogleLogin}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: loading ? '#ccc' : '#db4437',
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
        {loading ? 'Processing...' : 'Login with Google'}
      </button>
    </div>
  );
};

export default LoginView;
