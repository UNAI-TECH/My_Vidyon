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

async function listInstNames() {
  const { data, error } = await supabase.from('institutions').select('id, name');
  if (data) {
    console.log('--- All Institutions ---');
    data.forEach(i => console.log(`${i.id}: ${i.name}`));
  } else {
    console.log('Error fetching institutions:', error.message);
  }
}

listInstNames();
