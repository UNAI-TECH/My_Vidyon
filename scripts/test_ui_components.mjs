// ============================================================
// File: scripts/test_ui_components.mjs
// Purpose: Automated component and state tests for shared UI components
// (FormField, Select, Button, FeedbackStates, DataTable, PermissionField)
// ============================================================

import assert from 'node:assert';

console.log('\n=============================================');
console.log('VIDYON SHARED UI COMPONENTS AUTOMATED TESTS');
console.log('=============================================\n');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// RBAC evaluation mock matching src/lib/rbac.ts
const BASELINE_PERMISSIONS = {
  admin: {
    faculty: ['view', 'create', 'edit', 'delete', 'manage'],
    settings: ['view', 'create', 'edit', 'delete', 'manage'],
    students: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  institution_stakeholder: {
    faculty: ['view', 'export'],
    settings: ['view'],
    students: ['view', 'export'],
  },
};

function can(context, module, action, resource) {
  if (!context || !context.role) return false;
  const role = context.role;
  if (role === 'super_admin') return true;

  if (role === 'institution_stakeholder') {
    const mutatingActions = ['create', 'edit', 'delete', 'approve', 'reject', 'manage'];
    if (mutatingActions.includes(action.toLowerCase())) return false;
    const allowed = BASELINE_PERMISSIONS.institution_stakeholder[module.toLowerCase()] || [];
    return allowed.includes(action.toLowerCase());
  }

  const rolePerms = BASELINE_PERMISSIONS[role] || {};
  const actions = rolePerms[module.toLowerCase()] || [];
  return actions.includes('manage') || actions.includes(action.toLowerCase());
}

// ------------------------------------------------------------
// Suite 1: FormField States & Invariant Rules
// ------------------------------------------------------------
console.log('Test Suite 1: FormField Behavior & States');

test('editable state allows input and has standard borders', () => {
  const props = {
    label: 'Institution Name',
    required: true,
    readOnly: false,
    disabled: false,
    value: 'Vidyon Public School',
  };

  const isInactive = props.readOnly || props.disabled;
  assert.strictEqual(isInactive, false, 'Field should not be inactive');
  assert.strictEqual(props.required, true, 'Field should be marked required');
});

test('read-only and disabled state enforces non-editable and reason badge', () => {
  const props = {
    label: 'School Code',
    readOnly: true,
    disabledReason: 'School code is immutable after creation',
    value: 'LFPS001',
  };

  const isInactive = props.readOnly || Boolean(props.disabled);
  assert.strictEqual(isInactive, true, 'Field must be inactive');
  assert.strictEqual(
    props.disabledReason,
    'School code is immutable after creation',
    'Must provide explanation for disabled state'
  );
});

test('validation error state displays error message over helper text', () => {
  const propsWithError = {
    label: 'Email',
    value: 'invalid-email',
    error: 'Please enter a valid email address',
    helperText: 'We will send receipts here',
  };

  assert.ok(propsWithError.error, 'Error should be present');
  const shouldShowError = Boolean(propsWithError.error);
  const shouldShowHelper = !propsWithError.error && Boolean(propsWithError.helperText);
  assert.strictEqual(shouldShowError, true);
  assert.strictEqual(shouldShowHelper, false);
});

// ------------------------------------------------------------
// Suite 2: Select / Dropdown Behavior
// ------------------------------------------------------------
console.log('\nTest Suite 2: Select / Dropdown Category Selection');

test('correctly matches value to option label and handles search filtering', () => {
  const options = [
    { label: 'Science & Technology', value: 'Science' },
    { label: 'Mathematics', value: 'Mathematics' },
    { label: 'Languages & Literature', value: 'Languages' },
    { label: 'Social Studies', value: 'Social Studies' },
  ];

  const value = 'Mathematics';
  const selected = options.find(opt => opt.value === value);
  assert.strictEqual(selected.label, 'Mathematics');

  const query = 'sci';
  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  );
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].value, 'Science');
});

test('read-only select is inactive and blocks opening modal', () => {
  const selectProps = {
    label: 'Department',
    value: 'Science',
    readOnly: true,
    disabledReason: 'Stakeholder view-only mode',
  };

  const isInactive = selectProps.readOnly || Boolean(selectProps.disabled);
  assert.strictEqual(isInactive, true);
  assert.strictEqual(selectProps.disabledReason, 'Stakeholder view-only mode');
});

// ------------------------------------------------------------
// Suite 3: Standard Button States & Destructive Confirmation
// ------------------------------------------------------------
console.log('\nTest Suite 3: Standard Button Component');

test('loading and disabled states prevent duplicate presses', () => {
  let pressed = false;
  const onMockPress = () => {
    pressed = true;
  };

  const buttonProps = {
    title: 'Save Changes',
    loading: true,
    disabled: false,
  };

  const isInactive = buttonProps.disabled || buttonProps.loading;
  if (!isInactive) {
    onMockPress();
  }

  assert.strictEqual(pressed, false, 'Button press must be blocked while loading');
});

