// src/ui/funds_management_components/AddFundsForm.tsx
import React, { useState } from 'react'; // Import useState

const AddFundsForm = () => {
  const [amount, setAmount] = useState(''); // State for amount input
  const [source, setSource] = useState('bank_account_1'); // State for source select, default to first option

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default form submission
    console.log('Attempting to add funds:');
    console.log('Amount:', amount);
    console.log('Source:', source);
    // Here you would typically dispatch an action or call an API
    // For now, just log and maybe reset the form
    alert(`Funds to add: $${amount} from ${source}`);
    setAmount(''); // Reset amount after submission
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
            value={amount} // Controlled component: value linked to state
            onChange={(e) => setAmount(e.target.value)} // Update state on change
          />
        </div>
        <div>
          <label htmlFor="source">Source:</label>
          <select
            id="source"
            name="source"
            value={source} // Controlled component: value linked to state
            onChange={(e) => setSource(e.target.value)} // Update state on change
          >
            <option value="bank_account_1">Bank Account ****1234</option>
            <option value="bank_account_2">Savings Account ****5678</option>
            {/* More options can be added later */}
          </select>
        </div>
        <button type="submit">Add Funds</button>
      </form>
    </div>
  );
};

export default AddFundsForm;
