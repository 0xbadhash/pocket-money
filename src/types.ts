// src/types.ts

// Re-export Transaction type directly from FinancialContext
export { type Transaction } from './contexts/FinancialContext';

export enum UserRole {
  PARENT = 'parent',
  KID = 'kid',
  ADMIN = 'admin',
}

interface BaseUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface KidUser extends BaseUser {
  role: UserRole.KID;
  age: number;
  parentAccountId: string; // Link to the parent user
  // Merged from main: Optional object for spending limits
  spendingLimits?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
    perTransaction?: number;
  };
  blockedCategories?: string[]; // Merged from main: Optional array of blocked category names/IDs
}

export interface ParentUser extends BaseUser {
  role: UserRole.PARENT;
  kids: KidUser[]; // Array of associated kid accounts
  // Other parent-specific fields like KYC status, etc.
  // For example:
  // kycStatus: 'pending' | 'verified' | 'rejected';
  // mfaEnabled: boolean;
}

export interface AdminUser extends BaseUser {
  role: UserRole.ADMIN;
  // Admin-specific permissions or fields
  // For example:
  // permissions: string[];
}

// It might be useful to have a union type for any user
export type AppUser = ParentUser | KidUser | AdminUser;

// The existing Chore interface
export interface Chore {
  id: string;
  title: string;
  description?: string;
  assignedKidId?: string; // Should correspond to KidUser.id
  dueDate?: string;
  rewardAmount?: number;
  isComplete: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | null;
  recurrenceDay?: number | null;
  recurrenceEndDate?: string | null;
}

// Kanban-specific types - Merged from main
export type KanbanPeriod = 'daily' | 'weekly' | 'monthly';

export interface KanbanColumn {
  id: string; // e.g., 'monday', 'week-1', 'todo'
  title: string; // e.g., 'Monday', 'Week 1', 'To Do'
  chores: Chore[];
}

export interface KidKanbanConfig {
  kidId: string;
  selectedPeriod: KanbanPeriod;
  columns: KanbanColumn[];
}

// Deprecate the old Kid interface. KidUser replaces its use cases.
// This is kept for now to avoid breaking existing UserContext until fully migrated.
// Ideally, UserContext should use KidUser.
// Once UserContext and other related components are fully updated to use KidUser,
// this 'Kid' interface can be safely removed.
export interface Kid {
  id: string;
  name: string;
  age?: number;
  // Note: If you still need spendingLimits/blockedCategories directly on 'Kid',
  // ensure they are compatible with KidUser's definition.
  spendingLimits?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
    perTransaction?: number;
  };
  blockedCategories?: string[];
}