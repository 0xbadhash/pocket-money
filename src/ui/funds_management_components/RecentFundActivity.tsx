// src/ui/funds_management_components/RecentFundActivity.tsx
import { useContext } from 'react'; // Import useContext
import { useFinancialContext } from '../../contexts/FinancialContext';
import { UserContext } from '../../contexts/UserContext'; // Import UserContext

const RecentFundActivity = () => {
  const { financialData } = useFinancialContext();
  const { transactions } = financialData;
  const userContext = useContext(UserContext); // Consume UserContext
  const kids = userContext?.user?.kids || [];

  const getKidName = (kidId: string | undefined): string => {
    if (!kidId) return '';
    const kid = kids.find(k => k.id === kidId);
    return kid ? ` (For: ${kid.name})` : ` (For ID: ${kidId})`; // Fallback if kid not found by ID
  };

  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="recent-fund-activity">
      <h2>Recent Fund Activity</h2>
      {userContext?.loading && <p>Loading user data for kid names...</p>}
      {recentTransactions.length === 0 ? (
        <p>No recent activity.</p>
      ) : (
        <ul>
          {recentTransactions.map((tx) => (
            <li key={tx.id}>
              {tx.description}{getKidName(tx.kidId)} ({tx.date}):
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
