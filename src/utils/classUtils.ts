// ============================================================
// File: src/utils/classUtils.ts
// Purpose: Standardized academic ordering for classes and sections
//          across all Vidyon ERP modules, dropdowns, and views.
// ============================================================

export interface ClassLike {
  id?: string;
  name?: string;
  class_name?: string;
  label?: string;
  stage?: string;
  class_order?: number;
  section?: string;
  sections?: string[] | string;
}

const STAGE_BASE_RANKS: Record<string, number> = {
  pre_primary: 0,
  kindergarten: 0,
  kg: 0,
  primary: 100,
  middle: 200,
  secondary: 300,
  high_school: 300,
  higher_secondary: 400,
  senior_secondary: 400,
  college: 500,
  university: 500,
};

/**
 * Returns a numerical rank for a class so classes sort in proper academic sequence:
 * Pre-KG -> LKG -> UKG -> 1st Standard -> ... -> 12th Standard -> College Years
 */
export function getClassRank(item: any): number {
  if (!item) return 9999;

  let name = '';
  let stage = '';
  let order: number | undefined = undefined;

  if (typeof item === 'string') {
    name = item.trim();
  } else if (typeof item === 'object') {
    name = (item.name || item.class_name || item.label || '').trim();
    stage = (item.stage || '').toLowerCase().trim();
    if (typeof item.class_order === 'number' && !isNaN(item.class_order)) {
      order = item.class_order;
    }
  }

  // 1. If explicit stage and class_order from DB are provided
  if (stage && order !== undefined && STAGE_BASE_RANKS[stage] !== undefined) {
    return STAGE_BASE_RANKS[stage] + order;
  }

  const lower = name.toLowerCase();

  // 2. Early Childhood / Pre-Primary
  if (/\bplaygroup\b|\bplayschool\b/.test(lower)) return 1;
  if (/\bnursery\b/.test(lower)) return 2;
  if (/pre[- ]?kg\b/.test(lower)) return 3;
  if (/\blkg\b|jr[.\s-]?kg|junior\s*kg|kg[- ]?1/.test(lower)) return 4;
  if (/\bukg\b|sr[.\s-]?kg|senior\s*kg|kg[- ]?2/.test(lower)) return 5;
  if (/\bkindergarten\b|\bkg\b/.test(lower)) return 6;

  // 3. College / Degree Years: "1st Year", "Year 1", "Final Year"
  const collegeMatch = lower.match(/\b(?:sem(?:ester)?\s*(\d+)|(\d+)(?:st|nd|rd|th)?\s*year)\b/);
  if (collegeMatch) {
    const sem = collegeMatch[1] ? parseInt(collegeMatch[1], 10) : 0;
    const yr = collegeMatch[2] ? parseInt(collegeMatch[2], 10) : 0;
    if (yr > 0) return 500 + yr * 2;
    if (sem > 0) return 500 + sem;
  }

  // 4. School Classes / Standards: 1st through 12th
  // Matches "1st Standard", "1st Std", "Class 1", "Grade 10", "10th Standard", "12th", etc.
  const stdMatch = lower.match(/\b(?:class|grade|std|standard)?\s*(\d+)(?:st|nd|rd|th)?(?:\s*(?:standard|std|class|grade))?\b/);
  if (stdMatch && stdMatch[1]) {
    const num = parseInt(stdMatch[1], 10);
    if (!isNaN(num)) {
      if (num >= 1 && num <= 5) return 10 + (num - 1);       // Primary: 10..14
      if (num >= 6 && num <= 8) return 20 + (num - 6);       // Middle: 20..22
      if (num >= 9 && num <= 10) return 30 + (num - 9);     // Secondary: 30..31
      if (num >= 11 && num <= 12) return 40 + (num - 11);   // Higher Sec: 40..41
      return 100 + num;
    }
  }

  // If stage is known without class_order
  if (stage && STAGE_BASE_RANKS[stage] !== undefined) {
    return STAGE_BASE_RANKS[stage] + 50;
  }

  return 9000;
}

/**
 * Compares two section strings (e.g. 'A' vs 'B', 'Section A' vs 'Section B')
 */
export function compareSections(secA: any, secB: any): number {
  const a = String(secA || '').replace(/^section\s*/i, '').trim();
  const b = String(secB || '').replace(/^section\s*/i, '').trim();
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Standard comparator for sorting classes in full academic order.
 */
export function compareClasses(a: any, b: any): number {
  const rankA = getClassRank(a);
  const rankB = getClassRank(b);

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  const nameA = typeof a === 'string' ? a : (a?.name || a?.class_name || a?.label || '');
  const nameB = typeof b === 'string' ? b : (b?.name || b?.class_name || b?.label || '');
  const nameDiff = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  if (nameDiff !== 0) return nameDiff;

  const secA = typeof a === 'object' ? (a?.section || '') : '';
  const secB = typeof b === 'object' ? (b?.section || '') : '';
  if (secA || secB) {
    return compareSections(secA, secB);
  }

  return 0;
}

/**
 * Sorts an array of class objects or class names in academic order.
 */
export function sortClasses<T>(list: T[]): T[] {
  if (!Array.isArray(list)) return [];
  return [...list].sort(compareClasses);
}

/**
 * Sorts an array of section strings ('A', 'B', 'C', ...)
 */
export function sortSections(list: string[]): string[] {
  if (!Array.isArray(list)) return [];
  return [...list].sort(compareSections);
}
