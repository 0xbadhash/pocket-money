// src/contexts/UserContext.tsx
import React, { createContext, useState, ReactNode } from 'react';

// Define the shape of the user data
interface User {
  name: string;
  email: string;
  // Add other user-specific fields here if needed later
}

// Define the shape of the context value
interface UserContextType {
  user: User | null;
  // We can add functions to update user later, e.g., login, logout
  // login: (userData: User) => void;
  // logout: () => void;
}

// Create the context with a default value
export const UserContext = createContext<UserContextType | undefined>(undefined);

// Create a UserProvider component
interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  // For now, we'll use mock user data.
  // Later, this could come from an API call, localStorage, etc.
  const [user, setUser] = useState<User | null>({
    name: 'Parent User',
    email: 'parent.user@example.com',
  });

  // Example login/logout functions if we were to implement them
  // const login = (userData: User) => setUser(userData);
  // const logout = () => setUser(null);

  return (
    <UserContext.Provider value={{ user /*, login, logout */ }}>
      {children}
    </UserContext.Provider>
  );
};
