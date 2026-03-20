import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkColumns() {
  console.log('--- Checking Classes Columns ---');
  const { data: cData, error: cErr } = await supabase.rpc('get_table_columns', { table_name: 'classes' });
  // Since I might not have rpc 'get_table_columns', I'll just select one row.
  const { data: cRow, error: cRErr } = await supabase.from('classes').select('*').limit(1);
  if (cRow && cRow.length > 0) {
    console.log('Classes Columns:', Object.keys(cRow[0]));
  } else {
    console.log('Classes table empty or error:', cRErr);
  }

  console.log('--- Checking Faculty Subjects Columns ---');
  const { data: fRow, error: fRErr } = await supabase.from('faculty_subjects').select('*').limit(1);
  if (fRow && fRow.length > 0) {
    console.log('Faculty Subjects Columns:', Object.keys(fRow[0]));
  } else {
    console.log('Faculty Subjects table empty or error:', fRErr);
  }
}

checkColumns();
