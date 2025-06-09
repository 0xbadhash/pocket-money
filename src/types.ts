// src/types.ts

export type Recurrence = 'daily' | 'weekly' | 'monthly' | null;

export interface Chore {
  id: string; // Unique identifier for each chore instance
  name: string;
  description: string;
  isComplete: boolean;
  recurrence: Recurrence;
  dueDate?: Date; // Optional due date for chores
}
