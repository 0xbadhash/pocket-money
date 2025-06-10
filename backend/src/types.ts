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
  email: string; // Email might be optional for kids or managed by parent
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface KidUser extends BaseUser {
  role: UserRole.KID;
  age: number;
  parentAccountId: string; // Link to the parent user
  // Other kid-specific fields, for example:
  // balance?: number; // Current account balance
  // allowanceSettings?: {
  //   amount: number;
  //   frequency: 'daily' | 'weekly' | 'monthly';
  //   nextDueDate?: string;
  // };
  // goals?: Array<{ id: string; name: string; targetAmount: number; savedAmount: number; }>;
  // avatarUrl?: string; // For personalization
}

export interface ParentUser extends BaseUser {
  role: UserRole.PARENT;
  kids: KidUser[]; // Array of associated kid accounts
  // kycStatus?: 'pending' | 'verified' | 'rejected';
  // mfaEnabled?: boolean;
}

export interface AdminUser extends BaseUser {
  role: UserRole.ADMIN;
  // permissions?: string[];
}

export interface Chore {
  id: string;
  title: string;
  description?: string;
  assignedKidId?: string;
  dueDate?: string;
  rewardAmount?: number;
  isComplete: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | null;
  recurrenceDay?: number | null;
  recurrenceEndDate?: string | null;
}

export type AppUser = ParentUser | KidUser | AdminUser;

// Kept for compatibility, but KidUser is preferred for new features
export interface Kid {
  id: string;
  name: string;
  age?: number;
}
