// src/ui/activity_monitoring_components/DetailedTransactionList.tsx
import React from 'react';
import { useFinancialContext } from '../../contexts/FinancialContext'; // Adjust path

const DetailedTransactionList = () => {
  const { financialData } = useFinancialContext();
  const { transactions } = financialData; // Use transactions from context

  return (
    <div className="detailed-transaction-list">
      <h4>Detailed Transactions</h4>
      {transactions.length === 0 ? (
        <p>No transactions found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              {/*<th>Kid</th> Re-add if/when kid info is part of Transaction type */}
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.date}</td>
                {/*<td>{tx.kid}</td> Re-add if/when kid info is part of Transaction type */}
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
