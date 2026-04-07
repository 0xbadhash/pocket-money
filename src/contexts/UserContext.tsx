// src/contexts/UserContext.tsx
import React, { createContext, useState, useEffect, type ReactNode, useContext, useMemo } from 'react';
import type { Kid, KanbanColumnConfig } from '../types'; // Import Kid and KanbanColumnConfig types
import { vi } from 'vitest'; // Import vi for mocking functions

export interface User {
  id: string;
  username: string;
  email: string;
  kids: Kid[];
  settings?: {
    defaultView?: string;
    theme?: 'light' | 'dark';
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void;
  addKid: (kidData: Omit<Kid, 'id' | 'kanbanColumnConfigs' | 'totalFunds'> & { totalFunds?: number }) => string | undefined;
  updateKid: (updatedKidData: Kid) => void;
  deleteKid: (kidId: string) => void;
  getKanbanColumnConfigs: (kidId: string) => KanbanColumnConfig[];
  addKanbanColumnConfig: (kidId: string, title: string, color?: string) => Promise<void>;
  updateKanbanColumnConfig: (updatedConfig: KanbanColumnConfig) => Promise<void>;
  deleteKanbanColumnConfig: (kidId: string, configId: string) => Promise<void>;
  reorderKanbanColumnConfigs: (kidId: string, orderedConfigs: KanbanColumnConfig[]) => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const UserContext = createContext<UserContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
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
    getKanbanColumnConfigs: vi.fn(() => {
      return [];
    }),
    addKanbanColumnConfig: vi.fn(async () => {
    }),
    updateKanbanColumnConfig: vi.fn(async () => {
    }),
    deleteKanbanColumnConfig: vi.fn(async () => {
    }),
    reorderKanbanColumnConfigs: vi.fn(async () => {
    }),
  }), [user, loading, error]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};
