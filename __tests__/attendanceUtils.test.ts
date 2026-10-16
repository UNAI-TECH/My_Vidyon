import { calculateWorkingDays, calculateAttendancePercentage } from '../src/utils/attendanceUtils';

describe('attendanceUtils Unit Tests', () => {
  describe('calculateWorkingDays', () => {
    it('calculates working days excluding weekends', () => {
      // Monday 2026-10-12 to Friday 2026-10-16 (5 days)
      const start = new Date(2026, 9, 12);
      const end = new Date(2026, 9, 16);
      const days = calculateWorkingDays(start, end, [], true);
      expect(days).toBe(5);
    });

    it('excludes holidays from working days', () => {
      // Monday to Friday with 1 holiday on Tuesday 2026-10-13
      const start = new Date(2026, 9, 12);
      const end = new Date(2026, 9, 16);
      const holidays = ['2026-10-13'];
      const days = calculateWorkingDays(start, end, holidays, true);
      expect(days).toBe(4);
    });
  });

  describe('calculateAttendancePercentage', () => {
    it('returns 100% when workingDays is 0 or negative', () => {
      expect(calculateAttendancePercentage(0, 0)).toBe('100%');
    });

    it('calculates rounded percentage accurately', () => {
      expect(calculateAttendancePercentage(18, 20)).toBe('90%');
      expect(calculateAttendancePercentage(15, 20)).toBe('75%');
    });

    it('caps at 100% max', () => {
      expect(calculateAttendancePercentage(25, 20)).toBe('100%');
    });
  });
});
