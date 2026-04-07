/**
 * @file src/types/user.ts
 * User and kid-related type definitions.
 */

import type { KanbanColumnConfig } from './kanban';

/**
 * Represents a kid user in the system.
 */
export interface Kid {
  /** Unique identifier for the kid */
  id: string;
  /** Display name of the kid */
  name: string;
  /** Optional age of the kid */
  age?: number;
  /** Optional filename/path for avatar image */
  avatarFilename?: string;
  /** Total funds/balance for the kid */
  totalFunds?: number;
  /** Optional list of custom Kanban column configurations for this kid */
  kanbanColumnConfigs?: KanbanColumnConfig[];
}

/**
 * Parameters for creating a new kid.
 */
export type CreateKidParams = Omit<Kid, 'id'>;

/**
 * Parameters for updating an existing kid.
 */
export type UpdateKidParams = Partial<Kid>;

/**
 * Represents an adult/parent user in the system.
 */
export interface User {
  /** Unique identifier for the user */
  id: string;
  /** Username for login */
  username: string;
  /** Email address */
  email: string;
  /** Hashed password (never expose in client code) */
  passwordHash?: string;
  /** Array of kids associated with this user */
  kids: Kid[];
  /** Timestamp for when this user was created */
  createdAt?: string;
  /** Timestamp for when this user was last updated */
  updatedAt?: string;
}

/**
 * Parameters for user authentication.
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Result of authentication operation.
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  message?: string;
  errors?: string[];
}

/**
 * User session information.
 */
export interface UserSession {
  userId: string;
  isLoggedIn: boolean;
  loginTime?: string;
}
