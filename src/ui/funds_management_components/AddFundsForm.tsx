// src/ui/funds_management_components/AddFundsForm.tsx
import React, { useState } from 'react';
// Remove useContext from here if it was imported before, we'll use our custom hook
import { useFinancialContext } from '../../contexts/FinancialContext'; // <-- Import custom hook

const AddFundsForm = () => {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('bank_account_1');
  const { addFunds } = useFinancialContext(); // <-- Consume context

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = parseFloat(amount); // Convert amount to number

    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    // Call addFunds from context
    addFunds(numericAmount, `Deposit from ${source}`);

    console.log(`Funds added: $${numericAmount} from ${source}`);
    alert(`Successfully added $${numericAmount} from ${source}`);
    setAmount(''); // Reset amount after submission
    // setSource('bank_account_1'); // Optionally reset source
  };

  return (
    <div className="add-funds-form">
      <h2>Add Funds</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="amount">Amount:</label>
          <input
            type="number"
            id="amount"
            name="amount"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01" // Allow decimal input
          />
        </div>
        <div>
          <label htmlFor="source">Source:</label>
          <select
            id="source"
            name="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="bank_account_1">Bank Account ****1234</option>
            <option value="bank_account_2">Savings Account ****5678</option>
          </select>
        </div>
        <button type="submit">Add Funds</button>
      </form>
    </div>
  );
};

export default AddFundsForm;
