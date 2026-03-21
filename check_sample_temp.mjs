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

async function checkSample() {
  let output = '--- Checking Sample Student and Profile ---\n';
  const { data: students, error: sErr } = await supabase.from('students').select('*').limit(1);
  if (students && students.length > 0) {
    const s = students[0];
    output += `Student ID: ${s.id}\n`;
    output += `Student Profile ID: ${s.profile_id}\n`;
    output += `Student User ID: ${s.user_id}\n`;
    output += `Student Name: ${s.name}\n`;
    
    if (s.profile_id) {
        const { data: profile, error: pErr } = await supabase.from('profiles').select('*').eq('id', s.profile_id).single();
        if (profile) {
            output += `Found Profile by profile_id: ${profile.full_name}\n`;
        } else {
            output += `No Profile found by profile_id\n`;
        }
    }
    
    const { data: profileById, error: pIdErr } = await supabase.from('profiles').select('*').eq('id', s.id).single();
    if (profileById) {
        output += `Found Profile by s.id: ${profileById.full_name}\n`;
    } else {
        output += `No Profile found by s.id\n`;
    }
  } else {
    output += 'No students found.\n';
  }
  fs.writeFileSync('sample_output.txt', output);
  console.log('Results written to sample_output.txt');
}

checkSample();
