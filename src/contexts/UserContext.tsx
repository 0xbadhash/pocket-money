// src/contexts/UserContext.tsx
import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import type { Kid, KanbanColumnConfig } from '../types'; // Import Kid and KanbanColumnConfig types

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
  loading: boolean;
  error: string | null; // Add error state
  // Basic user functions (placeholders, can be expanded)
  login: (userData: User) => void; // Example, actual login is complex
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void; // For updating user profile details

  // Kid specific functions (placeholders, can be expanded)
  addKid: (kidData: Omit<Kid, 'id' | 'kanbanColumnConfigs' | 'totalFunds'> & { totalFunds?: number }) => void;
  updateKid: (updatedKidData: Kid) => void;
  deleteKid: (kidId: string) => void;

  // Kanban Column Config functions
  getKanbanColumnConfigs: (kidId: string) => KanbanColumnConfig[];
  addKanbanColumnConfig: (kidId: string, title: string) => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user from localStorage on initial mount
  useEffect(() => {
    setLoading(true);
    try {
      const storedUser = localStorage.getItem('userData');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser) as User;
        // Ensure kids array and their kanbanColumnConfigs are properly initialized
        parsedUser.kids = parsedUser.kids.map(kid => ({
          ...kid,
          kanbanColumnConfigs: kid.kanbanColumnConfigs || []
        }));
        setUser(parsedUser);
      } else {
        // For development: Set a default mock user if nothing in localStorage
        // In a real app, this might redirect to login or show a logged-out state
        setUser({
          id: 'user_default_123',
          username: 'Parent User (Default)',
          email: 'parent.user.default@example.com',
          kids: [
            { id: 'kid_a', name: 'Alex', age: 10, avatarFilename: 'avatar1.png', totalFunds: 50, kanbanColumnConfigs: [] },
            { id: 'kid_b', name: 'Bailey', age: 8, avatarFilename: 'avatar2.png', totalFunds: 30, kanbanColumnConfigs: [] },
          ],
          settings: { theme: 'light', defaultView: 'dashboard' },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error("Failed to parse user data from localStorage", e);
      setError("Failed to load user data.");
      // Optionally clear corrupted data: localStorage.removeItem('userData');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('userData', JSON.stringify(user));
      } catch (e) {
        console.error("Failed to save user data to localStorage", e);
        setError("Failed to save user data.");
      }
    }
  }, [user]);

  // Placeholder functions - implementations will be added next
  const login = (userData: User) => setUser(userData);
  const logout = () => setUser(null); // Simplified logout
  const updateUser = (updatedUserData: Partial<User>) => {
    setUser(prevUser => prevUser ? { ...prevUser, ...updatedUserData } : null);
  };
  const addKid = (kidData: Omit<Kid, 'id' | 'kanbanColumnConfigs' | 'totalFunds'> & { totalFunds?: number }) => {
     setUser(prevUser => {
       if (!prevUser) return null;

       const newKidId = `kid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
       const defaultColumnHeaders: Omit<KanbanColumnConfig, 'kidId' | 'id' | 'createdAt' | 'updatedAt'>[] = [
        { title: 'To Do', order: 0 },
        { title: 'In Progress', order: 1 },
        { title: 'Done', order: 2 },
      ];

      const defaultKidKanbanConfigs: KanbanColumnConfig[] = defaultColumnHeaders.map((col, index) => ({
        id: `colcfg_default_${newKidId}_${index}`,
        kidId: newKidId,
        title: col.title,
        order: col.order,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

       const newKid: Kid = {
         ...kidData,
         id: newKidId,
         kanbanColumnConfigs: defaultKidKanbanConfigs,
         totalFunds: kidData.totalFunds || 0
       };
       return { ...prevUser, kids: [...prevUser.kids, newKid] };
     });
  };
  const updateKid = (updatedKidData: Kid) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      return {
        ...prevUser,
        kids: prevUser.kids.map(k => k.id === updatedKidData.id ? updatedKidData : k),
      };
    });
  };
  const deleteKid = (kidId: string) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      return { ...prevUser, kids: prevUser.kids.filter(k => k.id !== kidId) };
    });
  };

  const getKanbanColumnConfigs = (kidId: string): KanbanColumnConfig[] => {
    const kid = user?.kids.find(k => k.id === kidId);
    if (kid && kid.kanbanColumnConfigs) {
      return [...kid.kanbanColumnConfigs].sort((a, b) => a.order - b.order);
    }
    return [];
  };

  const addKanbanColumnConfig = async (kidId: string, title: string): Promise<void> => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const newKidsArray = prevUser.kids.map(kid => {
        if (kid.id === kidId) {
          const existingConfigs = kid.kanbanColumnConfigs || [];
          const newConfig: KanbanColumnConfig = {
            id: `colcfg_${Date.now().toString()}_${Math.random().toString(36).substring(2, 7)}`, // More unique ID
            kidId,
            title,
            order: existingConfigs.length, // Appends to the end
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return {
            ...kid,
            kanbanColumnConfigs: [...existingConfigs, newConfig],
          };
        }
        return kid;
      });
      return { ...prevUser, kids: newKidsArray };
    });
  };

  const updateKanbanColumnConfig = async (updatedConfig: KanbanColumnConfig): Promise<void> => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const newKidsArray = prevUser.kids.map(kid => {
        if (kid.id === updatedConfig.kidId) {
          const configs = kid.kanbanColumnConfigs || [];
          const configIndex = configs.findIndex(c => c.id === updatedConfig.id);
          if (configIndex === -1) return kid; // Config not found for this kid

          const newConfigs = [...configs];
          newConfigs[configIndex] = { ...updatedConfig, updatedAt: new Date().toISOString() };
          return { ...kid, kanbanColumnConfigs: newConfigs };
        }
        return kid;
      });
      return { ...prevUser, kids: newKidsArray };
    });
  };

  const deleteKanbanColumnConfig = async (kidId: string, configId: string): Promise<void> => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const newKidsArray = prevUser.kids.map(kid => {
        if (kid.id === kidId) {
          const existingConfigs = kid.kanbanColumnConfigs || [];
          const newConfigs = existingConfigs.filter(c => c.id !== configId);
          // After deleting, re-assign order for remaining configs to maintain consistency
          const reorderedConfigs = newConfigs.map((config, index) => ({ ...config, order: index }));
          return { ...kid, kanbanColumnConfigs: reorderedConfigs };
        }
        return kid;
      });
      return { ...prevUser, kids: newKidsArray };
    });
    // Note: Chore instances referencing this configId might need to be handled (e.g., moved to a default column).
    // This logic would typically be in KidKanbanBoard or a settings UI when this function is invoked.
  };

  const reorderKanbanColumnConfigs = async (kidId: string, orderedConfigsWithNewOrder: KanbanColumnConfig[]): Promise<void> => {
    // orderedConfigsWithNewOrder is assumed to be the full list of configs for the kid,
    // already in the desired visual order, but their 'order' property might need updating.
    setUser(prevUser => {
      if (!prevUser) return null;
      const newKidsArray = prevUser.kids.map(kid => {
        if (kid.id === kidId) {
          // Ensure all received configs belong to this kid and update their order property based on index
          const updatedAndVerifiedConfigs = orderedConfigsWithNewOrder
            .filter(cfg => cfg.kidId === kidId) // Ensure configs are for the correct kid
            .map((config, index) => ({
              ...config,
              order: index, // Update order based on new array index
              updatedAt: new Date().toISOString(),
            }));
          return { ...kid, kanbanColumnConfigs: updatedAndVerifiedConfigs };
        }
        return kid;
      });
      return { ...prevUser, kids: newKidsArray };
    });
  };

  return (
    <UserContext.Provider value={{
      user,
      loading,
      error,
      login,
      logout,
      updateUser,
      addKid,
      updateKid,
      deleteKid,
      getKanbanColumnConfigs,
      addKanbanColumnConfig,
      updateKanbanColumnConfig,
      deleteKanbanColumnConfig,
      reorderKanbanColumnConfigs
    }}>
      {children}
    </UserContext.Provider>
  );
};
