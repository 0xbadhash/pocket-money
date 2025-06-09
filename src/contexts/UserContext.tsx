import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import type { AppUser, ParentUser, Kid } from '../types'; // Using AppUser for currentUser, and Kid type

// Define the shape of the context value
interface UserContextType {
  currentUser: AppUser | null;
  authToken: string | null;
  loading: boolean; // Indicates if context is busy with an async auth operation or initial load
  loginContext: (userData: AppUser, token: string) => void;
  logoutContext: () => void;
  // Merged from main: functions for managing kid data, assuming currentUser (AppUser) can contain kid information
  updateKidSpendingLimits: (parentId: string, kidId: string, newLimits: Kid['spendingLimits']) => void;
  // updateKidBlockedCategories: (parentId: string, kidId: string, newCategories: Kid['blockedCategories']) => void; // Placeholder for future
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // True while checking localStorage

  useEffect(() => {
    // Try to load token and user from localStorage on initial mount
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('currentUser');

    if (storedToken && storedUser) {
      try {
        const parsedUser: AppUser = JSON.parse(storedUser);
        setAuthToken(storedToken);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false); // Done with initial load attempt
  }, []);

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

  const updateKidSpendingLimits = (parentId: string, kidId: string, newLimits: Kid['spendingLimits']) => {
    setCurrentUser(prevUser => {
      if (!prevUser) return null;

      // Assuming AppUser can contain an array of kids, similar to the `User` type in `main`
      // This part might need adjustment based on the actual structure of AppUser and ParentUser
      if ('kids' in prevUser && Array.isArray(prevUser.kids)) {
        return {
          ...prevUser,
          kids: prevUser.kids.map(kid =>
            kid.id === kidId
              ? { ...kid, spendingLimits: { ...(kid.spendingLimits || {}), ...newLimits } }
              : kid
          ),
        } as AppUser; // Type assertion as prevUser might not directly match AppUser with 'kids'
      }
      return prevUser;
    });
    console.log(`Updated spending limits for kid ${kidId} under parent ${parentId}:`, newLimits);
  };

  // Placeholder for updateKidBlockedCategories
  // const updateKidBlockedCategories = (parentId: string, kidId: string, newCategories: Kid['blockedCategories']) => {
  //   setCurrentUser(prevUser => {
  //     if (!prevUser) return null;
  //     if ('kids' in prevUser && Array.isArray(prevUser.kids)) {
  //       return {
  //         ...prevUser,
  //         kids: prevUser.kids.map(kid =>
  //           kid.id === kidId
  //             ? { ...kid, blockedCategories: newCategories }
  //             : kid
  //         ),
  //       } as AppUser;
  //     }
  //     return prevUser;
  //   });
  //   console.log(`Updated blocked categories for kid ${kidId} under parent ${parentId}:`, newCategories);
  // };

  return (
    <UserContext.Provider value={{
      currentUser,
      authToken,
      loading,
      loginContext,
      logoutContext,
      updateKidSpendingLimits,
      // updateKidBlockedCategories
    }}>
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