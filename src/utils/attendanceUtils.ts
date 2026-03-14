import { differenceInDays, isWeekend, addDays } from 'date-fns';

export function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  holidays: string[] = [],
  skipWeekends: boolean = true
) {
  let count = 0;
  let current = new Date(startDate);
  const end = new Date(endDate);
  
  const holidaySet = new Set(holidays);

  while (current <= end) {
    const isHoliday = holidaySet.has(current.toISOString().split('T')[0]);
    const isWknd = skipWeekends && isWeekend(current);
    
    if (!isHoliday && !isWknd) {
      count++;
    }
    current = addDays(current, 1);
  }
  return count;
}

export function calculateAttendancePercentage(presentCount: number, workingDays: number) {
  if (workingDays <= 0) return '100%';
  const percentage = (presentCount / workingDays) * 100;
  return `${Math.min(100, Math.round(percentage))}%`;
}
