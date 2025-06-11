// src/types.ts

export enum UserRole {
  PARENT,
  KID,
  ADMIN,
}

export interface BaseUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface KidUser extends BaseUser {
  role: UserRole.KID;
  parentId?: string;
}

// Re-export Transaction type directly from FinancialContext
export { type Transaction } from './contexts/FinancialContext';

export interface Kid {
  id: string;
  name: string;
  age?: number;
}

export interface SubTask {
  id: string;
  title: string;
  isComplete: boolean;
}

export interface ParentUser extends BaseUser {
  role: UserRole.PARENT;
  kids: KidUser[];
  // kycStatus?: 'pending' | 'verified' | 'rejected';
  // mfaEnabled?: boolean;
}

export interface AdminUser extends BaseUser {
  role: UserRole.ADMIN;
  // permissions?: string[];
}

export type AppUser = ParentUser | KidUser | AdminUser;

export type RecurrenceSetting =
  | { type: 'daily' }
  | { type: 'weekly'; dayOfWeek: number }
  | { type: 'monthly'; dayOfMonth: number }
  | { type: 'specificDays'; days: number[] }
  | { type: 'one-time' }
  | null;

export interface ChoreDefinition {
  id: string;
  title: string;
  description?: string;
  assignedKidId?: string;
  // For non-recurring chores, this is the exact due date.
  // For recurring chores, this is the START date from which instances will be generated.
  dueDate: string; // ISO date string (e.g., "YYYY-MM-DD")
  rewardAmount?: number;
  isComplete: boolean; // Indicates if the definition itself is active/complete
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | 'one-time' | null;
  recurrenceDay?: number | null; // For 'weekly' or 'monthly'
  recurrenceEndDate?: string | null;
  tags?: string[];
  subTasks?: SubTask[]; // Added this
}

export interface ChoreInstance {
  id: string;
  choreDefinitionId: string;
  instanceDate: string;
  isComplete: boolean;
  title: string; // Added this from HEAD
  assignedKidId?: string; // Kept from merge
  rewardAmount?: number; // Kept from merge
}

export type KanbanPeriod = 'daily' | 'weekly' | 'monthly';

export interface KanbanColumn {
  id: string;
  title: string;
  chores: ChoreInstance[]; // Kept simpler version
}

export interface KidKanbanConfig {
  kidId: string;
  selectedPeriod: KanbanPeriod;
  columns: KanbanColumn[];
}

export type ColumnThemeOption = 'default' | 'pastel' | 'ocean'; // Kept this
