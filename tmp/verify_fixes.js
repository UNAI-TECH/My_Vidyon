import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY4NTAyOCwiZXhwIjoyMDgzMjYxMDI4fQ.ywwhWFvNKwCvK-IsZcHmXLYO3XCCnx50CDbEMPZfNbs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFixes() {
    console.log("Checking students for parent_id...");
    const { data: students, error: sErr } = await supabase
        .from('students')
        .select('id, full_name, parent_id')
        .limit(5);
    
    if (sErr) console.error("Error fetching students:", sErr.message);
    else console.log("Students sample:", students);

    console.log("\nChecking subject_materials for faculty_id usage...");
    const { data: materials, error: mErr } = await supabase
        .from('subject_materials')
        .select('id, title, faculty_id')
        .limit(5);

    if (mErr) console.error("Error fetching materials:", mErr.message);
    else console.log("Materials sample:", materials);
}

verifyFixes();
