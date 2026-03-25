import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ccyqzcaghwaggtmkmigi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE');

async function debug() {
  console.log('\n--- ANON MINIMAL SELECT ---');
  const { data: minCls } = await supabase.from('classes').select('id, name');
  console.log(`Classes found with minimal select: ${minCls?.length}`);
  if (minCls) {
     minCls.forEach(c => console.log(`- Class: ${c.name}`));
  }

  console.log('\n--- ANON FULL SELECT ---');
  const { data: fullCls } = await supabase.from('classes').select('*');
  console.log(`Classes found with full select: ${fullCls?.length}`);
}

debug();
