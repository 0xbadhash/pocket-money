// src/contexts/UserContext.tsx
import React, { createContext, useState, useEffect, ReactNode, useContext, useMemo } from 'react';
import type { User, Kid, KanbanColumnConfig } from '../types'; // Import Kid and KanbanColumnConfig types

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
  role?: 'admin' | 'user';
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
  addKanbanColumnConfig: (kidId: string, title: string, color?: string, isCompletedColumn?: boolean) => Promise<void>;
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
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const now = new Date().toISOString();
    const sampleKids: Kid[] = [
      {
        id: 'kid1',
        name: 'Alice',
        totalFunds: 0,
        kanbanColumnConfigs: [
          { id: 'kid1_col1', kidId: 'kid1', title: 'To Do', order: 0, color: '#FFDDC1', createdAt: now, updatedAt: now, isCompletedColumn: false },
          { id: 'kid1_col2', kidId: 'kid1', title: 'In Progress', order: 1, color: '#C1FFD7', createdAt: now, updatedAt: now, isCompletedColumn: false },
          { id: 'kid1_col3', kidId: 'kid1', title: 'Done', order: 2, color: '#C1D4FF', createdAt: now, updatedAt: now, isCompletedColumn: true }
        ]
      },
      {
        id: 'kid2',
        name: 'Bob',
        totalFunds: 0,
        kanbanColumnConfigs: [
          { id: 'kid2_col1', kidId: 'kid2', title: 'Pending', order: 0, createdAt: now, updatedAt: now, isCompletedColumn: false },
          { id: 'kid2_col2', kidId: 'kid2', title: 'Finished', order: 1, createdAt: now, updatedAt: now, isCompletedColumn: true }
        ]
      },
    ];
    const sampleUser: User = {
      id: 'user123',
      username: 'MockUser',
      email: 'user@example.com',
      kids: sampleKids,
      settings: { theme: 'light' },
      role: 'admin', // Added role
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
    login: (userData: User) => {
      setUser(userData);
      // console.log('Mock login called with:', userData); // Optional: for debugging
    },
    logout: () => {
      setUser(null);
      // console.log('Mock logout called'); // Optional: for debugging
    },
    updateUser: (updatedUserData: Partial<User>) => {
      // console.log('Mock updateUser called with:', updatedUserData); // Optional: for debugging
      if (user) {
        setUser({ ...user, ...updatedUserData });
      }
    },
    addKid: (kidData: Omit<Kid, 'id' | 'kanbanColumnConfigs' | 'totalFunds'> & { totalFunds?: number }) => {
      if (user) {
        const now = new Date().toISOString();
        const kidIdBase = `kid_${Date.now()}`; // More robust base for unique IDs

        const newKid: Kid = {
          id: kidIdBase,
          name: kidData.name,
          totalFunds: kidData.totalFunds || 0,
          // Default Kanban Column Configs
          kanbanColumnConfigs: [
            { id: `${kidIdBase}_col_0`, kidId: kidIdBase, title: 'To Do', order: 0, color: '#FFAB91', createdAt: now, updatedAt: now, isCompletedColumn: false }, // Light Coral
            { id: `${kidIdBase}_col_1`, kidId: kidIdBase, title: 'In Progress', order: 1, color: '#FFF59D', createdAt: now, updatedAt: now, isCompletedColumn: false }, // Light Yellow
            { id: `${kidIdBase}_col_2`, kidId: kidIdBase, title: 'Done', order: 2, color: '#A5D6A7', createdAt: now, updatedAt: now, isCompletedColumn: true } // Light Green
          ],
        };
        setUser({ ...user, kids: [...user.kids, newKid] });
        return newKid.id;
      }
      return undefined;
    },
    updateKid: (updatedKidData: Kid) => {
      if (user) {
        setUser({
          ...user,
          kids: user.kids.map((kid: Kid) => kid.id === updatedKidData.id ? updatedKidData : kid),
        });
      }
    },
    deleteKid: (kidId: string) => {
      if (user) {
        setUser({ ...user, kids: user.kids.filter((kid: Kid) => kid.id !== kidId) });
      }
    },
    getKanbanColumnConfigs: (kidId: string) => {
      const kid = user?.kids.find(k => k.id === kidId);
      if (kid && kid.kanbanColumnConfigs) {
        return [...kid.kanbanColumnConfigs].sort((a, b) => a.order - b.order);
      }
      return [];
    },
    addKanbanColumnConfig: async (kidId: string, title: string, color?: string, isCompletedColumn?: boolean) => {
      if (!user) return;
      const kidIndex = user.kids.findIndex(k => k.id === kidId);
      if (kidIndex === -1) {
        console.error(`Kid with id ${kidId} not found.`);
        return;
      }

      const kid = user.kids[kidIndex];
      const newOrder = kid.kanbanColumnConfigs ? Math.max(...kid.kanbanColumnConfigs.map(c => c.order), 0) + 1 : 0;

      const newConfig: KanbanColumnConfig = {
        id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        kidId,
        title,
        order: newOrder,
        color,
        isCompletedColumn: !!isCompletedColumn, // Ensure boolean value
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedKids = [...user.kids];
      updatedKids[kidIndex] = {
        ...kid,
        kanbanColumnConfigs: [...(kid.kanbanColumnConfigs || []), newConfig],
      };
      setUser({ ...user, kids: updatedKids });
    },
    updateKanbanColumnConfig: async (updatedConfig: KanbanColumnConfig) => {
      if (!user) return;
      const kidIndex = user.kids.findIndex(k => k.id === updatedConfig.kidId);
      if (kidIndex === -1) {
        console.error(`Kid with id ${updatedConfig.kidId} not found.`);
        return;
      }

      const kid = user.kids[kidIndex];
      const updatedConfigs = (kid.kanbanColumnConfigs || []).map(config =>
        config.id === updatedConfig.id
          ? { ...config, ...updatedConfig, updatedAt: new Date().toISOString() } // Ensure existing fields are preserved if not in updatedConfig
          : config
      );

      const updatedKids = [...user.kids];
      updatedKids[kidIndex] = {
        ...kid,
        kanbanColumnConfigs: updatedConfigs,
      };
      setUser({ ...user, kids: updatedKids });
    },
    deleteKanbanColumnConfig: async (kidId: string, configId: string) => {
      if (!user) return;
      const kidIndex = user.kids.findIndex(k => k.id === kidId);
      if (kidIndex === -1) {
        console.error(`Kid with id ${kidId} not found.`);
        return;
      }

      const kid = user.kids[kidIndex];
      const updatedConfigs = (kid.kanbanColumnConfigs || []).filter(config => config.id !== configId);
      // Optional: Re-normalize order if necessary, but current approach is direct removal.
      // The KanbanSettingsView should handle re-ordering if it provides full lists.

      const updatedKids = [...user.kids];
      updatedKids[kidIndex] = {
        ...kid,
        kanbanColumnConfigs: updatedConfigs,
      };
      setUser({ ...user, kids: updatedKids });
    },
    reorderKanbanColumnConfigs: async (kidId: string, orderedConfigs: KanbanColumnConfig[]) => {
      if (!user) return;
      const kidIndex = user.kids.findIndex(k => k.id === kidId);
      if (kidIndex === -1) {
        console.error(`Kid with id ${kidId} not found.`);
        return;
      }

      const kid = user.kids[kidIndex];
      // Ensure updatedAt is updated for all items, even if only order changed
      const configsWithTimestamps = orderedConfigs.map(config => ({
        ...config,
        updatedAt: new Date().toISOString(),
      }));

      const updatedKids = [...user.kids];
      updatedKids[kidIndex] = {
        ...kid,
        kanbanColumnConfigs: configsWithTimestamps,
      };
      setUser({ ...user, kids: updatedKids });
    },
  }), [user, loading, error]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};
