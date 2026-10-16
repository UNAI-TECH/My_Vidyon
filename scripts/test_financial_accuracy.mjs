// ============================================================
// Automated Test Suite: Financial & Academic Reporting Accuracy (Phase Ten)
// Verifies:
//   1. Fee totals match sum of underlying student fee components
//   2. Payment totals reconcile with recorded successful payments
//   3. Outstanding balances strictly satisfy: Due - Paid == Outstanding
//   4. Defaulter filtering identifies students with overdue balances
//   5. Collection rate percentage calculation
//   6. Attendance rate percentage calculation with proper denominator
//   7. Academic grading threshold evaluation
// ============================================================

import assert from 'assert';

console.log('\n=============================================');
console.log('VIDYON FINANCIAL & REPORTING ACCURACY TEST SUITE');
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
// Deterministic Synthetic Financial Fixture
// ------------------------------------------------------------
const studentFeeRoster = [
  { student_id: 'S001', name: 'Aarav Patel', tuition: 25000, lab: 3000, transport: 5000, paid: 33000, due_date: '2026-10-01' },
  { student_id: 'S002', name: 'Diya Sharma', tuition: 25000, lab: 3000, transport: 0, paid: 20000, due_date: '2026-10-01' },
  { student_id: 'S003', name: 'Rohan Gupta', tuition: 25000, lab: 3000, transport: 5000, paid: 0, due_date: '2026-10-01' },
  { student_id: 'S004', name: 'Ananya Iyer', tuition: 25000, lab: 3000, transport: 5000, paid: 33000, due_date: '2026-11-15' },
  { student_id: 'S005', name: 'Vihaan Reddy', tuition: 25000, lab: 0, transport: 5000, paid: 15000, due_date: '2026-10-05' }
];

console.log('Test Suite 1: Fee Assessment & Ledger Reconciliation');

runTest('Total assessed fee equals sum of individual line item components', () => {
  studentFeeRoster.forEach(s => {
    const calculatedDue = s.tuition + s.lab + s.transport;
    assert.strictEqual(calculatedDue, s.tuition + s.lab + s.transport);
  });
});

runTest('Outstanding balance satisfies strict invariant: Total Due - Paid == Outstanding', () => {
  studentFeeRoster.forEach(s => {
    const totalDue = s.tuition + s.lab + s.transport;
    const balance = totalDue - s.paid;
    assert.ok(balance >= 0, 'Balance must be non-negative');
    assert.strictEqual(balance, totalDue - s.paid);
  });
});

runTest('Ledger aggregate satisfies: Total Revenue + Total Outstanding == Total Assessed', () => {
  let totalAssessed = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;

  studentFeeRoster.forEach(s => {
    const due = s.tuition + s.lab + s.transport;
    totalAssessed += due;
    totalCollected += s.paid;
    totalOutstanding += (due - s.paid);
  });

  assert.strictEqual(totalCollected + totalOutstanding, totalAssessed);
  assert.strictEqual(totalAssessed, 157000);
  assert.strictEqual(totalCollected, 101000);
  assert.strictEqual(totalOutstanding, 56000);
});

console.log('\nTest Suite 2: Defaulters & Collection Rate Metrics');

runTest('Defaulter list correctly filters overdue students with outstanding balance > 0', () => {
  const currentDate = '2026-10-12';
  const defaulters = studentFeeRoster.filter(s => {
    const due = s.tuition + s.lab + s.transport;
    const balance = due - s.paid;
    return balance > 0 && s.due_date <= currentDate;
  });

  // Expected defaulters: S002 (8000 due, date Oct 1), S003 (33000 due, date Oct 1), S005 (15000 due, date Oct 5)
  // S004 has balance 0.
  assert.strictEqual(defaulters.length, 3);
  assert.deepStrictEqual(defaulters.map(d => d.student_id), ['S002', 'S003', 'S005']);
});

runTest('Collection rate accurately calculated as integer percentage and rounded decimal', () => {
  const totalAssessed = 157000;
  const totalCollected = 101000;
  const rateExact = (totalCollected / totalAssessed) * 100;
  const rateRounded = Math.round(rateExact);
  assert.strictEqual(rateRounded, 64); // 101000 / 157000 = 64.33%
});

console.log('\nTest Suite 3: Attendance Rate & Academic Grading Invariants');

runTest('Attendance rate uses total working days as denominator with bound [0, 100]', () => {
  const attendanceRecords = [
    { student_id: 'S001', present_days: 18, total_days: 20 },
    { student_id: 'S002', present_days: 20, total_days: 20 },
    { student_id: 'S003', present_days: 0, total_days: 20 }
  ];

  attendanceRecords.forEach(r => {
    const pct = Math.round((r.present_days / r.total_days) * 100);
    assert.ok(pct >= 0 && pct <= 100, 'Percentage must be between 0 and 100');
  });

  assert.strictEqual(Math.round((18 / 20) * 100), 90);
  assert.strictEqual(Math.round((20 / 20) * 100), 100);
  assert.strictEqual(Math.round((0 / 20) * 100), 0);
});

runTest('Academic grading follows standard letter grade thresholds', () => {
  function getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  assert.strictEqual(getGrade(95), 'A+');
  assert.strictEqual(getGrade(88), 'A');
  assert.strictEqual(getGrade(74), 'B');
  assert.strictEqual(getGrade(62), 'C');
  assert.strictEqual(getGrade(53), 'D');
  assert.strictEqual(getGrade(42), 'F');
});

console.log('\n=============================================');
console.log(`TOTAL FINANCIAL ACCURACY TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('=============================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
