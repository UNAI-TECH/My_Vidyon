import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ccyqzcaghwaggtmkmigi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE');

async function debug() {
  const slug = 'SS1212';
  
  console.log('\n--- PROFILES GRANULAR CHECK ---');
  const { data: profs } = await supabase.from('profiles').select('id, full_name, role, department, institution_id').eq('institution_id', slug);
  console.log('Total profiles for SS1212:', profs?.length);
  
  if (profs) {
    profs.forEach(p => {
       console.log(`- ID: ${p.id}, Name: ${p.full_name}, Role: ${p.role}, Dept: [${p.department}]`);
    });
  }
}

debug();
