// src/ui/funds_management_components/CurrentBalanceDisplay.tsx
import { useFinancialContext } from '../../contexts/FinancialContext'; // Import custom hook

const CurrentBalanceDisplay = () => {
  const { generalBalance } = useFinancialContext(); // Destructure generalBalance from context

  return (
    <div className="current-balance-display">
      <h2>Current Balance</h2>
      {/* Display the actual general balance */}
      <p className="balance-amount">${generalBalance.toFixed(2)}</p>
      {/* The "Last updated" part might be dynamic later if you implement it */}
      <p className="last-updated">Last updated: Just now</p>
    </div>
  );
};
export default CurrentBalanceDisplay;