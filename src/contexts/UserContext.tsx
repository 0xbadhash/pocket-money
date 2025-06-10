import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import type { AppUser, ParentUser, UserRole } from '../types'; // Import UserRole for mock data

// Define the shape of the context value
interface UserContextType {
  currentUser: AppUser | null;
  authToken: string | null;
  loading: boolean; // Indicates if context is busy with an async auth operation or initial load
  loginContext: (userData: AppUser, token: string) => void;
  logoutContext: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial loading effect to check for stored user/token or set mock data
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('currentUser');

    if (storedToken && storedUser) {
      try {
        const user: AppUser = JSON.parse(storedUser);
        setCurrentUser(user);
        setAuthToken(storedToken);
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        // Clear invalid data
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
      } finally {
        setLoading(false);
      }
    } else {
      // If no stored user/token, simulate initial fetch (mock data from 'main' branch)
      const timer = setTimeout(() => {
        // Mock a ParentUser with kids, conforming to AppUser and ParentUser types
        const mockParentUser: ParentUser = {
          id: 'user_parent_mock_123',
          email: 'parent.user.mock@example.com',
          name: 'Mock Parent User',
          role: UserRole.PARENT, // Use UserRole enum
          createdAt: new Date(),
          updatedAt: new Date(),
          kids: [
            { id: 'kid_a', name: 'Alex', age: 10, parentAccountId: 'user_parent_mock_123', role: UserRole.KID, email: 'alex@example.com', createdAt: new Date(), updatedAt: new Date() },
            { id: 'kid_b', name: 'Bailey', age: 8, parentAccountId: 'user_parent_mock_123', role: UserRole.KID, email: 'bailey@example.com', createdAt: new Date(), updatedAt: new Date() },
            { id: 'kid_c', name: 'Casey', age: 12, parentAccountId: 'user_parent_mock_123', role: UserRole.KID, email: 'casey@example.com', createdAt: new Date(), updatedAt: new Date() },
          ],
        };
        setCurrentUser(mockParentUser);
        setAuthToken('mock-auth-token-123'); // Provide a mock token
        setLoading(false);
      }, 1500); // Simulate network delay

      return () => clearTimeout(timer); // Cleanup timer if component unmounts
    }
  }, []); // Run only once on mount

  const loginContext = (userData: AppUser, token: string) => {
    setCurrentUser(userData);
    setAuthToken(token);
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setLoading(false); // Explicitly set loading to false after login
  };

  const logoutContext = () => {
    setCurrentUser(null);
    setAuthToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    setLoading(false); // Explicitly set loading to false after logout
  };

  return (
    <UserContext.Provider value={{ currentUser, authToken, loading, loginContext, logoutContext }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the UserContext
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};