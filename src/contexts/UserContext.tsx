// src/contexts/UserContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { Kid } from '../types'; // Import Kid type

// Define the shape of the user data
interface User {
  name: string;
  email: string;
  kids: Kid[]; // Kid type now includes spendingLimits and blockedCategories
}

// Define the shape of the context value
interface UserContextType {
  user: User | null;
  loading: boolean;
  updateKidSpendingLimits: (kidId: string, newLimits: Kid['spendingLimits']) => void; // <-- New function
  // updateKidBlockedCategories: (kidId: string, newCategories: Kid['blockedCategories']) => void; // Placeholder for future
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
        kids: [
          {
            id: 'kid_a', name: 'Alex', age: 10,
            spendingLimits: { daily: 10, weekly: 50, perTransaction: 7 },
            blockedCategories: ['Online Gambling']
          },
          {
            id: 'kid_b', name: 'Bailey', age: 8,
            spendingLimits: { weekly: 30, perTransaction: 10 }
            // No blockedCategories means it's undefined
          },
          {
            id: 'kid_c', name: 'Casey', age: 12,
            // No spendingLimits means it's undefined
            blockedCategories: [] // Explicitly empty array for no blocked categories
          }
        ],
      });
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const updateKidSpendingLimits = (kidId: string, newLimits: Kid['spendingLimits']) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      return {
        ...prevUser,
        kids: prevUser.kids.map(kid =>
          kid.id === kidId
            ? { ...kid, spendingLimits: { ...kid.spendingLimits, ...newLimits } } // Merge newLimits with existing
            : kid
        ),
      };
    });
    console.log(`Updated spending limits for kid ${kidId}:`, newLimits); // For debugging
  };

  // Placeholder for updateKidBlockedCategories
  // const updateKidBlockedCategories = (kidId: string, newCategories: Kid['blockedCategories']) => {
  //   setUser(prevUser => {
  //     if (!prevUser) return null;
  //     return {
  //       ...prevUser,
  //       kids: prevUser.kids.map(kid =>
  //         kid.id === kidId
  //           ? { ...kid, blockedCategories: newCategories }
  //           : kid
  //       ),
  //     };
  //   });
  //   console.log(`Updated blocked categories for kid ${kidId}:`, newCategories);
  // };

  return (
    <UserContext.Provider value={{ user, loading, updateKidSpendingLimits /*, updateKidBlockedCategories */ }}> {/* <-- Add to value */}
      {children}
    </UserContext.Provider>
  );
};
