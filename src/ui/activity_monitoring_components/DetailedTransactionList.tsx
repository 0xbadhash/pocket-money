// src/ui/activity_monitoring_components/DetailedTransactionList.tsx
import React from 'react';
// Assuming Transaction type might be needed if not implicitly inferred or defined globally
// We might need to import/define the Transaction type here if it's not available globally
// For now, let's assume it's implicitly available or we define it ad-hoc if issues arise.
// A better approach would be to have shared types.

interface Transaction { // Temporary: Define here if not imported from a shared types file
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  // kid?: string; // Add if kid info becomes part of the transaction later
}

interface DetailedTransactionListProps {
  transactionsToDisplay: Transaction[];
}

const DetailedTransactionList: React.FC<DetailedTransactionListProps> = ({ transactionsToDisplay }) => {
  return (
    <div className="detailed-transaction-list">
      <h4>Detailed Transactions</h4>
      {transactionsToDisplay.length === 0 ? (
        <p>No transactions found for the selected criteria.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactionsToDisplay.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.date}</td>
                <td>{tx.description}</td>
                <td>{tx.category}</td>
                <td style={{ color: tx.amount < 0 ? 'red' : 'green' }}>
                  {tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : `+$${tx.amount.toFixed(2)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DetailedTransactionList;
