// ============================================================
// File: src/lib/rbac.ts
// Purpose: Core RBAC permission evaluator and helper functions
// ============================================================

import { Role, Action, ERPModule, RBACResource, PermissionCheckContext } from '../types/rbac';

// ----------------------------------------------------------------------------
// Static Permission Matrix
// Fallback and baseline for instant client-side evaluation
// ----------------------------------------------------------------------------
export const BASELINE_ROLE_PERMISSIONS: Record<string, Partial<Record<ERPModule, Action[]>>> = {
  // Super Admin: Has full manage over all modules
  super_admin: {
    analytics: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    attendance: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    announcements: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    assignments: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    audit_logs: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    calendar: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    canteen: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    classes: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    documents: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    enrollment: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    events: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    exams: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    faculty: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    fee_structure: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    fees: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    grades: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    guardians: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    health: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    homework: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    hostel: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    institution_management: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    institutions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    inventory: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    leaves: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    library: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    notifications: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    parents: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    reports: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    roles_permissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    staff: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    students: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    timetable: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    transport: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
  },

  // Institution Admin: Full management within their institution
  admin: {
    analytics: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    attendance: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    announcements: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    assignments: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    audit_logs: ['view', 'export'],
    calendar: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    canteen: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    classes: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    documents: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    enrollment: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    events: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    exams: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    faculty: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    fee_structure: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    fees: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    grades: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    guardians: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    health: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    homework: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    hostel: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    institution_management: ['view', 'edit', 'export'],
    institutions: ['view', 'edit'],
    inventory: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    leaves: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    library: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    notifications: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    parents: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    reports: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    roles_permissions: ['view', 'edit'],
    staff: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    students: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    timetable: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    transport: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    admissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    promotions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    syllabus: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    substitutes: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    fee_payments: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    concessions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    advertisements: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    ad_finance: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    ad_analytics: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    finance: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    payroll: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    payroll_components: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    transport_tracking: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    transport_config: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
  },

  // Institution Stakeholder: STRICTLY VIEW-ONLY + EXPORT
  institution_stakeholder: {
    analytics: ['view', 'export'],
    attendance: ['view', 'export'],
    announcements: ['view'],
    calendar: ['view', 'export'],
    classes: ['view', 'export'],
    enrollment: ['view', 'export'],
    events: ['view', 'export'],
    exams: ['view', 'export'],
    faculty: ['view', 'export'],
    fee_structure: ['view', 'export'],
    fees: ['view', 'export'],
    grades: ['view', 'export'],
    institution_management: ['view', 'export'],
    institutions: ['view', 'export'],
    reports: ['view', 'export'],
    staff: ['view', 'export'],
    students: ['view', 'export'],
    timetable: ['view', 'export'],
  },

  // Faculty: Academics, attendance, marks, leaves, assignments
  faculty: {
    attendance: ['view', 'create', 'edit', 'export'],
    announcements: ['view', 'create'],
    assignments: ['view', 'create', 'edit', 'delete', 'export'],
    calendar: ['view', 'export'],
    classes: ['view'],
    documents: ['view', 'create'],
    events: ['view'],
    exams: ['view', 'create', 'edit', 'export'],
    grades: ['view', 'create', 'edit', 'export'],
    homework: ['view', 'create', 'edit', 'delete', 'export'],
    leaves: ['view', 'create'],
    notifications: ['view', 'create'],
    reports: ['view', 'export'],
    students: ['view'],
    timetable: ['view', 'export'],
  },

  // Student: Read-only access to own academics, schedules, attendance, fees
  student: {
    attendance: ['view'],
    announcements: ['view'],
    assignments: ['view', 'create', 'edit'], // Submit assignments
    calendar: ['view'],
    classes: ['view'],
    documents: ['view'],
    events: ['view'],
    exams: ['view'],
    grades: ['view'],
    homework: ['view', 'create'],
    leaves: ['view', 'create'],
    notifications: ['view'],
    fees: ['view'],
    timetable: ['view'],
  },

  // Parent: View ward attendance, timetable, marks, fee payment
  parent: {
    attendance: ['view'],
    announcements: ['view'],
    calendar: ['view'],
    events: ['view'],
    exams: ['view'],
    grades: ['view'],
    homework: ['view'],
    leaves: ['view', 'create'],
    notifications: ['view'],
    fees: ['view', 'create'], // Pay fees
    timetable: ['view'],
  },

  // Finance / Accountant: Full fee management, collections, and financial reports
  accountant: {
    analytics: ['view', 'export'],
    fee_structure: ['view', 'create', 'edit', 'export'],
    fees: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    reports: ['view', 'export'],
    students: ['view'],
  },

  // Canteen Manager: Menu, inventory, canteen orders
  canteen: {
    canteen: ['view', 'create', 'edit', 'delete', 'manage'],
    inventory: ['view', 'create', 'edit'],
    reports: ['view', 'export'],
  },

  // Media Team: Events, announcements, media assets
  media: {
    announcements: ['view', 'create', 'edit', 'delete'],
    events: ['view', 'create', 'edit', 'delete'],
    documents: ['view', 'create', 'edit', 'delete'],
  },

  // Analytics Team: Dashboards, reports, analytics export
  analytics: {
    analytics: ['view', 'export'],
    reports: ['view', 'export'],
    attendance: ['view', 'export'],
    fees: ['view', 'export'],
    grades: ['view', 'export'],
  },

  // Admission Officer: Full control over admissions, applicant intake, promotions & onboarding
  admission_officer: {
    admissions: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    students: ['view', 'create', 'edit', 'export'],
    enrollment: ['view', 'create', 'edit', 'export', 'manage'],
    promotions: ['view', 'create', 'edit', 'export'],
    documents: ['view', 'create', 'edit', 'export'],
    reports: ['view', 'export'],
    announcements: ['view', 'create'],
  },

  // Reports & Academic In-charge: Analytics, institutional performance, exams & records
  reports_manager: {
    reports: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    analytics: ['view', 'export'],
    attendance: ['view', 'export'],
    exams: ['view', 'export'],
    grades: ['view', 'export'],
    fees: ['view', 'export'],
    students: ['view', 'export'],
    faculty: ['view', 'export'],
  },

  // Super Admin Ad Management Stakeholder: Campaign slots, impressions, sponsors, leads
  ad_manager: {
    advertisements: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    ad_finance: ['view', 'create', 'edit', 'export', 'manage'],
    ad_analytics: ['view', 'export'],
    announcements: ['view', 'create', 'edit'],
  },

  // Super Admin Platform Finance Stakeholder: SaaS revenue, billing, subscriptions, invoices
  finance_manager: {
    finance: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    ad_finance: ['view', 'create', 'edit', 'export', 'manage'],
    reports: ['view', 'export'],
    analytics: ['view', 'export'],
    institutions: ['view', 'export'],
  },

  // Proposed roles (disabled by default behind feature flag 'transport_roles_enabled')
  transport_manager: {
    transport: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
    reports: ['view', 'export'],
  },

  driver: {
    transport: ['view', 'edit'], // View routes, update bus location status
  },
};

