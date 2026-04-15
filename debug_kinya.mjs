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
    console.log("Searching for student matching 'Kinya patel'...");
    
    // 1. Find Student
    const studentRes = await fetch(`${supabaseUrl}/rest/v1/students?select=*,institution_id,class_name,section&name=ilike.*Kinya*patel*`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const students = await studentRes.json();
    console.log('STUDENT RECORD:', JSON.stringify(students, null, 2));

    if (students.length === 0) {
        console.log("No student found.");
        return;
    }

    const student = students[0];
    const instId = student.institution_id;
    const className = student.class_name;

    // 2. Look for Class
    console.log(`Looking for class matching '${className}' in institution '${instId}'...`);
    const classRes = await fetch(`${supabaseUrl}/rest/v1/classes?select=id,name&institution_id=eq.${instId}`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const classes = await classRes.json();
    console.log('POTENTIAL CLASSES:', JSON.stringify(classes, null, 2));

    const matchedClass = classes.find(c => {
        const cName = c.name.toLowerCase().trim();
        const target = className.toLowerCase().trim();
        return cName === target || 
               cName === `class ${target}` || 
               `class ${cName}` === target || 
               cName.replace(/class\s*/i, '') === target.replace(/class\s*/i, '') || 
               cName.replace(/[^a-z0-9]/g, '') === target.replace(/[^a-z0-9]/g, '');
    });

    if (!matchedClass) {
        console.log("FAILED TO RESOLVE CLASS UUID.");
        return;
    }

    console.log(`RESOLVED CLASS: ${matchedClass.name} (${matchedClass.id})`);

    // 3. Check Timetable
    console.log(`Fetching timetable for class '${matchedClass.id}'...`);
    const timetableRes = await fetch(`${supabaseUrl}/rest/v1/timetable?select=*&class_id=eq.${matchedClass.id}`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const slots = await timetableRes.json();
    console.log(`FOUND ${slots.length} TIMETABLE SLOTS.`);
    
    const saturdaySlots = slots.filter(s => s.day_of_week === 'Saturday' || s.day_of_week === 'Sat');
    console.log(`SATURDAY SLOTS:`, JSON.stringify(saturdaySlots, null, 2));
  }

  run().catch(console.error);
} catch(e) {
  console.error("Script failed", e);
}
