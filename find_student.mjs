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
    console.log("Searching for student: Madhan.kumar.1sta14@ss1212.vidyon.app");
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,institution_id,full_name&email=eq.Madhan.kumar.1sta14@ss1212.vidyon.app`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const results = await res.json();
    console.log('SEARCH RESULT:', JSON.stringify(results, null, 2));
  }

  run().catch(console.error);
} catch(e) {
  console.error("Script failed", e);
}
