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

async function checkSchema() {
  const tables = ['students', 'classes', 'announcements', 'profiles', 'notifications'];
  let output = '';
  for (const table of tables) {
    output += `--- Checking ${table} Columns ---\n`;
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      output += `Error checking ${table}: ${error.message}\n`;
    } else if (data && data.length > 0) {
      output += `${table} Columns: ${Object.keys(data[0]).join(', ')}\n`;
    } else {
      output += `${table} table is empty.\n`;
    }
  }
  fs.writeFileSync('schema_output.txt', output);
  console.log('Results written to schema_output.txt');
}

checkSchema();
