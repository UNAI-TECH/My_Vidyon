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
    const madhanId = 'e64f9f74-3c81-4235-9003-491a9799298c';
    
    console.log("--- DEBUGGING FOR MADHAN ---");
    
    // 1. Check notifications table
    console.log("Checking notifications for Madhan...");
    const notifRes = await fetch(`${supabaseUrl}/rest/v1/notifications?select=*&user_id=eq.${madhanId}&order=created_at.desc&limit=5`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const notifs = await notifRes.json();
    console.log('NOTIFICATIONS FOUND:', JSON.stringify(notifs, null, 2));

    // 2. Check user_push_tokens table
    console.log("\nChecking push tokens for Madhan...");
    const tokenRes = await fetch(`${supabaseUrl}/rest/v1/user_push_tokens?select=*&user_id=eq.${madhanId}`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const tokens = await tokenRes.json();
    console.log('PUSH TOKENS FOUND:', JSON.stringify(tokens, null, 2));
    
    // 3. Check announcements count
    console.log("\nChecking latest announcements...");
    const annRes = await fetch(`${supabaseUrl}/rest/v1/announcements?select=id,title,created_at&order=created_at.desc&limit=5`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const anns = await annRes.json();
    console.log('LATEST ANNOUNCEMENTS:', JSON.stringify(anns, null, 2));
  }

  run().catch(console.error);
} catch(e) {
  console.error("Script failed", e);
}
