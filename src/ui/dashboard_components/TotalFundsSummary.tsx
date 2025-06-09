// src/ui/dashboard_components/TotalFundsSummary.tsx
import React from 'react';
import { useFinancialContext } from '../../contexts/FinancialContext'; // Adjust path as needed

const TotalFundsSummary = () => {
  const { financialData } = useFinancialContext(); // Consume context

  const formattedBalance = `$${financialData.currentBalance.toFixed(2)}`;

  return (
    <div className="total-funds-summary">
      <h2>Total Funds</h2>
      {/* Display balance from context */}
      <p>Available: {formattedBalance}</p>
    </div>
  );
};

export default TotalFundsSummary;
