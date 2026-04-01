const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
  const { data, error } = await supabase.rpc('query_sql', {
    sql_query: `
      SELECT 
        conname, 
        confrelid::regclass AS table_to, 
        a.attname AS column_from, 
        af.attname AS column_to
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)
      WHERE c.conrelid = 'students'::regclass AND c.contype = 'f';
    `
  });
  
  if (error) {
    // If rpc fails, try another way
    console.log("RPC failed, trying information_schema...");
    const { data: data2, error: error2 } = await supabase.from('information_schema.key_column_usage').select('*').eq('table_name', 'students');
    console.log(data2 || error2);
    return;
  }
  
  console.log('Students Foreign Keys:');
  console.table(data);
}

checkConstraints();
