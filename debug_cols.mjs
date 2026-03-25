import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ccyqzcaghwaggtmkmigi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE');

async function debug() {
  const { data: cls } = await supabase.from('classes').select('*').limit(1).single();
  console.log('Classes Columns:', Object.keys(cls || {}));
  console.log('Sample Class Data:', cls);
  
  const slug = 'SS1212';
  const { data: instCls } = await supabase.from('classes').select('*').eq('institution_id', slug);
  console.log(`Force check classes for ${slug}:`, instCls);
}

debug();