// Aliases for matching DB roles
BASELINE_ROLE_PERMISSIONS.superadmin = BASELINE_ROLE_PERMISSIONS.super_admin;
BASELINE_ROLE_PERMISSIONS.institution = BASELINE_ROLE_PERMISSIONS.admin;
BASELINE_ROLE_PERMISSIONS.finance = BASELINE_ROLE_PERMISSIONS.accountant;
BASELINE_ROLE_PERMISSIONS.canteen_manager = BASELINE_ROLE_PERMISSIONS.canteen;
BASELINE_ROLE_PERMISSIONS.admissions = BASELINE_ROLE_PERMISSIONS.admission_officer;
BASELINE_ROLE_PERMISSIONS.reports = BASELINE_ROLE_PERMISSIONS.reports_manager;
BASELINE_ROLE_PERMISSIONS.ad_stakeholder = BASELINE_ROLE_PERMISSIONS.ad_manager;
BASELINE_ROLE_PERMISSIONS.superadmin_finance = BASELINE_ROLE_PERMISSIONS.finance_manager;

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

export function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;
  const lower = role.toLowerCase().trim();
  if (lower === 'superadmin' || lower === 'super_admin') return 'super_admin';
  if (lower === 'institution' || lower === 'admin') return 'admin';
  if (lower === 'finance' || lower === 'accountant') return 'accountant';
  if (lower === 'canteen' || lower === 'canteen_manager') return 'canteen';
  if (lower === 'admission_officer' || lower === 'admissions') return 'admission_officer';
  if (lower === 'reports_manager' || lower === 'reports' || lower === 'analytics') return 'reports_manager';
  if (lower === 'ad_manager' || lower === 'ad_stakeholder') return 'ad_manager';
  if (lower === 'finance_manager' || lower === 'superadmin_finance') return 'finance_manager';
  return lower;
}

