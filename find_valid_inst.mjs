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

async function findValidInst() {
  const { data: profiles, error } = await supabase.from('profiles').select('institution_id').limit(1);
  if (profiles && profiles.length > 0) {
    const instId = profiles[0].institution_id;
    console.log('Found Institution ID with profiles:', instId);
    
    const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', instId);
    console.log(`This institution has ${count} profiles.`);
  } else {
    console.log('No profiles found in the database at all.');
  }
}

findValidInst();
