// src/utils/__tests__/dateUtils.test.ts
import { getTodayDateString, isDateInFuture } from '../dateUtils';

describe('dateUtils', () => {
  describe('getTodayDateString', () => {
    it('should return the current date in YYYY-MM-DD format', () => {
      const expectedDate = new Date().toISOString().split('T')[0];
      expect(getTodayDateString()).toBe(expectedDate);
    });
  });

  describe('isDateInFuture', () => {
    it('should return true for a future date', () => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];
      expect(isDateInFuture(futureDateString)).toBe(true);
    });

    it('should return true for today\'s date', () => {
      const todayString = new Date().toISOString().split('T')[0];
      expect(isDateInFuture(todayString)).toBe(true);
    });

    it('should return false for a past date', () => {
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - 1);
      const pastDateString = pastDate.toISOString().split('T')[0];
      expect(isDateInFuture(pastDateString)).toBe(false);
    });

    it('should handle date strings with time components correctly (compare against start of today)', () => {
      const tomorrow = new Date();
      tomorrow.setDate(new Date().getDate() + 1);
      const tomorrowStringWithTime = tomorrow.toISOString(); // Includes time
      expect(isDateInFuture(tomorrowStringWithTime)).toBe(true);

      const yesterday = new Date();
      yesterday.setDate(new Date().getDate() -1);
      const yesterdayStringWithTime = yesterday.toISOString();
       expect(isDateInFuture(yesterdayStringWithTime)).toBe(false);
    });
  });
});
