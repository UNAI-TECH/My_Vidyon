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
    console.log("Searching for a faculty in institution: 4004085b-e60d-4da4-86a0-e67c9c05d76d");
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,full_name,role&institution_id=eq.4004085b-e60d-4da4-86a0-e67c9c05d76d&role=in.(faculty,teacher)&limit=1`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const results = await res.json();
    console.log('FACULTY SEARCH RESULT:', JSON.stringify(results, null, 2));
  }

  run().catch(console.error);
} catch(e) {
  console.error("Script failed", e);
}
