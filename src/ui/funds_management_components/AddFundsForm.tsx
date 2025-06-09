// src/ui/funds_management_components/AddFundsForm.tsx
import React, { useState, useContext } from 'react';
import { useFinancialContext } from '../../contexts/FinancialContext';
import { UserContext } from '../../contexts/UserContext';

const AddFundsForm = () => {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('bank_account_1'); // Default source
  const [selectedKidId, setSelectedKidId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { addFunds } = useFinancialContext();
  const userContext = useContext(UserContext);
  const kids = userContext?.user?.kids || [];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null); // Clear previous errors
    setSuccessMessage(null); // Clear previous success messages
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    setIsLoading(true);

    const kidName = selectedKidId ? kids.find(k => k.id === selectedKidId)?.name : 'General Family Funds';
    // The 'source' state variable (e.g., 'bank_account_1') is passed directly as the source to addFunds.
    // The 'fullDescription' is for display purposes in the transaction list.
    const fullDescription = `Deposit from ${source} to ${kidName}`;

    try {
      // Use the new signature: addFunds(amount, source, kidId, fullDescription)
      const result = await addFunds(numericAmount, source, selectedKidId || undefined, fullDescription);

      if (result.success && result.transaction) {
        setSuccessMessage(`Successfully added $${result.transaction.amount} for ${kidName}. Transaction ID: ${result.transaction.id}`);
        setAmount(''); // Clear amount after successful submission
        // setSelectedKidId(''); // Optionally reset kid selection
      } else {
        setError(result.error || 'Failed to add funds. Please try again.');
      }
    } catch (apiError: any) {
      console.error("Add funds component error:", apiError);
      setError(apiError.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="add-funds-form">
      <h2>Add Funds</h2>
      {error && <p className="error-message" style={{ color: 'red' }}>Error: {error}</p>}
      {successMessage && <p className="success-message" style={{ color: 'green' }}>{successMessage}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="amount">Amount:</label>
          <input
            type="number"
            id="amount"
            name="amount"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null); // Clear error when amount changes
              setSuccessMessage(null); // Clear success message
            }}
            step="0.01"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="source">Source:</label>
          <select
            id="source"
            name="source"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setError(null); // Clear error when source changes
              setSuccessMessage(null);
            }}
            disabled={isLoading}
          >
            <option value="bank_account_1">Bank Account ****1234</option>
            <option value="bank_account_2">Savings Account ****5678</option>
            {/* In a real app, these sources might come from user's payment methods */}
          </select>
        </div>

        <div>
          <label htmlFor="kidTarget">For:</label>
          <select
            id="kidTarget"
            name="kidTarget"
            value={selectedKidId}
            onChange={(e) => {
              setSelectedKidId(e.target.value);
              setError(null); // Clear error when kid target changes
              setSuccessMessage(null);
            }}
            disabled={userContext?.loading || kids.length === 0 || isLoading}
          >
            <option value="">General Family Funds</option>
            {kids.map(kid => (
              <option key={kid.id} value={kid.id}>
                {kid.name}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Add Funds'}
        </button>
      </form>
    </div>
  );
};

export default AddFundsForm;
