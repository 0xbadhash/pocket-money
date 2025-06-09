// src/types.ts
import type { Transaction as FinancialTransaction } from './contexts/FinancialContext'; // Import with alias

// Re-export Transaction type from FinancialContext to make it a shared type
export type Transaction = FinancialTransaction; // Re-export under the name Transaction

export interface Kid {
  id: string;
  name: string;
  age?: number;
  // Add other kid-specific fields here if needed later
}
