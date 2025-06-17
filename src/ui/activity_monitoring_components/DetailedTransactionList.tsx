// src/ui/activity_monitoring_components/DetailedTransactionList.tsx
import React, { useContext } from 'react'; // Import useContext
import type { Transaction } from '../../types';
import { UserContext } from '../../contexts/UserContext'; // Import UserContext

interface DetailedTransactionListProps {
  transactionsToDisplay: Transaction[];
}

const DetailedTransactionList: React.FC<DetailedTransactionListProps> = ({ transactionsToDisplay }) => {
  const userContext = useContext(UserContext); // Consume UserContext
  const kids = userContext?.user?.kids || [];

  const getKidNameForTable = (kidId: string | undefined): string => {
    if (!kidId) return 'General';
    const kid = kids.find((k: { id: string; name: string }) => k.id === kidId);
    return kid ? kid.name : `ID: ${kidId}`; // Fallback if kid not found
  };

  return (
    <div className="detailed-transaction-list">
      <h4>Detailed Transactions</h4>
      {/* Optionally show loading state for kids if userContext.loading */}
      {userContext?.loading && transactionsToDisplay.length > 0 && <p>Loading kid names...</p>}
      {transactionsToDisplay.length === 0 ? (
        <p>No transactions found for the selected criteria.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Kid</th> {/* Re-enable Kid column */}
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactionsToDisplay.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.date}</td>
                <td>{getKidNameForTable(tx.kidId)}</td>
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
