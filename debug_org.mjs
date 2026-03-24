import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ccyqzcaghwaggtmkmigi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE');

async function debug() {
  const instId = 'SS1212';
  
  console.log('--- DEPARTMENTS ---');
  const { data: depts } = await supabase.from('profiles').select('department').eq('institution_id', instId);
  const uniqueDepts = [...new Set(depts?.map(p => p.department))].filter(Boolean);
  console.log('Unique Departments in profiles:', uniqueDepts);
  
  for (const dept of uniqueDepts) {
    const { count: facultyCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('institution_id', instId).eq('role', 'FACULTY').eq('department', dept);
    const { count: studentCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('institution_id', instId).eq('role', 'STUDENT').eq('department', dept);
    console.log(`Dept ${dept}: Faculty ${facultyCount}, Student ${studentCount}`);
  }

  console.log('\n--- CLASSES & SECTIONS ---');
  // First find what groups are in this institution
  const { data: groups } = await supabase.from('groups').select('*').eq('institution_id', instId);
  console.log('Groups:', groups?.map(g => ({ id: g.id, name: g.name })));
  
  if (groups && groups.length > 0) {
    const { data: classes } = await supabase.from('classes').select('*, sections').in('group_id', groups.map(g => g.id));
    console.log('Classes found:', classes?.map(c => ({ id: c.id, name: c.name, group: c.group_id, sections: c.sections })));
    
    for (const cls of classes || []) {
       const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('class_id', cls.id);
       console.log(`Class ${cls.name}: Student Count ${sCount}`);
    }
  }
}

debug();
