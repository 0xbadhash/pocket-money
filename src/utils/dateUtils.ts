// src/utils/dateUtils.ts

/**
 * Returns today's date as a YYYY-MM-DD string.
 */
export const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Returns the start (Monday) and end (Sunday) dates for the week containing the given date.
 * @param date - The reference date to find the week for
 * @returns Object with start and end dates of the week
 */
export const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date);
  const dayOfWeek = start.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * Returns the start and end dates for the month containing the given date.
 * @param date - The reference date to find the month for
 * @returns Object with start and end dates of the month
 */
export const getMonthRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/**
 * Checks if a date string represents a date in the future (including today).
 * @param dateString - Date string to check (YYYY-MM-DD format)
 * @returns true if the date is today or in the future, false otherwise
 */
export const isDateInFuture = (dateString: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString);
  return date >= today;
};
