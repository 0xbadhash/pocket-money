// src/contexts/UserContext.tsx
import React, { createContext, useState, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Kid, KanbanColumnConfig } from '../types';

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
  const [isLoading] = useState(false);

  const contextValue = useMemo(() => ({
    user: null,
    loading: isLoading,
    error: null,
    login: () => {},
    logout: () => {},
    updateUser: () => {},
    addKid: () => { console.warn('addKid (nuclear) called'); return 'dummy_kid_id'; },
    updateKid: () => console.warn('updateKid (nuclear) called'),
    deleteKid: () => console.warn('deleteKid (nuclear) called'),
    getKanbanColumnConfigs: () => { console.warn('getKanbanColumnConfigs (nuclear) called'); return []; },
    addKanbanColumnConfig: async () => console.warn('addKanbanColumnConfig (nuclear) called'),
    updateKanbanColumnConfig: async () => console.warn('updateKanbanColumnConfig (nuclear) called'),
    deleteKanbanColumnConfig: async () => console.warn('deleteKanbanColumnConfig (nuclear) called'),
    reorderKanbanColumnConfigs: async () => console.warn('reorderKanbanColumnConfigs (nuclear) called'),
  }), [isLoading]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};