export function formatPermissionKey(module: ERPModule, action: Action): string {
  return `${module}:${action}`;
}

export function isProposedRole(role: string): boolean {
  const norm = normalizeRole(role);
  return norm === 'transport_manager' || norm === 'driver';
}

/**
 * Evaluates whether a user context has permission to execute an action on a module.
 *
 * @param context Current user auth and RBAC context (role, userId, institutionId, linkedInstitutions, flags)
 * @param module Target ERP module
 * @param action Target action (view, create, edit, delete, approve, reject, export, manage)
 * @param resource Optional target resource (e.g. { institution_id, owner_id })
 * @returns boolean true if authorized, false otherwise
 */
export function can(
  context: PermissionCheckContext | null | undefined,
  module: ERPModule,
  action: Action,
  resource?: RBACResource | null
): boolean {
  if (!context || !context.role) return false;

  const normalizedModule = (module ? module.toString().toLowerCase().replace(/[\s-]+/g, '_') : '') as ERPModule;
  const normalizedAction = (action ? action.toString().toLowerCase() : '') as Action;

  const role = normalizeRole(context.role);
  if (!role) return false;

  // 1. Proposed roles check: check feature flag 'transport_roles_enabled'
  if (isProposedRole(role)) {
    const isTransportEnabled = Boolean(context.featureFlags?.transport_roles_enabled);
    if (!isTransportEnabled) {
      return false;
    }
  }

  // 2. Super Admin: full access to everything
  if (role === 'super_admin') {
    return true;
  }

  // 3. Institution Stakeholder: STRICTLY VIEW-ONLY
  if (role === 'institution_stakeholder') {
    // Blanket-deny ANY mutating or administrative action
    const mutatingActions: Action[] = ['create', 'edit', 'delete', 'approve', 'reject', 'manage'];
    if (mutatingActions.includes(normalizedAction)) {
      return false;
    }

    // Check if module allows view or export
    const allowedActions = BASELINE_ROLE_PERMISSIONS.institution_stakeholder[normalizedModule] || [];
    if (!allowedActions.includes(normalizedAction)) {
      return false;
    }

    // Resource scoping: If a specific institution_id resource is given,
    // verify the stakeholder is linked to this institution
    if (resource && resource.institution_id) {
      const linked = context.linkedInstitutions || [];
      const primary = context.institutionId;
      const isLinked = linked.includes(resource.institution_id) || primary === resource.institution_id;
      if (!isLinked) {
        return false;
      }
    }

    return true;
  }

  // 4. Dynamic user permissions check (if user has custom role/overrides loaded from DB)
  if (context.userPermissions) {
    const permKey = formatPermissionKey(normalizedModule, normalizedAction);
    const manageKey = formatPermissionKey(normalizedModule, 'manage');

    const permSet = context.userPermissions instanceof Set
      ? context.userPermissions
      : new Set(context.userPermissions);

    if (permSet.has(manageKey) || permSet.has(permKey)) {
      return checkResourceScope(context, role, resource);
    }
  }

  // 5. Baseline matrix check
  const rolePermissions = BASELINE_ROLE_PERMISSIONS[role];
  if (!rolePermissions) return false;

  const actions = rolePermissions[normalizedModule];
  if (!actions) return false;

  // If role has 'manage' on the module, all actions are granted
  if (actions.includes('manage') || actions.includes(normalizedAction)) {
    return checkResourceScope(context, role, resource);
  }

  return false;
}

/**
 * Validates tenant/institution and resource ownership boundaries
 */
function checkResourceScope(
  context: PermissionCheckContext,
  role: string,
  resource?: RBACResource | null
): boolean {
  if (!resource) return true;

  // Super Admin bypasses tenant checks
  if (role === 'super_admin') return true;

  // Check institution boundary if specified
  if (resource.institution_id && context.institutionId) {
    if (resource.institution_id !== context.institutionId) {
      return false;
    }
  }

  // Check owner boundary for student/parent if specified
  if (resource.owner_id && context.userId) {
    if (role === 'student' && resource.owner_id !== context.userId) {
      return false;
    }
  }

  return true;
}
