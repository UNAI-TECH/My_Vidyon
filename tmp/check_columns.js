const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'fee_structures' });
  if (error) {
    // If RPC fails, try common query
    const { data: data2, error: error2 } = await supabase.from('fee_structures').select('*').limit(0);
    console.log('Columns from select:', Object.keys(data2?.[0] || {}));
    console.log('Error:', error2);
  } else {
    console.log('Columns:', data);
  }
}

checkColumns();
