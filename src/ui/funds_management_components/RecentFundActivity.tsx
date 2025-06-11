// src/ui/funds_management_components/RecentFundActivity.tsx
import { useContext } from 'react';
import { useFinancialContext } from '../../contexts/FinancialContext';
import { UserContext } from '../../contexts/UserContext';
import { Transaction, AppUser, Kid } from '../../types'; // Added Kid

const RecentFundActivity = () => {
  const { financialData } = useFinancialContext(); // Changed to financialData
  const userContext = useContext(UserContext);
  // Changed to use user.kids, as allUsers is not on UserContextType
  const kidsList: Kid[] = userContext?.user?.kids || [];

  // Helper to format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    // Format as "Mon DD, YYYY" or similar for consistency if needed
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper to get user name from ID
  const getUserName = (userId: string | undefined): string => {
    if (!userId) return 'N/A';
    // Now finds from kidsList
    const kid = kidsList.find((k: Kid) => k.id === userId);
    if (kid) return kid.name;
    // Fallback for user IDs that are not kids (e.g. parent, if transactions involve them directly)
    // This part is a placeholder as we don't have a list of all AppUsers easily available.
    if (userContext?.user?.id === userId) return userContext.user.name; // Check if it's the current user
    return 'Unknown User'; // Default
  };

  // Filter and limit recent transactions (e.g., last 5)
  // Sort by date (most recent first)
  const recentTransactions = financialData.transactions // Use financialData.transactions
    .sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
              {transaction.amount >= 0 ? '+' : '-'} ${Math.abs(transaction.amount).toFixed(2)} {transaction.description}
              {/* Simplified display due to missing properties on Transaction type */}
              {transaction.kidId && ` (Kid: ${getUserName(transaction.kidId)})`}
              {' - '}
              {formatDate(transaction.date)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
export default RecentFundActivity;