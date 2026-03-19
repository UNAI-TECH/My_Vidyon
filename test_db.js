import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkInstitutions() {
  const { data: inst, error } = await supabase.from('institutions').select('id, institution_id, name');
  const { data: ann, error: err2 } = await supabase.from('announcements').select('institution_id').limit(5);

  const output = {
    institutions: inst || [],
    ann_samples: ann || [],
    errors: { inst: error, ann: err2 }
  };

  fs.writeFileSync('test_output.txt', JSON.stringify(output, null, 2));
  console.log('Results written to test_output.txt');
}

checkInstitutions();
