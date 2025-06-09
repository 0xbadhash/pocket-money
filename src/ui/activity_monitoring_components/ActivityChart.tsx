// src/ui/activity_monitoring_components/ActivityChart.tsx
import React from 'react';
import type { Transaction } from '../../types'; // Assuming Transaction is exported

interface ActivityChartProps {
  transactionsForChart: Transaction[];
}

const ActivityChart: React.FC<ActivityChartProps> = ({ transactionsForChart }) => {
  const numTransactions = transactionsForChart.length;
  let totalSpending = 0;
  let totalIncome = 0;
  const spendingByCategory: { [key: string]: number } = {};

  transactionsForChart.forEach(tx => {
    if (tx.amount < 0) {
      totalSpending += Math.abs(tx.amount);
      const category = tx.category || 'Uncategorized';
      spendingByCategory[category] = (spendingByCategory[category] || 0) + Math.abs(tx.amount);
    } else {
      totalIncome += tx.amount;
    }
  });

  return (
    <div className="activity-chart">
      <h4>Activity Summary</h4>
      {numTransactions === 0 ? (
        <p>No transactions to summarize for the selected criteria.</p>
      ) : (
        <div>
          <p><strong>Total Transactions:</strong> {numTransactions}</p>
          <p><strong>Total Income:</strong> ${totalIncome.toFixed(2)}</p>
          <p><strong>Total Spending:</strong> ${totalSpending.toFixed(2)}</p>

          <h5>Spending by Category:</h5>
          {Object.keys(spendingByCategory).length > 0 ? (
            <ul>
              {Object.entries(spendingByCategory).map(([category, amount]) => (
                <li key={category}>
                  {category}: ${amount.toFixed(2)}
                </li>
              ))}
            </ul>
          ) : (
            <p>No spending recorded for these transactions.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityChart;
