const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInstitutions() {
  const { data, error } = await supabase
    .from('institutions')
    .select('*');
  
  if (error) {
    console.error('Error fetching institutions:', error);
    return;
  }
  
  console.log('Institutions in DB:');
  data.forEach(inst => {
    console.log(`- UUID: ${inst.id} | DisplayID: ${inst.institution_id} | Name: ${inst.name}`);
  });
}

checkInstitutions();
