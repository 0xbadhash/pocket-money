// src/contexts/UserContext.tsx
import React, { createContext, useState, useEffect, ReactNode, useContext, useMemo } from 'react';
import type { User, Kid, KanbanColumnConfig } from '../types'; // Import Kid and KanbanColumnConfig types
import { vi } from 'vitest'; // Import vi for mocking functions

// Define the shape of the user data
// This should align with how user data is structured, including an ID.
export interface User {
  id: string;
  username: string; // Changed from 'name' for clarity if it's a username
  email: string;
  kids: Kid[];
  settings?: { // Example: User-specific settings
    defaultView?: string;
    theme?: 'light' | 'dark';
  };
  // Add other user-specific fields here
  createdAt?: string;
  updatedAt?: string;
}

// Define the shape of the context value
export interface UserContextType {
  user: User | null;
  // isLoading: boolean; // Changed from loading for clarity
  loading: boolean; // Reverted to loading to match original type
  error: string | null; // Add error state

  // Basic user functions
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void;

  // Kid specific functions
  // Ensure these are optional or provide dummy implementations if not central to UserProvider's core
  addKid: (kidData: Omit<Kid, 'id' | 'kanbanColumnConfigs' | 'totalFunds'> & { totalFunds?: number }) => string | undefined;
  updateKid: (updatedKidData: Kid) => void;
  deleteKid: (kidId: string) => void;
  // selectKid: (kidId: string | null) => void; // This was not in original UserContextType
  // getKidById: (kidId: string) => Kid | null; // This was not in original UserContextType
  // selectedKidId: string | null; // This was not in original UserContextType

  // Kanban Column Config functions
  getKanbanColumnConfigs: (kidId: string) => KanbanColumnConfig[];
  addKanbanColumnConfig: (kidId: string, title: string, color?: string) => Promise<void>;
  updateKanbanColumnConfig: (updatedConfig: KanbanColumnConfig) => Promise<void>;
  deleteKanbanColumnConfig: (kidId: string, configId: string) => Promise<void>;
  reorderKanbanColumnConfigs: (kidId: string, orderedConfigs: KanbanColumnConfig[]) => Promise<void>;

  // Theme and Avatar related (if these were part of a more complete UserContextType)
  // themes?: string[];
  // currentTheme?: string;
  // setTheme?: (themeName: string) => void;
  // avatars?: string[];
  // updateKidFunds?: (kidId: string, amount: number) => void; // Not in original UserContextType
  // addTransaction?: (kidId: string, transaction: any) => void; // Not in original UserContextType
}


/**
 * Context for managing user data, including authentication state, user profile,
 * kid profiles, and settings like custom Kanban column configurations.
 * Provides functions to interact with and modify this data.
 */
export const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const sampleKids: Kid[] = [
      { id: 'kid1', name: 'Alice', totalFunds: 0, kanbanColumnConfigs: [] },
      { id: 'kid2', name: 'Bob', totalFunds: 0, kanbanColumnConfigs: [] },
    ];
    const sampleUser: User = {
      id: 'user123',
      username: 'MockUser',
      email: 'user@example.com',
      kids: sampleKids,
      settings: { theme: 'light' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUser(sampleUser);
    setError(null);
    setLoading(false);
  }, []);


  const contextValue = useMemo(() => ({
    user,
    loading,
    error,
    login: vi.fn((userData: User) => {
      setUser(userData);
      // console.log('Mock login called with:', userData); // Optional: for debugging
    }),
    logout: vi.fn(() => {
      setUser(null);
      // console.log('Mock logout called'); // Optional: for debugging
    }),
    updateUser: vi.fn((updatedUserData: Partial<User>) => {
      // console.log('Mock updateUser called with:', updatedUserData); // Optional: for debugging
      if (user) {
        setUser({ ...user, ...updatedUserData });
      }
    }),
    addKid: vi.fn((kidData: Omit<Kid, 'id' | 'kanbanColumnConfigs' | 'totalFunds'> & { totalFunds?: number }) => {
      // console.log('Mock addKid called with:', kidData); // Optional: for debugging
      if (user) {
        const newKid: Kid = {
          id: `kid${new Date().getTime()}`, // Simple unique ID
          name: kidData.name,
          totalFunds: kidData.totalFunds || 0,
          kanbanColumnConfigs: [],
          // Assuming other Kid properties are optional or have defaults
        };
        setUser({ ...user, kids: [...user.kids, newKid] });
        return newKid.id;
      }
      return undefined;
    }),
    updateKid: vi.fn((updatedKidData: Kid) => {
      // console.log('Mock updateKid called with:', updatedKidData); // Optional: for debugging
      if (user) {
        setUser({
          ...user,
          kids: user.kids.map(kid => kid.id === updatedKidData.id ? updatedKidData : kid),
        });
      }
    }),
    deleteKid: vi.fn((kidId: string) => {
      // console.log('Mock deleteKid called for kidId:', kidId); // Optional: for debugging
      if (user) {
        setUser({ ...user, kids: user.kids.filter(kid => kid.id !== kidId) });
      }
    }),
    getKanbanColumnConfigs: vi.fn((kidId: string) => {
      // console.log('Mock getKanbanColumnConfigs called for kidId:', kidId); // Optional: for debugging
      // KidKanbanBoard no longer relies on this for matrix rows, but it might be called.
      return [];
    }),
    addKanbanColumnConfig: vi.fn(async (kidId: string, title: string, color?: string) => {
      // console.log('Mock addKanbanColumnConfig called with:', kidId, title, color); // Optional: for debugging
    }),
    updateKanbanColumnConfig: vi.fn(async (updatedConfig: KanbanColumnConfig) => {
      // console.log('Mock updateKanbanColumnConfig called with:', updatedConfig); // Optional: for debugging
    }),
    deleteKanbanColumnConfig: vi.fn(async (kidId: string, configId: string) => {
      // console.log('Mock deleteKanbanColumnConfig called with:', kidId, configId); // Optional: for debugging
    }),
    reorderKanbanColumnConfigs: vi.fn(async (kidId: string, orderedConfigs: KanbanColumnConfig[]) => {
      // console.log('Mock reorderKanbanColumnConfigs called with:', kidId, orderedConfigs); // Optional: for debugging
    }),
  }), [user, loading, error]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};
