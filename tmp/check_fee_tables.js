const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFeeTables() {
  const { data: fs, error: fsErr } = await supabase.from('fee_structures').select('*').limit(1);
  console.log('Fee Structure sample:', fs?.[0] || fsErr);
  
  const { data: sf, error: sfErr } = await supabase.from('student_fees').select('*').limit(1);
  console.log('Student Fee sample:', sf?.[0] || sfErr);
}

checkFeeTables();
