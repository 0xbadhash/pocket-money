// src/ui/PasswordRecoveryView.tsx
import React, { useState } from 'react';
import { requestPasswordRecovery } from '../api/apiService'; // Adjust path if needed

const PasswordRecoveryView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendRecoveryLink = async () => {
    setError(null);
    setSuccessMessage(null);
    if (!email) {
      setError("Email address is required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        setError("Please enter a valid email address.");
        return;
    }

    setLoading(true);
    try {
      const response = await requestPasswordRecovery(email);
      setSuccessMessage(response.data.message); // Display message from backend
      setEmail(''); // Clear email field on success
    } catch (err: any) {
      if (err.error && err.error.message) {
        setError(err.error.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('Password recovery error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Password Recovery</h2>
      <p style={{ marginBottom: '20px', color: '#666', textAlign: 'center', fontSize: '0.9em' }}>
        Enter the email address associated with your account. If an account exists, we'll send a link to reset your password.
      </p>

      {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green', textAlign: 'center', marginBottom: '15px' }}>{successMessage}</p>}

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd' }}
          disabled={loading}
        />
      </div>
      <button
        onClick={handleSendRecoveryLink}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: loading ? '#ccc' : '#ffc107',
          color: loading? '#666' : 'black',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px'
        }}
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Send Recovery Link'}
      </button>
    </div>
  );
};

export default PasswordRecoveryView;
