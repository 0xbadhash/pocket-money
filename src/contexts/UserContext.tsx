// src/contexts/UserContext.tsx
import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import type { AppUser, ParentUser } from '../types'; // Using AppUser for currentUser

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

  // This effect can be used to update loading state based on currentUser and authToken presence if needed,
  // but for login/logout, it's handled directly.
  // useEffect(() => {
  //   // If not loading from localStorage and no user/token, set loading to false.
  //   // If there is a user/token, it implies loading is complete or auth state is set.
  //   if (!localStorage.getItem('authToken') && !currentUser) {
  //       setLoading(false);
  //   }
  // }, [currentUser, authToken]);


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
