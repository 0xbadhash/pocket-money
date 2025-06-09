// src/types.ts

// Defines the structure for recurrence settings
export type RecurrenceSetting =
  | { type: 'daily' }
  | { type: 'weekly'; dayOfWeek: number } // 0 for Sunday, 6 for Saturday
  | { type: 'monthly'; dayOfMonth: number } // 1 to 31
  // Example for 'specificDays': { type: 'specificDays', days: [1, 3, 5] } for Mon, Wed, Fri
  | { type: 'specificDays'; days: number[] } // Array of dayOfWeek
  | null; // For non-recurring chores

export interface Chore {
  id: string; // Unique identifier for each chore instance
  name: string;
  description: string;
  isComplete: boolean;
  recurrence: RecurrenceSetting;
  dueDate: string; // ISO date string (e.g., "2023-10-27")
}
