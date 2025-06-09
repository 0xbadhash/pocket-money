// src/ui/activity_monitoring_components/DetailedTransactionList.tsx
import React from 'react';

const DetailedTransactionList = () => {
  // Placeholder data
  const transactions = [
    { id: 1, date: '2023-10-28', description: 'Ice Cream Shop', amount: -5.50, kid: 'Kid A', category: 'Food' },
    { id: 2, date: '2023-10-27', description: 'Online Game Purchase', amount: -19.99, kid: 'Kid B', category: 'Games' },
    { id: 3, date: '2023-10-26', description: 'Bookstore', amount: -12.00, kid: 'Kid A', category: 'Education' },
    { id: 4, date: '2023-10-25', description: 'Allowance Added', amount: 10.00, kid: 'Kid A', category: 'Income' },
  ];

  return (
    <div className="detailed-transaction-list">
      <h4>Detailed Transactions</h4>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Kid</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id}>
              <td>{tx.date}</td>
              <td>{tx.kid}</td>
              <td>{tx.description}</td>
              <td>{tx.category}</td>
              <td style={{ color: tx.amount < 0 ? 'red' : 'green' }}>
                {tx.amount < 0 ? `-$${Math.abs(tx.amount).toFixed(2)}` : `+$${tx.amount.toFixed(2)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DetailedTransactionList;
