import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkGroups() {
  console.log('--- Checking Groups Columns ---');
  const { data: gRow, error: gRErr } = await supabase.from('groups').select('*').limit(1);
  if (gRow && gRow.length > 0) {
    console.log('Groups Columns:', Object.keys(gRow[0]));
  } else {
    console.log('Groups table empty or error:', gRErr);
  }
}

checkGroups();
