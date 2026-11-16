// ============================================================
// File: src/utils/timetableUtils.ts
// Purpose: Bell schedule template generation, slot calculation,
//          and merging for Timetable management across Vidyon ERP.
// ============================================================

import { TIMETABLE_TEMPLATES, TimetableTemplate } from '../constants/institutionTemplates';

export interface GeneratedTemplateSlot {
  id: string;
  period_index: number;
  label: string;
  type: 'period' | 'break' | 'lunch';
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  duration: number;
  is_break: boolean;
  break_name?: string;
  subject_id: string;
  class_id: string;
  section: string;
  room_number: string;
  db_id?: string;
}

/**
 * Normalizes time string to "HH:MM"
 */
export function formatTimeHHMM(timeStr?: string | null): string {
  if (!timeStr) return '09:00';
  const clean = String(timeStr).trim();
  const parts = clean.split(':');
  if (parts.length >= 2) {
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return clean.substring(0, 5);
}

/**
 * Generates the full daily schedule grid from an institution's timetable template / config.
 * Supports standard Indian school templates (8 periods, 7 periods, Kindergarten 5 periods, College).
 */
export function generateTemplateDailyGrid(
  config?: any,
  dayOfWeek: string = 'Monday'
): GeneratedTemplateSlot[] {
  // 1. Resolve base parameters
  let periodsPerDay = Number(config?.periods_per_day) || 8;
  let periodDuration = Number(config?.period_duration_minutes) || 45;
  let startTimeRaw = config?.start_time ? String(config.start_time) : '09:00:00';
  const [startH, startM] = startTimeRaw.split(':').map(Number);
  let currentMinutes = (isNaN(startH) ? 9 : startH) * 60 + (isNaN(startM) ? 0 : startM);

  // 2. Resolve breaks structure
  type BreakDef = { after_period: number; duration: number; type: 'break' | 'lunch'; label: string };
  let breaks: BreakDef[] = [];

  if (Array.isArray(config?.break_configs) && config.break_configs.length > 0) {
    // Check if break_configs has after_period
    const hasAfterPeriod = config.break_configs.some((b: any) => typeof b.after_period === 'number');
    if (hasAfterPeriod) {
      breaks = config.break_configs.map((b: any) => {
        const isLunch = /lunch/i.test(b.type || b.name || '');
        return {
          after_period: b.after_period,
          duration: Number(b.duration || b.duration_minutes) || (isLunch ? 45 : 15),
          type: isLunch ? 'lunch' : 'break',
          label: b.type || b.name || (isLunch ? 'Lunch Break' : 'Short Break')
        };
      });
    }
  }

  // Fallback to standard canonical break patterns matching onboarding templates
  if (breaks.length === 0) {
    if (periodsPerDay >= 8) {
      breaks = [
        { after_period: 2, duration: 15, type: 'break', label: 'Short Break' },
        { after_period: 4, duration: 45, type: 'lunch', label: 'Lunch Break' },
        { after_period: 6, duration: 10, type: 'break', label: 'Short Break' }
      ];
    } else if (periodsPerDay === 7) {
      breaks = [
        { after_period: 2, duration: 15, type: 'break', label: 'Morning Interval' },
        { after_period: 4, duration: 45, type: 'lunch', label: 'Lunch Break' },
        { after_period: 5, duration: 10, type: 'break', label: 'Evening Interval' }
      ];
    } else if (periodsPerDay <= 5) {
      breaks = [
        { after_period: 2, duration: 25, type: 'break', label: 'Snack Break' }
      ];
    } else {
      breaks = [
        { after_period: 3, duration: 45, type: 'lunch', label: 'Lunch Break' }
      ];
    }
  }

  const formatMinutes = (total: number): string => {
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const grid: GeneratedTemplateSlot[] = [];

  for (let p = 1; p <= periodsPerDay; p++) {
    const pStart = formatMinutes(currentMinutes);
    currentMinutes += periodDuration;
    const pEnd = formatMinutes(currentMinutes);

    grid.push({
      id: `tpl-period-${p}`,
      period_index: p,
      label: `Period ${p}`,
      type: 'period',
      start_time: pStart,
      end_time: pEnd,
      duration: periodDuration,
      is_break: false,
      subject_id: '',
      class_id: '',
      section: 'A',
      room_number: ''
    });

    // Check for breaks after this period
    const breakAfter = breaks.find(b => b.after_period === p);
    if (breakAfter) {
      const bStart = formatMinutes(currentMinutes);
      currentMinutes += breakAfter.duration;
      const bEnd = formatMinutes(currentMinutes);

      grid.push({
        id: `tpl-${breakAfter.type}-${p}`,
        period_index: p,
        label: `${breakAfter.label} (${breakAfter.duration}m)`,
        type: breakAfter.type,
        start_time: bStart,
        end_time: bEnd,
        duration: breakAfter.duration,
        is_break: true,
        break_name: breakAfter.label,
        subject_id: breakAfter.type,
        class_id: '',
        section: '',
        room_number: ''
      });
    }
  }

  return grid;
}

/**
 * Merges existing database timetable slots for a day into the institution's template bell schedule.
 */
export function mergeSlotsWithTemplate(
  templateGrid: GeneratedTemplateSlot[],
  existingSlots: any[],
  dayOfWeek: string,
  assignments: any[] = [],
  facultyId?: string
): GeneratedTemplateSlot[] {
  const daySlots = (existingSlots || []).filter((s: any) => s.day_of_week === dayOfWeek);

  const matchedSlotIds = new Set<string>();

  // Deep clone template grid
  const merged: GeneratedTemplateSlot[] = templateGrid.map((tpl) => {
    if (tpl.is_break) {
      return { ...tpl };
    }

    // Try to match an existing slot by start_time (first 5 chars)
    const match = daySlots.find((s: any) => {
      const sStart = formatTimeHHMM(s.start_time);
      const sEnd = formatTimeHHMM(s.end_time);
      return sStart === tpl.start_time || (s.period_index && s.period_index === tpl.period_index);
    });

    if (match) {
      matchedSlotIds.add(match.id);

      // Verify that this slot corresponds to a valid active assignment for this faculty
      if (assignments.length > 0 && facultyId && match.class_id) {
        const isFacultyAssigned = assignments.some((a: any) =>
          a.faculty_profile_id === facultyId &&
          a.class_id === match.class_id &&
          (a.subject_id === match.subject_id || !match.subject_id)
        );
        if (!isFacultyAssigned) {
          // Stale / unassigned slot in database - skip binding to template period
          return { ...tpl };
        }
      }

      // Attempt to resolve section
      let resolvedSection = match.section;
      if (!resolvedSection && assignments.length > 0 && facultyId) {
        const assignedMatch = assignments.find((a: any) =>
          a.faculty_profile_id === facultyId &&
          a.class_id === match.class_id &&
          a.subject_id === match.subject_id
        );
        if (assignedMatch) resolvedSection = assignedMatch.section;
      }

      return {
        ...tpl,
        db_id: match.id,
        class_id: match.class_id || '',
        subject_id: match.subject_id || '',
        section: resolvedSection || 'A',
        room_number: match.room_number || '',
        start_time: formatTimeHHMM(match.start_time) || tpl.start_time,
        end_time: formatTimeHHMM(match.end_time) || tpl.end_time,
      };
    }

    return { ...tpl };
  });

  // Also include any custom non-template slots that the user previously entered
  const unmatched = daySlots.filter((s: any) => !matchedSlotIds.has(s.id));
  unmatched.forEach((s: any) => {
    const isBreak = s.subject_id === 'break' || s.subject_id === 'lunch';
    if (!isBreak && assignments.length > 0 && facultyId && s.class_id) {
      const isFacultyAssigned = assignments.some((a: any) =>
        a.faculty_profile_id === facultyId && a.class_id === s.class_id
      );
      if (!isFacultyAssigned) return;
    }

    merged.push({
      id: s.id || `custom-${Date.now()}`,
      db_id: s.id,
      period_index: s.period_index || 99,
      label: isBreak ? (s.subject_id === 'lunch' ? 'Lunch Break' : 'Break') : 'Extra Class',
      type: isBreak ? (s.subject_id as any) : 'period',
      start_time: formatTimeHHMM(s.start_time),
      end_time: formatTimeHHMM(s.end_time),
      duration: 45,
      is_break: isBreak,
      subject_id: s.subject_id || '',
      class_id: s.class_id || '',
      section: s.section || 'A',
      room_number: s.room_number || ''
    });
  });

  // Sort chronologically
  return merged.sort((a, b) => a.start_time.localeCompare(b.start_time));
}
