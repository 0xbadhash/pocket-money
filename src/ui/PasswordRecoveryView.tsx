// src/ui/PasswordRecoveryView.tsx
import React, { useState } from 'react';

const PasswordRecoveryView: React.FC = () => {
  const [email, setEmail] = useState('');

  const handleSendRecoveryLink = () => {
    // Placeholder for password recovery logic
    console.log('Password recovery attempt for email:', email);
    alert('Password recovery functionality is not implemented yet.');
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Password Recovery</h2>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        Enter the email address associated with your account, and we'll send you a link to reset your password.
      </p>
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
        />
      </div>
      <button
        onClick={handleSendRecoveryLink}
        style={{ width: '100%', padding: '10px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Send Recovery Link
      </button>
    </div>
  );
};

export default PasswordRecoveryView;
