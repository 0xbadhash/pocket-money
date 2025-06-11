import React from 'react';
import { useFinancialContext } from '../../../contexts/FinancialContext';
import './TotalFundsSummary.css'; // Assuming you might have styles

const TotalFundsSummary = () => {
  const { financialData } = useFinancialContext();
  const balance = financialData.currentBalance;
  const formattedBalance = balance.toFixed(2);

  return (
    <div className="total-funds-summary">
      <h2>Total Funds</h2>
      <p>Available: ${formattedBalance}</p>
    </div>
  );
};
export default TotalFundsSummary;
