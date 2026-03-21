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

async function checkInst() {
  const { data, error } = await supabase.from('institutions').select('*').eq('id', 'ABC-SCHOOL').single();
  if (data) {
    console.log('Found ABC-SCHOOL:', data.name);
  } else {
    console.log('ABC-SCHOOL not found in institutions table.');
    const { data: all } = await supabase.from('institutions').select('id').limit(10);
    console.log('Available IDs:', all.map(a => a.id).join(', '));
  }
}

checkInst();
