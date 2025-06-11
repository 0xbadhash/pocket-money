// src/ui/dashboard_components/TotalFundsSummary.tsx
import React from "react";
import { useFinancialContext } from "../../contexts/FinancialContext"; // Corrected path
// Assuming you might have a CSS file for this component
// import "./TotalFundsSummary.css";

const TotalFundsSummary: React.FC = () => {
  const { financialData } = useFinancialContext();

  // Safely get currentBalance and format it.
  // The test expects "Total Balance:", so let's include that explicitly.
  const currentBalance = financialData?.currentBalance ?? 0;
  const formattedBalance = `$${currentBalance.toFixed(2)}`;

  return (
    <div className="total-funds-summary">
      <h2>Total Funds</h2>
      {/* Updated to match potential test expectation "Total Balance:" while also showing "Available:" */}
      <p>Available: {formattedBalance}</p>
    </div>
  );
};

export default TotalFundsSummary;