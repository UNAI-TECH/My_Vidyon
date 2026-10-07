// ============================================================
// File: scripts/test_rbac.mjs
// Purpose: Automated test suite for RBAC permission evaluator,
//          Institution Stakeholder protections, and proposed roles
// ============================================================

import assert from 'node:assert';

// Import or recreate the core logic to test in pure Node ES environment
const BASELINE_ROLE_PERMISSIONS = {
  super_admin: {
    __all__: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage']
  },
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
  },
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
  student: {
    attendance: ['view'],
    announcements: ['view'],
    assignments: ['view', 'create', 'edit'],
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
    fees: ['view', 'create'],
    timetable: ['view'],
  },
  accountant: {
    analytics: ['view', 'export'],
    fee_structure: ['view', 'create', 'edit', 'export'],
    fees: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage'],
    reports: ['view', 'export'],
    students: ['view'],
  },
  transport_manager: {
    transport: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
    reports: ['view', 'export'],
  },
  driver: {
    transport: ['view', 'edit'],
  },
};

function normalizeRole(role) {
  if (!role) return null;
  const lower = role.toLowerCase().trim();
  if (lower === 'superadmin' || lower === 'super_admin') return 'super_admin';
  if (lower === 'institution' || lower === 'admin') return 'admin';
  if (lower === 'finance' || lower === 'accountant') return 'accountant';
  if (lower === 'canteen' || lower === 'canteen_manager') return 'canteen';
  return lower;
}

function can(context, module, action, resource) {
  if (!context || !context.role) return false;
  const role = normalizeRole(context.role);
  if (!role) return false;

  // Proposed roles feature flag check
  if (role === 'transport_manager' || role === 'driver') {
    if (!context.featureFlags?.transport_roles_enabled) {
      return false;
    }
  }

  // Super Admin: full access
  if (role === 'super_admin') return true;

  // Institution Stakeholder: STRICTLY READ-ONLY
  if (role === 'institution_stakeholder') {
    const mutatingActions = ['create', 'edit', 'delete', 'approve', 'reject', 'manage'];
    if (mutatingActions.includes(action)) return false;

    const allowedActions = BASELINE_ROLE_PERMISSIONS.institution_stakeholder[module] || [];
    if (!allowedActions.includes(action)) return false;

    if (resource && resource.institution_id) {
      const linked = context.linkedInstitutions || [];
      const primary = context.institutionId;
      const isLinked = linked.includes(resource.institution_id) || primary === resource.institution_id;
      if (!isLinked) return false;
    }
    return true;
  }

  // Role permissions check
  const rolePermissions = BASELINE_ROLE_PERMISSIONS[role];
  if (!rolePermissions) return false;

  const actions = rolePermissions[module];
  if (!actions) return false;

  if (actions.includes('manage') || actions.includes(action)) {
    if (resource && resource.institution_id && context.institutionId) {
      if (resource.institution_id !== context.institutionId) {
        return false;
      }
    }
    return true;
  }

  return false;
}

// ----------------------------------------------------------------------------
// Test Runner
// ----------------------------------------------------------------------------
let passCount = 0;
let failCount = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failCount++;
  }
}

console.log('\n=============================================');
console.log('VIDYON RBAC & STAKEHOLDER AUTOMATED TESTS');
console.log('=============================================\n');

// 1. Role Normalization
console.log('Test Suite 1: Role Normalization');
it('normalizes role aliases correctly', () => {
  assert.strictEqual(normalizeRole('superadmin'), 'super_admin');
  assert.strictEqual(normalizeRole('super_admin'), 'super_admin');
  assert.strictEqual(normalizeRole('institution'), 'admin');
  assert.strictEqual(normalizeRole('admin'), 'admin');
  assert.strictEqual(normalizeRole('finance'), 'accountant');
  assert.strictEqual(normalizeRole('accountant'), 'accountant');
  assert.strictEqual(normalizeRole('institution_stakeholder'), 'institution_stakeholder');
});

// 2. Super Admin Permissions
console.log('\nTest Suite 2: Super Admin Privileges');
it('grants Super Admin full manage on all modules regardless of tenant', () => {
  const ctx = { role: 'super_admin', userId: 'sa-1' };
  assert.strictEqual(can(ctx, 'students', 'create', { institution_id: 'inst-999' }), true);
  assert.strictEqual(can(ctx, 'fees', 'delete', { institution_id: 'inst-888' }), true);
  assert.strictEqual(can(ctx, 'roles_permissions', 'manage'), true);
});

// 3. Institution Admin Permissions
console.log('\nTest Suite 3: Institution Admin Tenant Scoping');
it('grants Institution Admin management within their own institution', () => {
  const ctx = { role: 'admin', userId: 'adm-1', institutionId: 'inst-1' };
  assert.strictEqual(can(ctx, 'students', 'create', { institution_id: 'inst-1' }), true);
  assert.strictEqual(can(ctx, 'attendance', 'manage', { institution_id: 'inst-1' }), true);
});

