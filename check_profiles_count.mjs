import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envText = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envText.split('\n').forEach(line => {
  if (line.includes('VITE_SUPABASE_URL')) {
    supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
  }
  if (line.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
  }
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfilesForInst() {
  const { data: insts } = await supabase.from('institutions').select('id').limit(1);
  if (!insts || insts.length === 0) {
    console.log('No institutions found.');
    return;
  }
  const instId = insts[0].id;
  console.log('Testing with Institution ID:', instId);

  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('institution_id', instId);
  
  if (error) {
    console.log('Error counting profiles:', error.message);
  } else {
    console.log(`Found ${count} profiles for institution ${instId}`);
  }
}

checkProfilesForInst();
