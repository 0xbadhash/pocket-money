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
  spendingLimits?: { // Optional object for spending limits
    daily?: number;
    weekly?: number;
    monthly?: number;
    perTransaction?: number;
  };
  blockedCategories?: string[]; // Optional array of blocked category names/IDs
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

---

## Chore and Recurrence Types

// Defines the structure for recurrence settings - Integrated from feature/recurring-chores
export type RecurrenceSetting =
  | { type: 'daily' }
  | { type: 'weekly'; dayOfWeek: number } // 0 for Sunday, 6 for Saturday
  | { type: 'monthly'; dayOfMonth: number } // 1 to 31
  | { type: 'specificDays'; days: number[] } // Array of dayOfWeek
  | null; // For non-recurring chores

// The Chore interface - Merged to include detailed recurrence and reward fields
export interface Chore {
  id: string; // Unique identifier for each chore instance
  title: string; // Renamed from 'name' to 'title' to align with main
  description?: string; // Made optional to align with main
  assignedKidId?: string; // Should correspond to KidUser.id - from main
  dueDate: string; // ISO date string (e.g., "2023-10-27") - from feature/recurring-chores
  rewardAmount?: number; // From main
  isComplete: boolean; // From both, boolean
  recurrence: RecurrenceSetting; // Uses the new RecurrenceSetting type from feature/recurring-chores
}

---

## Kanban Types

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

---

## Deprecated Kid Interface

// Deprecate the old Kid interface. KidUser replaces its use cases.
// This is kept for now to avoid breaking existing UserContext until fully migrated.
// Ideally, UserContext should use KidUser.
// Once UserContext and other related components are fully updated to use KidUser,
// this 'Kid' interface can be safely removed.
export interface Kid {
  id: string;
  name: string;
  age?: number;
  spendingLimits?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
    perTransaction?: number;
  };
  blockedCategories?: string[];
}