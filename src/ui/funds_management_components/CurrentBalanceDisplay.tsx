// src/ui/funds_management_components/CurrentBalanceDisplay.tsx
import { useFinancialContext } from '../../contexts/FinancialContext'; // Import custom hook

const CurrentBalanceDisplay = () => {
  const { financialData } = useFinancialContext(); // Destructure financialData
  const balance = financialData.currentBalance; // Get currentBalance
  const formattedBalance = balance.toFixed(2); // Format it

  return (
    <div className="current-balance-display">
      <h2>Current Balance</h2>
      {/* Display the actual general balance */}
      <p className="balance-amount">${formattedBalance}</p> {/* Use formattedBalance */}
      {/* The "Last updated" part might be dynamic later if you implement it */}
      <p className="last-updated">Last updated: Just now</p>
    </div>
  );
};
export default CurrentBalanceDisplay;