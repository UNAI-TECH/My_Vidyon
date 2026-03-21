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
    console.log("--- GLOBAL DATA CHECK ---");

    // 1. All institutions
    const iRes = await fetch(`${supabaseUrl}/rest/v1/institutions?select=id,name&limit=5`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    console.log('INSTITUTIONS:', JSON.stringify(await iRes.json(), null, 2));

    // 2. All announcements
    const aRes = await fetch(`${supabaseUrl}/rest/v1/announcements?select=id,title,institution_id&limit=5`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    console.log('ANY ANNOUNCEMENTS:', JSON.stringify(await aRes.json(), null, 2));
    
    // 3. Profiles count
    const pRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=count`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Prefer': 'count=exact' }
    });
    console.log('PROFILE COUNT:', pRes.headers.get('content-range'));
  }

  run().catch(console.error);
} catch(e) {
  console.error("Script failed", e);
}
