import { generateTemplateDailyGrid, mergeSlotsWithTemplate, formatTimeHHMM } from '../src/utils/timetableUtils';

describe('timetableUtils', () => {
  it('formats time to HH:MM cleanly', () => {
    expect(formatTimeHHMM('09:00:00')).toBe('09:00');
    expect(formatTimeHHMM('9:30')).toBe('09:30');
    expect(formatTimeHHMM(null)).toBe('09:00');
  });

  it('generates standard 8-period daily schedule with breaks from config', () => {
    const config = {
      periods_per_day: 8,
      period_duration_minutes: 45,
      start_time: '09:00:00',
    };

    const grid = generateTemplateDailyGrid(config, 'Friday');

    // Should have 8 periods + 3 breaks = 11 slots
    expect(grid.length).toBe(11);

    // Period 1: 09:00 - 09:45
    expect(grid[0]).toMatchObject({
      label: 'Period 1',
      type: 'period',
      start_time: '09:00',
      end_time: '09:45',
      is_break: false
    });

    // Period 2: 09:45 - 10:30
    expect(grid[1]).toMatchObject({
      label: 'Period 2',
      type: 'period',
      start_time: '09:45',
      end_time: '10:30',
      is_break: false
    });

    // Short Break: 10:30 - 10:45 (15m)
    expect(grid[2]).toMatchObject({
      type: 'break',
      start_time: '10:30',
      end_time: '10:45',
      is_break: true
    });

    // Period 3: 10:45 - 11:30
    expect(grid[3]).toMatchObject({
      label: 'Period 3',
      type: 'period',
      start_time: '10:45',
      end_time: '11:30',
    });

    // Period 4: 11:30 - 12:15
    expect(grid[4]).toMatchObject({
      label: 'Period 4',
      type: 'period',
      start_time: '11:30',
      end_time: '12:15',
    });

    // Lunch Break: 12:15 - 13:00 (45m)
    expect(grid[5]).toMatchObject({
      type: 'lunch',
      start_time: '12:15',
      end_time: '13:00',
      is_break: true
    });
  });

  it('merges existing saved slots into template slots cleanly', () => {
    const config = {
      periods_per_day: 8,
      period_duration_minutes: 45,
      start_time: '09:00:00',
    };
    const template = generateTemplateDailyGrid(config, 'Friday');

    const existingSlots = [
      {
        id: 'slot-123',
        day_of_week: 'Friday',
        start_time: '09:00:00',
        end_time: '09:45:00',
        class_id: 'cls-10a',
        subject_id: 'sub-math',
        section: 'A',
        room_number: 'Room 101'
      }
    ];

    const merged = mergeSlotsWithTemplate(template, existingSlots, 'Friday');

    // Period 1 should have the existing slot populated
    expect(merged[0].class_id).toBe('cls-10a');
    expect(merged[0].subject_id).toBe('sub-math');
    expect(merged[0].room_number).toBe('Room 101');
    expect(merged[0].db_id).toBe('slot-123');

    // Period 2 should be empty and ready for assignment
    expect(merged[1].class_id).toBe('');
    expect(merged[1].subject_id).toBe('');
    expect(merged[1].start_time).toBe('09:45');
    expect(merged[1].end_time).toBe('10:30');
  });

  it('filters out stale or unassigned slots when assignments are verified', () => {
    const config = {
      periods_per_day: 8,
      period_duration_minutes: 45,
      start_time: '09:00:00',
    };
    const template = generateTemplateDailyGrid(config, 'Friday');

    const existingSlots = [
      {
        id: 'slot-unassigned',
        day_of_week: 'Friday',
        start_time: '09:00:00',
        end_time: '09:45:00',
        class_id: 'cls-1b', // 1st B - not assigned to this faculty
        subject_id: 'sub-eng',
        section: 'B'
      }
    ];

    const facultyAssignments = [
      {
        faculty_profile_id: 'fac-01',
        class_id: 'cls-10a', // 10th A is assigned
        subject_id: 'sub-math',
        section: 'A'
      }
    ];

    const merged = mergeSlotsWithTemplate(template, existingSlots, 'Friday', facultyAssignments, 'fac-01');

    // Period 1 should NOT be populated with cls-1b because faculty is not assigned to cls-1b
    expect(merged[0].class_id).toBe('');
    expect(merged[0].subject_id).toBe('');
  });
});
