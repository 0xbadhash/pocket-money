// src/contexts/UserContext.tsx
import React, { createContext, useState, /*useEffect,*/ ReactNode, useContext, /*useCallback,*/ useMemo } from 'react';
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
  console.log('UserProvider (Nuclear Minimal) function body executing');

  // Comment out ALL existing useState declarations.
  // const [user, setUser] = useState<User | null>(null);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  // Define minimal state:
  const [minimalTestValue, setMinimalTestValue] = useState('initialNuclearValue');
  // Minimal isLoading state, as it's part of UserContextType
  const [isLoading] = useState(false);


  // Comment out ALL existing useEffect hooks.
  // useEffect(() => {
  //   console.log('UserProvider mount useEffect: Simplified for diagnostics');
  //   setLoading(true);
  //   setUser(null);
  //   setError(null);
  //   setLoading(false);
  // }, []);

  // useEffect(() => {
  //   if (user) {
  //     try {
  //       localStorage.setItem('userData', JSON.stringify(user));
  //     } catch (e) {
  //       console.error("Failed to save user data to localStorage", e);
  //       setError("Failed to save user data.");
  //     }
  //   }
  // }, [user]);

  // Comment out ALL internal helper functions or simplify them
  // const login = useCallback((userData: User) => setUser(userData), [setUser]);
  // const logout = useCallback(() => setUser(null), [setUser]);
  // ... and so on for all other useCallback functions ...

  const contextValue = useMemo(() => {
    // console.log('UserProvider (Nuclear Minimal) crafting contextValue:', minimalTestValue);
    return {
      user: null, // Static null user for this diagnostic
      loading: isLoading, // Use the minimal isLoading state
      error: null,        // Static null error

      // Provide all functions as vi.fn() to satisfy UserContextType
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
      addKid: vi.fn(() => { console.warn("addKid (nuclear) called"); return 'dummy_kid_id'; }),
      updateKid: vi.fn(() => console.warn("updateKid (nuclear) called")),
      deleteKid: vi.fn(() => console.warn("deleteKid (nuclear) called")),
      getKanbanColumnConfigs: vi.fn(() => { console.warn("getKanbanColumnConfigs (nuclear) called"); return []; }),
      addKanbanColumnConfig: vi.fn(async () => console.warn("addKanbanColumnConfig (nuclear) called")),
      updateKanbanColumnConfig: vi.fn(async () => console.warn("updateKanbanColumnConfig (nuclear) called")),
      deleteKanbanColumnConfig: vi.fn(async () => console.warn("deleteKanbanColumnConfig (nuclear) called")),
      reorderKanbanColumnConfigs: vi.fn(async () => console.warn("reorderKanbanColumnConfigs (nuclear) called")),

      // Include minimalTestValue if testing context propagation (optional for this step)
      // minimalTestValue: minimalTestValue
    };
  }, [isLoading, minimalTestValue]); // minimalTestValue added if used in context

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};
