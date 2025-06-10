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

## Chore Definition and Instance Types

// Defines the structure for recurrence settings. This can still be useful for forms,
// but the ChoreDefinition will store recurrence in a flattened structure.
export type RecurrenceSetting =
  | { type: 'daily' }
  | { type: 'weekly'; dayOfWeek: number } // 0 for Sunday, 6 for Saturday
  | { type: 'monthly'; dayOfMonth: number } // 1 to 31
  | { type: 'specificDays'; days: number[] } // Array of dayOfWeek
  | null; // For non-recurring chores

// Chore Definition: Represents the template for a chore, including its recurrence pattern.
// Renamed from Chore in the kanban branch, and adapted to be the source of truth for chore properties.
export interface ChoreDefinition {
  id: string; // Unique ID for the chore definition
  title: string;
  description?: string;
  assignedKidId?: string;
  // For non-recurring, this is the due date.
  // For recurring, this is the START date of recurrence.
  dueDate?: string; // ISO date string (e.g., "2023-10-27")
  rewardAmount?: number;
  // isComplete for a definition might mean "archived" or "template no longer active"
  // It's still a boolean, but its meaning shifts for definitions.
  isComplete: boolean; // Indicates if the definition itself is active/complete (e.g., archived)

  // Recurrence properties for the definition
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | 'one-time' | null; // 'none' can be represented by null or 'one-time'
  // For weekly: 0 (Sun) to 6 (Sat). For monthly: 1 to 31.
  recurrenceDay?: number | null;
  recurrenceEndDate?: string | null; // Date after which no more instances are generated (ISO date string)
}

// Chore Instance: Represents a specific occurrence of a chore on a given date.
export interface ChoreInstance {
  id: string; // Unique ID for this specific instance (e.g., choreDefId + '_' + instanceDate)
  choreDefinitionId: string; // Link back to its definition
  instanceDate: string; // The specific date this instance is due (YYYY-MM-DD)
  isComplete: boolean;
  // Optional: if reward is snapshotted per instance or can vary.
  // We copy some key details from ChoreDefinition for easier access, preventing constant lookups.
  title: string; // Copy title from definition
  assignedKidId?: string; // Copy assignedKidId from definition
  rewardAmount?: number; // Copy rewardAmount from definition
}

---

## Kanban-Specific Types

export type KanbanPeriod = 'daily' | 'weekly' | 'monthly';

export interface KanbanColumn {
  id: string;
  title: string;
  // This will eventually hold ChoreInstance[], aligning with the new chore model.
  chores: ChoreInstance[]; // MODIFIED: Now holds ChoreInstance[]
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