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

async function checkTokens() {
  let output = '--- Checking user_push_tokens Columns ---\n';
  const { data: tokens, error: tErr } = await supabase.from('user_push_tokens').select('*').limit(1);
  if (tErr) {
    output += `Error checking user_push_tokens: ${tErr.message}\n`;
  } else if (tokens && tokens.length > 0) {
    output += `user_push_tokens Columns: ${Object.keys(tokens[0]).join(', ')}\n`;
  } else {
    output += 'user_push_tokens table is empty.\n';
  }
  fs.writeFileSync('tokens_output.txt', output);
  console.log('Results written to tokens_output.txt');
}

checkTokens();
