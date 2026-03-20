import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugClasses() {
  console.log('--- Searching for "3rd" class ---');
  const { data: classes, error } = await supabase.from('classes').select('*');
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  const matchingClasses = classes.filter(c => {
    if (c.name === '3rd') return true;
    try {
      const parsed = JSON.parse(c.name);
      return parsed.name === '3rd';
    } catch (e) {
      return false;
    }
  });

  console.log('Matching Classes:', matchingClasses);

  if (matchingClasses.length > 0) {
      for (const cls of matchingClasses) {
          const { data: assignments } = await supabase
            .from('faculty_subjects')
            .select('*, profiles:faculty_profile_id(full_name)')
            .eq('class_id', cls.id)
            .eq('assignment_type', 'class_teacher');
          console.log(`Class Teacher for ${cls.id} (${cls.name}):`, assignments);
      }
  }
}

debugClasses();
