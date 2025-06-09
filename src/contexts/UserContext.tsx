// src/contexts/UserContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react'; // Added useEffect

interface User {
  name: string;
  email: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean; // Add a loading state
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null); // Initialize user as null
  const [loading, setLoading] = useState(true); // Initialize loading as true

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setUser({
        name: 'Parent User (Fetched)', // Indicate data is "fetched"
        email: 'parent.user.fetched@example.com',
      });
      setLoading(false); // Set loading to false after data is "fetched"
    }, 1500); // Simulate 1.5 seconds delay

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
};
