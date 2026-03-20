import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkGroups() {
  console.log('--- Checking Groups Data ---');
  const { data: groups } = await supabase.from('groups').select('*').limit(5);
  console.log('Groups Sample:', groups);
  
  console.log('--- Checking Faculty Subjects Data ---');
  const { data: assignments } = await supabase.from('faculty_subjects').select('*').limit(5);
  console.log('Assignments Sample:', assignments);
}

checkGroups();
