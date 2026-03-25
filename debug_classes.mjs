import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ccyqzcaghwaggtmkmigi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE');

async function debug() {
  const slug = 'SS1212';
  
  console.log('\n--- CLASSES DEEP DIVE ---');
  const { data: allCls } = await supabase.from('classes').select('*').limit(5);
  console.log('All Classes Samples:', allCls);
  
  const { data: instCls } = await supabase.from('classes').select('*').eq('institution_id', slug);
  console.log(`Classes for ${slug}:`, instCls);

  console.log('\n--- PROFILES BY DEPT (English) ---');
  const { data: englishStaff } = await supabase.from('profiles').select('full_name, role, department').eq('institution_id', slug).eq('department', 'English');
  console.log('English Staff:', englishStaff);
}

debug();
