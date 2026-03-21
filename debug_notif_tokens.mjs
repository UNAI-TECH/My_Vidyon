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
    console.log("--- NOTIFICATION / TOKEN CHECK ---");

    // 1. Any notifications?
    const nRes = await fetch(`${supabaseUrl}/rest/v1/notifications?select=id,title,user_id&limit=5`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    console.log('ANY NOTIFICATIONS:', JSON.stringify(await nRes.json(), null, 2));

    // 2. Any push tokens?
    const tRes = await fetch(`${supabaseUrl}/rest/v1/user_push_tokens?select=user_id,platform&limit=5`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    console.log('ANY PUSH TOKENS:', JSON.stringify(await tRes.json(), null, 2));
  }

  run().catch(console.error);
} catch(e) {
  console.error("Script failed", e);
}
