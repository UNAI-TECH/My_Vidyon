import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ccyqzcaghwaggtmkmigi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY4NTAyOCwiZXhwIjoyMDgzMjYxMDI4fQ.ywwhWFvNKwCvK-IsZcHmXLYO3XCCnx50CDbEMPZfNbs');

async function debug() {
  const slug = 'SS1212';
  
  console.log('\n--- HIDDEN CHARACTERS CHECK ---');
  const { data: inst } = await supabase.from('institutions').select('id, institution_id').eq('institution_id', slug).single();
  console.log(`Institution Slug from DB: ${JSON.stringify(inst?.institution_id)}`);
  
  const { data: cls } = await supabase.from('classes').select('id, name, institution_id').limit(1);
  if (cls && cls[0]) {
    console.log(`Class ${cls[0].name} Inst ID: ${JSON.stringify(cls[0].institution_id)}`);
  }

  const { data: prof } = await supabase.from('profiles').select('id, institution_id').eq('institution_id', slug).limit(1);
  if (prof && prof[0]) {
    console.log(`Profile Inst ID: ${JSON.stringify(prof[0].institution_id)}`);
  }
}

debug();
