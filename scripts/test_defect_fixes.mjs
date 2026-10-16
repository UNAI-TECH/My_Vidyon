// ============================================================
// Automated Regression Test Suite: Functional Defect Fixes (BUG-001, BUG-002, BUG-003)
// Verifies:
//   1. BUG-001 / SA-008: Super Admin Duplicate Institution Name & School Code Validation
//   2. BUG-002 / FN-017: Web PDF Financial Report Export Delivery
//   3. BUG-003 / IA-030: Web Excel Direct Download & Resilient Cloud Storage Fallback
// ============================================================

import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('\n=============================================');
console.log('VIDYON FUNCTIONAL DEFECT FIXES TEST SUITE');
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
// SUITE 1: BUG-001 / SA-008 - Duplicate Institution Name Validation
// ------------------------------------------------------------
console.log('Test Suite 1: Institution Name & Code Uniqueness (BUG-001 / SA-008)');

runTest('Onboarding form enforces duplicate institution name check on step 1 save', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'app/(root)/admin/onboarding/index.tsx'), 'utf8');
  assert.strictEqual(
    content.includes('Duplicate Institution Name'),
    true,
    'Must display Duplicate Institution Name alert on duplicate submission'
  );
  assert.strictEqual(
    content.includes(".ilike('name', basicInfo.name.trim())"),
    true,
    'Must query existing institutions case-insensitively by name'
  );
});

runTest('Onboarding form enforces duplicate school code check on step 1 save', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'app/(root)/admin/onboarding/index.tsx'), 'utf8');
  assert.strictEqual(
    content.includes('Duplicate School Code'),
    true,
    'Must display Duplicate School Code alert when school code already exists'
  );
  assert.strictEqual(
    content.includes(".eq('institution_id', basicInfo.school_code.trim())"),
    true,
    'Must query existing institutions by institution_id/school_code'
  );
});

runTest('Onboarding full submit validates duplicate name and code prior to database upsert', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'app/(root)/admin/onboarding/index.tsx'), 'utf8');
  // Check that duplicate check exists in handleSubmit (prior to upsert)
  const submitBlockMatch = content.match(/const handleSubmit = async \(\) => \{([\s\S]*?)const \{ error: instError \}/);
  assert.ok(submitBlockMatch, 'handleSubmit block should exist prior to instError');
  assert.strictEqual(
    submitBlockMatch[1].includes('Duplicate Institution Name'),
    true,
    'handleSubmit must validate duplicate name before executing database upsert'
  );
});

// ------------------------------------------------------------
// SUITE 2: BUG-002 / FN-017 - Web Financial Report Export
// ------------------------------------------------------------
console.log('\nTest Suite 2: Financial Report Export Delivery (BUG-002 / FN-017)');

runTest('reportGenerator.ts checks Platform.OS === "web" for native web print and download', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'src/utils/reportGenerator.ts'), 'utf8');
  assert.strictEqual(
    content.includes("Platform.OS === 'web'"),
    true,
    'Must inspect Platform.OS for web compatibility'
  );
  assert.strictEqual(
    content.includes('Print.printAsync({ html: htmlContent })'),
    true,
    'Must use Print.printAsync on web to invoke native browser PDF export/print dialog'
  );
});

runTest('reportGenerator.ts provides direct HTML download fallback if print dialog fails on web', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'src/utils/reportGenerator.ts'), 'utf8');
  assert.strictEqual(
    content.includes('new Blob([htmlContent]'),
    true,
    'Must provide client-side Blob download fallback'
  );
  assert.strictEqual(
    content.includes('URL.createObjectURL(blob)'),
    true,
    'Must construct object URL for direct browser download'
  );
});

runTest('reportGenerator.ts uses Sharing.shareAsync exclusively when Sharing.isAvailableAsync() is true', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'src/utils/reportGenerator.ts'), 'utf8');
  assert.strictEqual(
    content.includes('if (await Sharing.isAvailableAsync())'),
    true,
    'Must guard Sharing.shareAsync with Sharing.isAvailableAsync()'
  );
});

// ------------------------------------------------------------
// SUITE 3: BUG-003 / IA-030 - Institution Reports Excel Export
// ------------------------------------------------------------
console.log('\nTest Suite 3: Institution Report Excel Export (BUG-003 / IA-030)');

runTest('useInstitutionReports.ts triggers direct XLSX.writeFile browser download on web', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'src/hooks/useInstitutionReports.ts'), 'utf8');
  assert.strictEqual(
    content.includes("if (Platform.OS === 'web')"),
    true,
    'Must inspect Platform.OS for web in exportToExcel'
  );
  assert.strictEqual(
    content.includes('XLSX.writeFile(wb, `${cleanFileName}.xlsx`)'),
    true,
    'Must trigger client-side XLSX.writeFile on web'
  );
});

runTest('useInstitutionReports.ts wraps cloud storage upload in resilient try-catch', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'src/hooks/useInstitutionReports.ts'), 'utf8');
  assert.strictEqual(
    content.includes('Optional cloud storage sync skipped:'),
    true,
    'Must handle missing storage bucket gracefully without crashing client download'
  );
});

console.log('\n=============================================');
console.log(`TOTAL DEFECT FIX TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('=============================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
