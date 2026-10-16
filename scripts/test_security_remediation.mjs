// ============================================================
// Automated Regression Test Suite: Security Remediation (VULN-001 & VULN-002)
// Verifies:
//   1. No admin_password column writes in src/services/passwordResetService.ts
//   2. No cleartext credentials recorded in audit logging (details.reset_to)
//   3. No admin_password update in supabase/functions/create-user/index.ts
//   4. No admin_password in app/(root)/admin/onboarding/index.tsx
//   5. No admin_password property in src/types/supabase.ts
//   6. Schema migration 20261012000001_drop_admin_password.sql exists and is valid
//   7. .env is excluded in .gitignore and .env.example template exists with placeholders
// ============================================================

import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('\n=============================================');
console.log('VIDYON SECURITY REMEDIATION REGRESSION TEST SUITE');
console.log('=============================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Error: ${err.message}`);
  }
}

// ------------------------------------------------------------
// SUITE 1: PasswordResetService Cleartext Protection (VULN-001)
// ------------------------------------------------------------
console.log('Test Suite 1: PasswordResetService Cleartext Elimination (VULN-001)');

runTest('passwordResetService does not write admin_password to institutions table', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'src/services/passwordResetService.ts'), 'utf8');
  assert.strictEqual(
    content.includes('.update({ admin_password:'),
    false,
    'passwordResetService.ts must NOT execute update({ admin_password: ... })'
  );
});

runTest('passwordResetService audit log does not record plaintext reset_to password', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'src/services/passwordResetService.ts'), 'utf8');
  assert.strictEqual(
    content.includes('reset_to: tempPassword'),
    false,
    'Audit log must not record cleartext reset_to password'
  );
  assert.strictEqual(
    content.includes('temp_credential_provisioned: true'),
    true,
    'Audit log must record sanitized credential provision flag'
  );
});

// ------------------------------------------------------------
// SUITE 2: Edge Function & Admin Onboarding Cleartext Protection
// ------------------------------------------------------------
console.log('\nTest Suite 2: create-user Edge Function & Admin Onboarding (VULN-001)');

runTest('create-user Edge Function does not write admin_password to institutions', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'supabase/functions/create-user/index.ts'), 'utf8');
  assert.strictEqual(
    content.includes('admin_password: finalPassword'),
    false,
    'create-user Edge Function must not update admin_password column'
  );
});

runTest('app/(root)/admin/onboarding does not write or read admin_password', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'app/(root)/admin/onboarding/index.tsx'), 'utf8');
  assert.strictEqual(
    content.includes('updates.admin_password'),
    false,
    'Onboarding component must not write updates.admin_password'
  );
  assert.strictEqual(
    content.includes('admin_password: adminInfo.password'),
    false,
    'Onboarding component must not send admin_password in instData'
  );
  assert.strictEqual(
    content.includes('password: data.admin_password'),
    false,
    'Onboarding component must not read plaintext data.admin_password'
  );
});

// ------------------------------------------------------------
// SUITE 3: Schema Migration & TypeScript Type Definitions
// ------------------------------------------------------------
console.log('\nTest Suite 3: Schema Migration & Type Definitions (VULN-001)');

runTest('Database migration exists to permanently drop admin_password', () => {
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20261012000001_drop_admin_password.sql');
  assert.strictEqual(fs.existsSync(migrationPath), true, 'Migration file must exist');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.strictEqual(sql.includes('ALTER TABLE public.institutions DROP COLUMN admin_password'), true);
});

runTest('src/types/supabase.ts excludes admin_password from institutions table', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'src/types/supabase.ts'), 'utf8');
  // Check within the institutions table definition block
  const instBlockMatch = content.match(/institutions:\s*\{[\s\S]*?Row:\s*\{([\s\S]*?)\}/);
  assert.ok(instBlockMatch, 'institutions table Row definition must exist');
  assert.strictEqual(
    instBlockMatch[1].includes('admin_password'),
    false,
    'institutions table Row type must not define admin_password'
  );
});

// ------------------------------------------------------------
// SUITE 4: Environment Security & Git Hygiene (VULN-002)
// ------------------------------------------------------------
console.log('\nTest Suite 4: Environment Security & Git Hygiene (VULN-002)');

runTest('.gitignore ignores .env and nested .env files while preserving .env.example', () => {
  const gitignore = fs.readFileSync(path.join(process.cwd(), '.gitignore'), 'utf8');
  assert.strictEqual(gitignore.includes('.env'), true, '.gitignore must include .env');
  assert.strictEqual(gitignore.includes('**/.env'), true, '.gitignore must include **/.env');
  assert.strictEqual(gitignore.includes('!.env.example'), true, '.gitignore must preserve !.env.example');
});

runTest('.env.example template exists and contains only sanitized placeholders', () => {
  const envExamplePath = path.join(process.cwd(), '.env.example');
  assert.strictEqual(fs.existsSync(envExamplePath), true, '.env.example must exist');
  const content = fs.readFileSync(envExamplePath, 'utf8');
  assert.strictEqual(content.includes('your-project-ref-here'), true, 'Must use placeholder for project id');
  assert.strictEqual(content.includes('your-supabase-public-anon-key-here'), true, 'Must use placeholder for anon key');
  assert.strictEqual(content.includes('your-supabase-service-role-key-here'), true, 'Must use placeholder for service key');
  // Confirm no live secrets
  assert.strictEqual(content.includes('ccyqzcaghwaggtmkmigi'), false, 'Must not leak live project reference');
});

console.log('\n=============================================');
console.log(`TOTAL SECURITY TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('=============================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
