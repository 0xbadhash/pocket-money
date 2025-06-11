// src/contexts/UserContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { Kid } from '../types'; // Import Kid type

// Define the shape of the user data
interface User {
  name: string;
  email: string;
  kids: Kid[]; // Add kids array
  // Add other user-specific fields here if needed later
}

// Define the shape of the context value
export interface UserContextType {
  user: User | null;
  loading: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setUser({
        name: 'Parent User (Fetched)',
        email: 'parent.user.fetched@example.com',
        kids: [ // Add mock kids data
          { id: 'kid_a', name: 'Alex', age: 10 },
          { id: 'kid_b', name: 'Bailey', age: 8 },
          { id: 'kid_c', name: 'Casey', age: 12 },
        ],
      });
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
};
