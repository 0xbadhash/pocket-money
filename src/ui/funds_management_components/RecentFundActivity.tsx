// src/ui/funds_management_components/RecentFundActivity.tsx
import { useContext } from 'react';
import { useFinancialContext } from '../../contexts/FinancialContext';
import { UserContext } from '../../contexts/UserContext';
import { Transaction } from '../../types'; // Assuming Transaction type is defined in types.ts

const RecentFundActivity = () => {
  const { transactions } = useFinancialContext();
  const userContext = useContext(UserContext);
  const users = userContext?.allUsers || []; // Assuming allUsers is available or you have a way to map user IDs to names

  // Helper to format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    // Format as "Mon DD, YYYY" or similar for consistency if needed
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper to get user name from ID
  const getUserName = (userId: string | undefined): string => {
    if (!userId) return 'N/A';
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
  };

  // Filter and limit recent transactions (e.g., last 5)
  // Sort by date (most recent first)
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5); // Display last 5 transactions

  return (
    <div className="recent-fund-activity">
      <h2>Recent Fund Activity</h2>
      {recentTransactions.length === 0 ? (
        <p>No recent activity.</p>
      ) : (
        <ul>
          {recentTransactions.map((transaction: Transaction) => (
            <li key={transaction.id}>
              {transaction.amount >= 0 ? '+' : '-'} ${Math.abs(transaction.amount).toFixed(2)} {transaction.description} (
              {transaction.type === 'deposit' && `From ${getUserName(transaction.fromUserId)}`}
              {transaction.type === 'withdrawal' && `To ${getUserName(transaction.toUserId)}`}
              {transaction.type === 'transfer' && `From ${getUserName(transaction.fromUserId)} to ${getUserName(transaction.toUserId)}`}
              ) - {formatDate(transaction.date)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
export default RecentFundActivity;