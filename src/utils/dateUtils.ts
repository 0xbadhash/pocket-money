// src/utils/dateUtils.ts
export const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const getWeekRange = (date: Date): { start: Date, end: Date } => {
  const start = new Date(date);
  const dayOfWeek = start.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust if Sunday to get to Monday
  start.setDate(date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const getMonthRange = (date: Date): { start: Date, end: Date } => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0); // 0 day of next month gives last day of current
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const isDateInFuture = (dateString: string): boolean => {
  const todayNormalized = new Date();
  // Set todayNormalized to be midnight UTC for today's date
  todayNormalized.setUTCHours(0, 0, 0, 0);

  // new Date('YYYY-MM-DD') creates a date object at UTC midnight of that date.
  const dateToCompare = new Date(dateString);

  return dateToCompare >= todayNormalized;
}