it('denies Institution Admin actions on another institution', () => {
  const ctx = { role: 'admin', userId: 'adm-1', institutionId: 'inst-1' };
  assert.strictEqual(can(ctx, 'students', 'create', { institution_id: 'inst-2' }), false);
});

// 4. Institution Stakeholder Read-Only Protections
console.log('\nTest Suite 4: Institution Stakeholder View-Only & Scoping');
it('allows Stakeholder to view and export reports and dashboards for linked institutions', () => {
  const ctx = {
    role: 'institution_stakeholder',
    userId: 'stk-1',
    linkedInstitutions: ['inst-A', 'inst-B'],
  };
  assert.strictEqual(can(ctx, 'analytics', 'view', { institution_id: 'inst-A' }), true);
  assert.strictEqual(can(ctx, 'fees', 'export', { institution_id: 'inst-B' }), true);
  assert.strictEqual(can(ctx, 'attendance', 'view', { institution_id: 'inst-A' }), true);
});

it('STRICTLY DENIES Stakeholder all write actions (create, edit, delete, approve, reject, manage)', () => {
  const ctx = {
    role: 'institution_stakeholder',
    userId: 'stk-1',
    linkedInstitutions: ['inst-A'],
  };
  assert.strictEqual(can(ctx, 'students', 'create', { institution_id: 'inst-A' }), false);
  assert.strictEqual(can(ctx, 'fees', 'edit', { institution_id: 'inst-A' }), false);
  assert.strictEqual(can(ctx, 'leaves', 'approve', { institution_id: 'inst-A' }), false);
  assert.strictEqual(can(ctx, 'classes', 'delete', { institution_id: 'inst-A' }), false);
  assert.strictEqual(can(ctx, 'attendance', 'create', { institution_id: 'inst-A' }), false);
  assert.strictEqual(can(ctx, 'roles_permissions', 'manage'), false);
});

it('denies Stakeholder from viewing unlinked institutions', () => {
  const ctx = {
    role: 'institution_stakeholder',
    userId: 'stk-1',
    linkedInstitutions: ['inst-A'],
  };
  assert.strictEqual(can(ctx, 'analytics', 'view', { institution_id: 'inst-UNLINKED' }), false);
});

// 5. Proposed Roles & Feature Flags
console.log('\nTest Suite 5: Proposed Roles Behind Feature Flags');
it('denies Transport Manager when transport_roles_enabled is false or omitted', () => {
  const ctx = { role: 'transport_manager', featureFlags: {} };
  assert.strictEqual(can(ctx, 'transport', 'view'), false);
  assert.strictEqual(can(ctx, 'transport', 'create'), false);
});

it('denies Driver when transport_roles_enabled is false', () => {
  const ctx = { role: 'driver', featureFlags: { transport_roles_enabled: false } };
  assert.strictEqual(can(ctx, 'transport', 'view'), false);
});

it('allows Transport Manager and Driver when transport_roles_enabled is true', () => {
  const ctxTM = { role: 'transport_manager', featureFlags: { transport_roles_enabled: true } };
  assert.strictEqual(can(ctxTM, 'transport', 'manage'), true);

  const ctxDriver = { role: 'driver', featureFlags: { transport_roles_enabled: true } };
  assert.strictEqual(can(ctxDriver, 'transport', 'view'), true);
  assert.strictEqual(can(ctxDriver, 'transport', 'edit'), true);
  // Driver cannot delete
  assert.strictEqual(can(ctxDriver, 'transport', 'delete'), false);
});

// 6. Non-Regression on Existing Roles
console.log('\nTest Suite 6: Non-Regression on Existing Roles');
it('preserves Faculty existing capabilities and boundaries', () => {
  const ctx = { role: 'faculty', userId: 'fac-1', institutionId: 'inst-1' };
  assert.strictEqual(can(ctx, 'attendance', 'create', { institution_id: 'inst-1' }), true);
  assert.strictEqual(can(ctx, 'grades', 'edit', { institution_id: 'inst-1' }), true);
  assert.strictEqual(can(ctx, 'fee_structure', 'edit'), false);
  assert.strictEqual(can(ctx, 'roles_permissions', 'manage'), false);
});

it('preserves Student existing view capabilities and blocks administrative actions', () => {
  const ctx = { role: 'student', userId: 'stu-1' };
  assert.strictEqual(can(ctx, 'attendance', 'view'), true);
  assert.strictEqual(can(ctx, 'grades', 'view'), true);
  assert.strictEqual(can(ctx, 'grades', 'edit'), false);
  assert.strictEqual(can(ctx, 'exams', 'create'), false);
});

it('preserves Accountant/Finance fee management', () => {
  const ctx = { role: 'accountant', userId: 'acc-1', institutionId: 'inst-1' };
  assert.strictEqual(can(ctx, 'fees', 'create', { institution_id: 'inst-1' }), true);
  assert.strictEqual(can(ctx, 'fees', 'manage', { institution_id: 'inst-1' }), true);
  assert.strictEqual(can(ctx, 'faculty', 'delete'), false);
});

console.log('\n=============================================');
console.log(`TOTAL TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
console.log('=============================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
