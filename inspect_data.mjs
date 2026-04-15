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

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not found in .env');
  }

  const query = async (path) => {
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    return res.json();
  };

  async function run() {
    console.log('--- Inspecting Students Table ---');
    const students = await query('students?select=name,class_name,institution_id&limit=5');
    console.log('Sample Students:', JSON.stringify(students, null, 2));

    console.log('\n--- Inspecting Classes Table ---');
    const classes = await query('classes?select=id,name,institution_id&limit=5');
    console.log('Sample Classes:', JSON.stringify(classes, null, 2));

    console.log('\n--- Inspecting Timetable Table ---');
    const timetable = await query('timetable?select=day_of_week&limit=10');
    console.log('Sample Timetable Days:', JSON.stringify([...new Set(timetable.map(t => t.day_of_week))], null, 2));

    // Try a specific resolution for "1st" if we can find an institution_id
    if (students.length > 0) {
      const targetInstId = students[0].institution_id;
      console.log(`\n--- Testing Resolution for "1st" in Institution ${targetInstId} ---`);
      const instClasses = await query(`classes?select=id,name&institution_id=eq.${targetInstId}`);
      const match = instClasses.find(c => {
          const cName = c.name.toLowerCase().trim();
          const target = "1st";
          return cName === target || 
                 cName === `class ${target}` || 
                 cName.replace(/class\s*/i, '') === target.replace(/class\s*/i, '') || 
                 cName.replace(/[^a-z0-9]/g, '') === target.replace(/[^a-z0-9]/g, '');
      });
      console.log('Found Match:', match);
    }
  }

  run().catch(console.error);
} catch (e) {
  console.error('Error:', e.message);
}
