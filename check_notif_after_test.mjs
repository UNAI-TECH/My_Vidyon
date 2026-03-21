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

async function checkNotifications() {
  console.log('--- Checking Notifications Table ---');
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(10);
  if (error) {
    console.log('Error checking notifications:', error.message);
  } else {
    console.log(`Found ${data.length} notifications.`);
    if (data.length > 0) {
      console.log('Recent Notifications:', JSON.stringify(data, null, 2));
    }
  }
}

checkNotifications();
