import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ccyqzcaghwaggtmkmigi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE');

async function debug() {
  console.log('\n--- GLOBAL CLASSES SCAN ---');
  const { data: allClasses } = await supabase.from('classes').select('*');
  console.log(`Total Classes in DB: ${allClasses?.length}`);
  if (allClasses && allClasses.length > 0) {
    console.log('Class 0:', allClasses[0]);
  }

  console.log('\n--- GLOBAL GROUPS SCAN ---');
  const { data: allGroups } = await supabase.from('groups').select('*');
  console.log(`Total Groups in DB: ${allGroups?.length}`);
  if (allGroups && allGroups.length > 0) {
    console.log('Group 0:', allGroups[0]);
  }
}

debug();
