// src/types.ts

// Re-export Transaction type directly from FinancialContext
export { type Transaction } from './contexts/FinancialContext';

// --- User Types ---

export enum UserRole {
  PARENT = 'parent',
  KID = 'kid',
  ADMIN = 'admin',
}

export interface BaseUser {
  id: string;
  email: string; // Email is part of the base user for consistency
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
  // kycStatus?: 'pending' | 'verified' | 'rejected'; // Optional: KYC status
  // mfaEnabled?: boolean; // Optional: Multi-factor authentication status
}

export interface AdminUser extends BaseUser {
  role: UserRole.ADMIN;
  // permissions?: string[]; // Optional: Specific permissions for admin
}

// Union type for any user in the application
export type AppUser = ParentUser | KidUser | AdminUser;

---

## Chore Definition and Instance Types

// Defines the structure for recurrence settings. This is primarily for forms or UI logic,
// as the ChoreDefinition stores recurrence in a flattened structure for data consistency.
export type RecurrenceSetting =
  | { type: 'daily' }
  | { type: 'weekly'; dayOfWeek: number } // 0 for Sunday, 6 for Saturday
  | { type: 'monthly'; dayOfMonth: number } // 1 to 31
  | { type: 'specificDays'; days: number[] } // Array of dayOfWeek (e.g., [1,3,5] for Mon, Wed, Fri)
  | null; // For non-recurring chores or when recurrence is not applicable

// Chore Definition: Represents the template for a chore, including its recurrence pattern.
// This is the source of truth for chore properties, designed for recurring and one-time chores.
export interface ChoreDefinition {
  id: string; // Unique ID for the chore definition
  title: string;
  description?: string;
  assignedKidId?: string; // Optional: ID of the kid assigned to this chore definition

  // For non-recurring chores, this is the exact due date.
  // For recurring chores, this is the START date from which instances will be generated.
  dueDate: string; // ISO date string (e.g., "YYYY-MM-DD")

  rewardAmount?: number; // Amount rewarded for completing instances of this chore
  isComplete: boolean; // Indicates if the definition itself is active/complete (e.g., archived or deactivated)

  // Recurrence properties for the definition. 'one-time' is for non-recurring.
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | 'one-time' | null;
  
  // For 'weekly' recurrence: 0 (Sunday) to 6 (Saturday).
  // For 'monthly' recurrence: 1 to 31 (day of month).
  recurrenceDay?: number | null; 
  
  recurrenceEndDate?: string | null; // Optional: Date after which no more instances are generated (ISO date string)
  tags?: string[]; // New field for tags - MERGED FROM MAIN
}

// Chore Instance: Represents a specific occurrence of a chore on a given date.
// Instances are generated from ChoreDefinitions based on their recurrence patterns.
export interface ChoreInstance {
  id: string; // Unique ID for this specific instance (e.g., derived from choreDefId + instanceDate)
  choreDefinitionId: string; // Link back to its parent ChoreDefinition
  instanceDate: string; // The specific date this instance is due (YYYY-MM-DD)
  isComplete: boolean; // Indicates if this specific instance has been completed

  // Key details copied from ChoreDefinition for easier access on the instance,
  // preventing constant lookups to the definition for basic display.
  title: string;
  assignedKidId?: string;
  rewardAmount?: number;
}

---

## Kanban-Specific Types

export type KanbanPeriod = 'daily' | 'weekly' | 'monthly';

export interface KanbanColumn {
  id: string;
  title: string;
  // Columns now hold ChoreInstance objects, representing specific chores for a given period.
  chores: ChoreInstance[]; 
}

export interface KidKanbanConfig {
  kidId: string;
  selectedPeriod: KanbanPeriod;
  columns: KanbanColumn[];
}

---

## Deprecated Kid Interface

// Deprecated: This 'Kid' interface is being phased out in favor of 'KidUser'.
// It is kept temporarily to avoid breaking existing code that might still reference it.
// All new implementations and refactored components should use 'KidUser'.
// This interface can be safely removed once UserContext and all related components
// are fully updated to utilize the 'KidUser' and 'BaseUser' types.
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