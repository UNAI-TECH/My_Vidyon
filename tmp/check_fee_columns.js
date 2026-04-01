const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumnTypes() {
  const { data, error } = await supabase.rpc('query_sql', {
    sql_query: `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fee_structures';
    `
  });
  
  if (error) {
    console.error('RPC Error:', error);
    return;
  }
  
  console.log('Column Types for fee_structures:');
  console.table(data);
}

checkColumnTypes();
