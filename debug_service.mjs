import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ccyqzcaghwaggtmkmigi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY4NTAyOCwiZXhwIjoyMDgzMjYxMDI4fQ.ywwhWFvNKwCvK-IsZcHmXLYO3XCCnx50CDbEMPZfNbs');

async function debug() {
  console.log('\n--- SERVICE ROLE CLASSES SCAN ---');
  const { data: allClasses } = await supabase.from('classes').select('*');
  console.log(`Total Classes in DB: ${allClasses?.length}`);
  if (allClasses) {
     allClasses.forEach(c => console.log(`- Class: ${c.name}, Inst: ${c.institution_id}`));
  }

  const slug = 'SS1212';
  console.log(`\n--- SEARCHING FOR ${slug} STAFF ---`);
  const { data: staff } = await supabase.from('profiles').select('full_name, role, department').eq('institution_id', slug);
  console.log(`Total Staff for ${slug}: ${staff?.length}`);
  const depts = [...new Set(staff?.map(s => s.department))].filter(Boolean);
  console.log('Departments found:', depts);
}

debug();
