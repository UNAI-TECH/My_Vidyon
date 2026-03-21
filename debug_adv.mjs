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
    console.log("--- ADVANCED DEBUG ---");
    const madhanId = 'e64f9f74-3c81-4235-9003-491a9799298c';
    const instId = '4004085b-e60d-4da4-86a0-e67c9c05d76d';

    // 1. Check if Madhan exists in profiles with correct institution_id
    const pRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,institution_id,full_name&id=eq.${madhanId}`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    console.log('MADHAN PROFILE:', JSON.stringify(await pRes.json(), null, 2));

    // 2. Check if announcements were actually inserted
    const aRes = await fetch(`${supabaseUrl}/rest/v1/announcements?select=*&institution_id=eq.${instId}&order=created_at.desc&limit=1`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    console.log('LATEST ANNOUNCEMENT IN INST:', JSON.stringify(await aRes.json(), null, 2));

    // 3. Check for ANY notification in that institution
    const nRes = await fetch(`${supabaseUrl}/rest/v1/notifications?select=*&limit=5&order=created_at.desc`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    console.log('ANY LATEST NOTIFICATIONS:', JSON.stringify(await nRes.json(), null, 2));
  }

  run().catch(console.error);
} catch(e) {
  console.error("Script failed", e);
}
