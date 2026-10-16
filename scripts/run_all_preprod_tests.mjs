// ============================================================
// Master Pre-Production Automated Test Runner
// Runs all suites across:
//   - Security Remediation (VULN-001 & VULN-002)
//   - Defect Fixes (BUG-001, BUG-002, BUG-003)
//   - 13 Evidence Scenarios (FA-012, FA-022, PA-014, FN-013, FN-014, INT-001..008)
//   - Financial & Reporting Calculations
//   - RBAC & Multi-Tenant Scoping
//   - Extended Institution Management
//   - Shared UI Components & Invariants
// ============================================================

import { execSync } from 'child_process';

const suites = [
  { name: 'Security Remediation (VULN-001 / VULN-002)', script: 'scripts/test_security_remediation.mjs' },
  { name: 'Defect Fixes (BUG-001, BUG-002, BUG-003)', script: 'scripts/test_defect_fixes.mjs' },
  { name: '13 Evidence Scenarios (FA, PA, FN, INT)', script: 'scripts/test_13_evidence_scenarios.mjs' },
  { name: 'Financial & Reporting Accuracy', script: 'scripts/test_financial_accuracy.mjs' },
  { name: 'RBAC & Stakeholder Boundaries', script: 'scripts/test_rbac.mjs' },
  { name: 'Extended Institution Management', script: 'scripts/test_institution_management.mjs' },
  { name: 'Shared UI Components', script: 'scripts/test_ui_components.mjs' },
];

console.log('\n============================================================');
console.log('🚀 MY VIDYON ERP - PRE-PRODUCTION MASTER TEST RUNNER');
console.log(`Execution Timestamp: ${new Date().toISOString()}`);
console.log('============================================================\n');

let totalSuites = suites.length;
let passedSuites = 0;

for (const suite of suites) {
  console.log(`\n▶️ Running: ${suite.name} (${suite.script})...`);
  try {
    const output = execSync(`node ${suite.script}`, { encoding: 'utf8', stdio: 'pipe' });
    console.log(output.trim());
    passedSuites++;
  } catch (err) {
    console.error(`❌ Suite Failed: ${suite.name}`);
    console.error(err.stdout || err.message);
    process.exit(1);
  }
}

console.log('\n============================================================');
console.log(`🎉 ALL ${passedSuites} / ${totalSuites} PRE-PRODUCTION TEST SUITES PASSED CLEANLY!`);
console.log('============================================================\n');
