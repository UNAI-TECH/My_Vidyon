import fs from 'fs';

try {
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

  async function run() {
    console.log("Using Institution ID: ABC-SCHOOL (known to have profiles)");
    const instUuid = 'ABC-SCHOOL';

    console.log("Testing insert...");
    const res = await fetch(`${supabaseUrl}/rest/v1/announcements`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        title: 'Test',
        content: 'Test content',
        type: 'info',
        category: 'General',
        institution_id: instUuid
      })
    });
    const result = await res.json();
    console.log('INSERT RESULT:', JSON.stringify(result, null, 2));
  }

  run().catch(console.error);
} catch(e) {
  console.error("Script failed", e);
}
