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

async function checkInstMatch() {
  const { data: p } = await supabase.from('profiles').select('institution_id').limit(1);
  const { data: i } = await supabase.from('institutions').select('id, name').limit(5);
  
  console.log('--- Matches ---');
  console.log('Profile institution_id:', p[0]?.institution_id);
  console.log('Institutions available:', i.map(x => `${x.id} (${x.name})`).join(', '));
}

checkInstMatch();