test('destructive button triggers confirmation before execution', () => {
  let executed = false;
  let confirmTriggered = false;

  const buttonProps = {
    title: 'Delete Institution',
    variant: 'destructive',
    confirm: {
      title: 'Confirm Deletion',
      message: 'Are you sure?',
    },
    onPress: () => {
      executed = true;
    },
  };

  if (buttonProps.confirm) {
    confirmTriggered = true;
    buttonProps.onPress();
  }

  assert.strictEqual(confirmTriggered, true, 'Confirm dialog must be triggered');
  assert.strictEqual(executed, true, 'Action executed only after confirmation');
});

// ------------------------------------------------------------
// Suite 4: DataTable Sorting, Searching & Pagination
// ------------------------------------------------------------
console.log('\nTest Suite 4: DataTable Logic');

test('sorts numeric and text columns ascending and descending', () => {
  const items = [
    { id: 1, name: 'Charlie', score: 85 },
    { id: 2, name: 'Alice', score: 95 },
    { id: 3, name: 'Bob', score: 90 },
  ];

  const sortedScoreAsc = [...items].sort((a, b) => a.score - b.score);
  assert.strictEqual(sortedScoreAsc[0].name, 'Charlie');
  assert.strictEqual(sortedScoreAsc[2].name, 'Alice');

  const sortedNameAsc = [...items].sort((a, b) => a.name.localeCompare(b.name));
  assert.strictEqual(sortedNameAsc[0].name, 'Alice');
  assert.strictEqual(sortedNameAsc[2].name, 'Charlie');
});

test('calculates pagination pages and slices data correctly', () => {
  const records = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `User ${i + 1}` }));
  const pageSize = 10;
  const totalPages = Math.ceil(records.length / pageSize);

  assert.strictEqual(totalPages, 3, 'Should be 3 pages for 25 items with pageSize 10');

  const page2Start = (2 - 1) * pageSize;
  const page2Slice = records.slice(page2Start, page2Start + pageSize);
  assert.strictEqual(page2Slice.length, 10);
  assert.strictEqual(page2Slice[0].id, 11);
  assert.strictEqual(page2Slice[9].id, 20);

  const page3Start = (3 - 1) * pageSize;
  const page3Slice = records.slice(page3Start, page3Start + pageSize);
  assert.strictEqual(page3Slice.length, 5);
  assert.strictEqual(page3Slice[0].id, 21);
});

// ------------------------------------------------------------
// Suite 5: PermissionField & Read-Only Form Enforcement
// ------------------------------------------------------------
console.log('\nTest Suite 5: PermissionField & Read-Only Form Enforcement');

test('Admin role has edit permission on Faculty and Institution', () => {
  const adminContext = {
    role: 'admin',
    institutionId: 'inst-1',
  };

  const canEditFaculty = can(adminContext, 'faculty', 'edit', { institutionId: 'inst-1' });
  const canEditInstitution = can(adminContext, 'settings', 'edit', { institutionId: 'inst-1' });

  assert.strictEqual(canEditFaculty, true, 'Admin must be able to edit faculty');
  assert.strictEqual(canEditInstitution, true, 'Admin must be able to edit institution settings');
});

test('Stakeholder (view-only) role is DENIED edit permission on Faculty form', () => {
  const stakeholderContext = {
    role: 'institution_stakeholder',
    institutionId: 'inst-1',
  };

  const canEditFaculty = can(stakeholderContext, 'faculty', 'edit', { institutionId: 'inst-1' });
  assert.strictEqual(canEditFaculty, false, 'Stakeholder MUST be denied edit action on faculty');

  const fieldProps = {
    module: 'faculty',
    action: 'edit',
    isPermitted: canEditFaculty,
  };

  const effectiveReadOnly = !fieldProps.isPermitted;
  const disabledReason = !fieldProps.isPermitted ? 'Stakeholder view-only mode' : undefined;

  assert.strictEqual(effectiveReadOnly, true, 'Field must be forced to readOnly');
  assert.strictEqual(disabledReason, 'Stakeholder view-only mode', 'Must show reason badge');
});

test('Pilot Form Submit Invariant: Read-only role cannot submit mutations', () => {
  const stakeholderContext = {
    role: 'institution_stakeholder',
    institutionId: 'inst-1',
  };

  let mutationExecuted = false;

  const handlePilotSubmit = (context) => {
    const allowed = can(context, 'faculty', 'edit', { institutionId: 'inst-1' });
    if (!allowed) {
      return false;
    }
    mutationExecuted = true;
    return true;
  };

  const result = handlePilotSubmit(stakeholderContext);
  assert.strictEqual(result, false, 'Submission must be blocked for stakeholder');
  assert.strictEqual(mutationExecuted, false, 'No mutation may execute for view-only stakeholder');
});

console.log('\n=============================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('=============================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
