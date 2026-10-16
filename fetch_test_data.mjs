import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY4NTAyOCwiZXhwIjoyMDgzMjYxMDI4fQ.ywwhWFvNKwCvK-IsZcHmXLYO3XCCnx50CDbEMPZfNbs';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const INST_UUID = '5418b4e7-8689-46e9-8d7a-9a1b54005d1b'; // Orchids Internation School
const INST_CODE = 'OIS2026';

async function fullScan() {
  console.log('=== FULL SCAN - FINDING REAL USER DATA ===\n');

  // Get ALL profiles in DB
  const { data: allProfiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, institution_id, is_active, status, updated_at, academic_year')
    .order('institution_id')
    .limit(300);

  if (error) { console.error('Error:', error); return; }

  console.log(`Total profiles: ${allProfiles?.length || 0}`);
  
  // Group by institution_id
  const byInst = {};
  allProfiles?.forEach(p => {
    const key = p.institution_id || 'null';
    if (!byInst[key]) byInst[key] = [];
    byInst[key].push(p);
  });

  console.log('\n=== PROFILES BY INSTITUTION_ID ===');
  for (const [instId, members] of Object.entries(byInst)) {
    const roles = {};
    members.forEach(m => { roles[m.role] = (roles[m.role] || 0) + 1; });
    console.log(`\nInstitution: ${instId} (${members.length} users)`);
    console.log(`Roles: ${JSON.stringify(roles)}`);
    members.forEach(m => {
      console.log(`  - [${m.role}] ${m.full_name || 'N/A'} | ${m.email || 'no-email'} | active:${m.is_active}`);
    });
  }

  // Check profiles where institution_id = OIS2026 (string code, not UUID)
  const oisProfiles = allProfiles?.filter(p => p.institution_id === INST_CODE) || [];
  console.log(`\n=== PROFILES WITH institution_id='OIS2026': ${oisProfiles.length} ===`);
  console.log(JSON.stringify(oisProfiles, null, 2));

  // Also check profiles linked to the Orchid institution UUID
  const orchidUUIDProfiles = allProfiles?.filter(p => p.institution_id === INST_UUID) || [];
  console.log(`\n=== PROFILES WITH institution_id='${INST_UUID}': ${orchidUUIDProfiles.length} ===`);
  console.log(JSON.stringify(orchidUUIDProfiles, null, 2));

  // Get all data for the most populated institution (non-global)
  const nonGlobal = Object.entries(byInst)
    .filter(([k]) => k !== 'global' && k !== 'null')
    .sort((a, b) => b[1].length - a[1].length);
  
  if (nonGlobal.length > 0) {
    const [topInstId, topMembers] = nonGlobal[0];
    console.log(`\n=== MOST POPULATED INSTITUTION: ${topInstId} (${topMembers.length} users) ===`);
    
    // Get institution details
    const { data: instDetails } = await supabase
      .from('institutions')
      .select('*')
      .or(`institution_id.eq.${topInstId},id.eq.${topInstId}`)
      .limit(1);
    console.log('Institution details:', JSON.stringify(instDetails, null, 2));

    // Get attendance for this institution
    const { data: att } = await supabase
      .from('student_attendance')
      .select('id, student_id, attendance_date, status, canteen_permission, academic_year, entry_allowed')
      .or(`institution_id.eq.${topInstId}`)
      .order('attendance_date', { ascending: false })
      .limit(20);
    console.log(`\nAttendance records (${att?.length || 0}):`, JSON.stringify(att?.slice(0,5), null, 2));

    // Get fee payments for this institution
    const { data: fees } = await supabase
      .from('fee_payments')
      .select('id, student_id, amount, payment_mode, payment_date, status, receipt_number')
      .or(`institution_id.eq.${topInstId}`)
      .limit(10);
    console.log(`\nFee payments (${fees?.length || 0}):`, JSON.stringify(fees, null, 2));

    // Get leave requests
    const { data: leaves } = await supabase
      .from('leave_requests')
      .select('id, user_id, leave_type, from_date, to_date, reason, status, created_at')
      .or(`institution_id.eq.${topInstId}`)
      .order('created_at', { ascending: false })
      .limit(10);
    console.log(`\nLeave requests (${leaves?.length || 0}):`, JSON.stringify(leaves?.slice(0,3), null, 2));

    // Get exams
    const { data: exams } = await supabase
      .from('exam_schedules')
      .select('id, title, subject, exam_date, class_name, section, is_published')
      .or(`institution_id.eq.${topInstId}`)
      .limit(5);
    console.log(`\nExam schedules (${exams?.length || 0}):`, JSON.stringify(exams, null, 2));

    // Get assignments
    const { data: asgs } = await supabase
      .from('assignments')
      .select('id, title, due_date, class_name, section, created_at')
      .or(`institution_id.eq.${topInstId}`)
      .limit(5);
    console.log(`\nAssignments (${asgs?.length || 0}):`, JSON.stringify(asgs, null, 2));
  }

  // Fetch staff_attendance to find institution_id patterns
  const { data: staffAtt } = await supabase
    .from('staff_attendance')
    .select('id, staff_id, institution_id, attendance_date, status, marked_at')
    .order('attendance_date', { ascending: false })
    .limit(10);
  console.log('\n=== STAFF ATTENDANCE (recent 10) ===');
  console.log(JSON.stringify(staffAtt, null, 2));

  // Fee structures
  const { data: feeStr } = await supabase
    .from('fee_structures')
    .select('*')
    .limit(10);
  console.log('\n=== FEE STRUCTURES ===');
  console.log(JSON.stringify(feeStr, null, 2));

  // Classes with institution codes
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, section, institution_id, academic_year')
    .limit(20);
  console.log('\n=== CLASSES (first 20) ===');
  console.log(JSON.stringify(classes, null, 2));

  // Leave requests ALL
  const { data: allLeaves } = await supabase
    .from('leave_requests')
    .select('id, user_id, institution_id, leave_type, from_date, to_date, reason, status, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  console.log('\n=== LEAVE REQUESTS (recent 20) ===');
  console.log(JSON.stringify(allLeaves, null, 2));

  console.log('\n=== SCAN COMPLETE ===');
}

fullScan().catch(console.error);
