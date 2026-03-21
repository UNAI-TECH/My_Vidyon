import fs from 'fs';

try {
  const envText = fs.readFileSync('.env', 'utf8');
  let supabaseUrl = '';
  let supabaseKey = '';
  
  envText.split('\n').forEach(line => {
    if (line.includes('VITE_SUPABASE_URL')) {
      supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
    }
    if (line.includes('VITE_SUPABASE_ANON_KEY')) {
      supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
    }
  });

  async function run() {
    console.log("Checking announcements table structure...");
    const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${supabaseKey}` }
    });
    // The rest API doesn't easily show columns unless we use RPC or a specific select
    // Let's try to select 1 row and see keys
    const rowRes = await fetch(`${supabaseUrl}/rest/v1/announcements?select=*&limit=1`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const rows = await rowRes.json();
    if (rows && rows.length > 0) {
      console.log('ANNOUNCEMENT COLUMNS:', Object.keys(rows[0]));
    } else {
      console.log('No rows found in announcements. Trying search in schema...');
      // If no rows, we can try to find the columns from an empty select
      const emptyRes = await fetch(`${supabaseUrl}/rest/v1/announcements?select=*&limit=0`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Prefer': 'count=exact' }
      });
      console.log('HEADERS:', emptyRes.headers.get('content-range'));
    }
  }

  run().catch(console.error);
} catch(e) {
  console.error("Script failed", e);
}
