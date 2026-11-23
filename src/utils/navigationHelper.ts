// ============================================================
// File: src/utils/navigationHelper.ts
// Purpose: Helper to resolve role-based dashboard landing routes.
// ============================================================

export function getDashboardRouteForRole(role: string | null | undefined): string {
  if (!role) return '/(auth)/login';
  const normalizedRole = role.split('_')[0] || role;

  if (role === 'admin' || role === 'superadmin' || role === 'ad_manager' || role === 'finance_manager') {
    return '/(root)/admin';
  }
  if (
    role === 'institution' ||
    role === 'admission_officer' ||
    role === 'admissions' ||
    role === 'reports_manager' ||
    role === 'accountant' ||
    role === 'finance'
  ) {
    return '/(root)/institution';
  }
  if (role === 'institution_stakeholder') return '/(root)/stakeholder';
  if (role === 'faculty') return '/(root)/faculty';
  if (role === 'student') return '/(root)/student';
  if (role === 'parent') return '/(root)/parent';
  if (normalizedRole === 'canteen') return '/(root)/canteen';

  return '/(root)/institution';
}
