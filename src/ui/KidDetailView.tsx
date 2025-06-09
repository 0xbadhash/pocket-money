// src/ui/KidDetailView.tsx
import React, { useContext, useState, useEffect } from 'react'; // Add useState, useEffect
import { useParams, Link } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import type { Kid } from '../types';

const KidDetailView = () => {
  const { kidId } = useParams<{ kidId: string }>();
  const userContext = useContext(UserContext);

  // Local state for form inputs, initialized to empty strings
  const [dailyLimit, setDailyLimit] = useState<string>('');
  const [weeklyLimit, setWeeklyLimit] = useState<string>('');
  const [monthlyLimit, setMonthlyLimit] = useState<string>('');
  const [perTransactionLimit, setPerTransactionLimit] = useState<string>('');

  const kid = userContext?.user?.kids?.find(k => k.id === kidId);

  // Effect to initialize form state when kid data is available or changes
  useEffect(() => {
    if (kid?.spendingLimits) {
      setDailyLimit(String(kid.spendingLimits.daily ?? ''));
      setWeeklyLimit(String(kid.spendingLimits.weekly ?? ''));
      setMonthlyLimit(String(kid.spendingLimits.monthly ?? ''));
      setPerTransactionLimit(String(kid.spendingLimits.perTransaction ?? ''));
    } else {
      // Reset if no limits or kid changes to one without limits
      setDailyLimit('');
      setWeeklyLimit('');
      setMonthlyLimit('');
      setPerTransactionLimit('');
    }
  }, [kid]); // Re-run when kid object changes

  if (userContext?.loading) {
    return <p>Loading kid details...</p>;
  }

  if (!kid) {
    return (
      <div style={{ padding: 'var(--spacing-md)'}}>
        <p>Kid not found.</p>
        <Link to="/settings" className="button-link-styled">Back to Settings</Link>
      </div>
    );
  }

  const handleSaveLimits = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Construct newLimits object, converting empty strings to undefined, others to numbers
    const parsedLimits: Kid['spendingLimits'] = {
        daily: dailyLimit !== '' ? parseFloat(dailyLimit) : undefined,
        weekly: weeklyLimit !== '' ? parseFloat(weeklyLimit) : undefined,
        monthly: monthlyLimit !== '' ? parseFloat(monthlyLimit) : undefined,
        perTransaction: perTransactionLimit !== '' ? parseFloat(perTransactionLimit) : undefined,
      };

    // Filter out any properties that ended up as NaN (e.g. if parseFloat('') resulted in NaN for some browsers)
    // or ensure they are explicitly undefined if empty.
    // The current parseFloat('') results in NaN, which we want to treat as 'clear this limit'.
    // So, we only include properties that are numbers (or were valid numbers).
    const newLimits: Kid['spendingLimits'] = {};
    if (!isNaN(parsedLimits?.daily!)) newLimits.daily = parsedLimits.daily; else if (dailyLimit === '') newLimits.daily = undefined;
    if (!isNaN(parsedLimits?.weekly!)) newLimits.weekly = parsedLimits.weekly; else if (weeklyLimit === '') newLimits.weekly = undefined;
    if (!isNaN(parsedLimits?.monthly!)) newLimits.monthly = parsedLimits.monthly; else if (monthlyLimit === '') newLimits.monthly = undefined;
    if (!isNaN(parsedLimits?.perTransaction!)) newLimits.perTransaction = parsedLimits.perTransaction; else if (perTransactionLimit === '') newLimits.perTransaction = undefined;


    if (userContext?.updateKidSpendingLimits) {
      userContext.updateKidSpendingLimits(kid.id, newLimits);
      alert('Spending limits saved!');
    }
  };

  const currentLimits = kid.spendingLimits || {};

  return (
    <div className="kid-detail-view" style={{ padding: 'var(--spacing-md)' }}>
      <header className="view-header"><h1>Kid Details: {kid.name}</h1></header>
      <section className="content-section"> {/* Removed inline styles, will be handled by CSS */}
        <p><strong>Name:</strong> {kid.name}</p>
        <p><strong>Age:</strong> {kid.age || 'N/A'}</p>
        <p><strong>ID:</strong> {kid.id}</p>

        <h4 style={{marginTop: 'var(--spacing-lg)'}}>Current Spending Limits:</h4>
        <ul style={{listStyle: 'none', paddingLeft: 'var(--spacing-md)'}}>
          <li>Daily: ${currentLimits.daily?.toFixed(2) ?? 'Not set'}</li>
          <li>Weekly: ${currentLimits.weekly?.toFixed(2) ?? 'Not set'}</li>
          <li>Monthly: ${currentLimits.monthly?.toFixed(2) ?? 'Not set'}</li>
          <li>Per Transaction: ${currentLimits.perTransaction?.toFixed(2) ?? 'Not set'}</li>
        </ul>

        <h4 style={{marginTop: 'var(--spacing-lg)'}}>Set/Update Spending Limits:</h4>
        <form onSubmit={handleSaveLimits} className="limits-form"> {/* Add a class for styling */}
          <div className="form-field" style={{marginBottom: 'var(--spacing-sm)'}}>
            <label htmlFor="dailyLimit" style={{display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 'var(--font-weight-medium)'}}>Daily Limit:</label>
            <input type="number" id="dailyLimit" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} placeholder="e.g., 10" step="0.01" min="0" />
          </div>
          <div className="form-field" style={{marginBottom: 'var(--spacing-sm)'}}>
            <label htmlFor="weeklyLimit" style={{display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 'var(--font-weight-medium)'}}>Weekly Limit:</label>
            <input type="number" id="weeklyLimit" value={weeklyLimit} onChange={e => setWeeklyLimit(e.target.value)} placeholder="e.g., 50" step="0.01" min="0" />
          </div>
          <div className="form-field" style={{marginBottom: 'var(--spacing-sm)'}}>
            <label htmlFor="monthlyLimit" style={{display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 'var(--font-weight-medium)'}}>Monthly Limit:</label>
            <input type="number" id="monthlyLimit" value={monthlyLimit} onChange={e => setMonthlyLimit(e.target.value)} placeholder="e.g., 200" step="0.01" min="0" />
          </div>
          <div className="form-field" style={{marginBottom: 'var(--spacing-sm)'}}>
            <label htmlFor="perTransactionLimit" style={{display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 'var(--font-weight-medium)'}}>Per Transaction Limit:</label>
            <input type="number" id="perTransactionLimit" value={perTransactionLimit} onChange={e => setPerTransactionLimit(e.target.value)} placeholder="e.g., 15" step="0.01" min="0" />
          </div>
          <button type="submit" style={{marginTop: 'var(--spacing-md)'}}>Save Limits</button>
        </form>

        <h4 style={{marginTop: 'var(--spacing-lg)'}}>Blocked Categories:</h4>
        {kid.blockedCategories && kid.blockedCategories.length > 0 ? (
          <ul style={{listStyle: 'disc', paddingLeft: 'var(--spacing-lg)'}}>
            {kid.blockedCategories.map(cat => <li key={cat}>{cat}</li>)}
          </ul>
        ) : <p>No categories currently blocked.</p>}
        {/* UI for editing blocked categories can be added later */}

        <div style={{ marginTop: 'var(--spacing-xl)' }}>
          <Link to="/settings" className="button-link-styled">Back to Settings</Link>
        </div>
      </section>
    </div>
  );
};
export default KidDetailView;
