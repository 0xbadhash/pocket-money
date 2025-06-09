// src/ui/funds_management_components/RecentFundActivity.tsx
import React from 'react';
import { useFinancialContext } from '../../contexts/FinancialContext'; // Adjust path

const RecentFundActivity = () => {
  const { financialData } = useFinancialContext();
  const { transactions } = financialData;

  // Display a limited number of recent transactions, e.g., the latest 5
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="recent-fund-activity">
      <h2>Recent Fund Activity</h2>
      {recentTransactions.length === 0 ? (
        <p>No recent activity.</p>
      ) : (
        <ul>
          {recentTransactions.map((tx) => (
            <li key={tx.id}>
              {tx.description} ({tx.date}):
              <span style={{ color: tx.amount < 0 ? 'red' : 'green', marginLeft: '8px' }}>
                {tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : `+$${tx.amount.toFixed(2)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RecentFundActivity;
