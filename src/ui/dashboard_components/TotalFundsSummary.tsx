import React from 'react';
import { useFinancialContext } from '../../contexts/FinancialContext'; // Corrected path
// import './TotalFundsSummary.css'; // Assuming you might have styles -- Removed as file does not exist

const TotalFundsSummary = () => {
  const { financialData } = useFinancialContext();

  // Safely access balance, defaulting to 0 if financialData is null or undefined
  const balance = financialData?.currentBalance ?? 0;
  const formattedBalance = balance.toFixed(2);

  // Optionally, display a loading or N/A state
  if (!financialData) {
    return (
      <div className="total-funds-summary">
        <h2>Total Funds</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="total-funds-summary">
      <h2>Total Funds</h2>
      <p>Available: ${formattedBalance}</p>
    </div>
  );
};
export default TotalFundsSummary;
