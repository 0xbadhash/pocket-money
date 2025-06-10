// src/ui/funds_management_components/AddFundsForm.tsx
import React, { useState, useContext } from 'react'; // Added useContext
import { useFinancialContext } from '../../contexts/FinancialContext';
import { UserContext } from '../../contexts/UserContext'; // Import UserContext

const AddFundsForm = () => {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('bank_account_1');
  const [selectedKidId, setSelectedKidId] = useState(''); // State for selected kid, '' for General

  const { addFunds } = useFinancialContext();
  const userContext = useContext(UserContext); // Consume UserContext
  const kids = userContext?.user?.kids || [];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    // We'll pass selectedKidId to addFunds in a later step
    const kidName = selectedKidId ? kids.find(k => k.id === selectedKidId)?.name : 'General Funds';
    addFunds(numericAmount, `Deposit from ${source} for ${kidName}`, selectedKidId || undefined);


    console.log(`Funds added: $${numericAmount} from ${source} for ${kidName}`);
    alert(`Successfully added $${numericAmount} from ${source} for ${kidName}`);
    setAmount('');
    // setSelectedKidId(''); // Optionally reset kid selection
  };

  return (
    <div className="add-funds-form">
      <h2>Add Funds</h2>
      <form onSubmit={handleSubmit}>
        {/* Amount Input */}
        <div>
          <label htmlFor="amount">Amount:</label>
          <input
            type="number"
            id="amount"
            name="amount"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
          />
        </div>

        {/* Source Select */}
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

        {/* Kid Select (New) */}
        <div>
          <label htmlFor="kidTarget">For:</label>
          <select
            id="kidTarget"
            name="kidTarget"
            value={selectedKidId}
            onChange={(e) => setSelectedKidId(e.target.value)}
            disabled={userContext?.loading || kids.length === 0}
          >
            <option value="">General Family Funds</option> {/* Default/General option */}
            {kids.map(kid => (
              <option key={kid.id} value={kid.id}>
                {kid.name}
              </option>
            ))}
          </select>
        </div>

        <button type="submit">Add Funds</button>
      </form>
    </div>
  );
};

export default AddFundsForm;
