// src/ui/funds_management_components/CurrentBalanceDisplay.tsx
import React from 'react'; // useContext will be brought in by the custom hook
import { useFinancialContext } from '../../contexts/FinancialContext'; // Import custom hook

const CurrentBalanceDisplay = () => {
  const { financialData } = useFinancialContext(); // Consume context

  // Format the balance as currency.
  // In a real app, you might use Intl.NumberFormat for more robust localization.
  const formattedBalance = `$${financialData.currentBalance.toFixed(2)}`;

  return (
    <div className="current-balance-display">
      <h2>Current Balance</h2>
      {/* Display balance from context */}
      <p className="balance-amount">{formattedBalance}</p>
      {/* "Last updated" could be part of financialData in the future if needed */}
      <p className="last-updated">Last updated: Just now (Live)</p>
    </div>
  );
};

export default CurrentBalanceDisplay;
