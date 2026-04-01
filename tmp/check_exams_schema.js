import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY4NTAyOCwiZXhwIjoyMDgzMjYxMDI4fQ.ywwhWFvNKwCvK-IsZcHmXLYO3XCCnx50CDbEMPZfNbs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExamsSchema() {
    console.log("Checking 'exams' table sample...");
    const { data, error } = await supabase.from('exams').select('*').limit(1);
    if (error) {
        console.error("Error fetching exams:", error.message);
    } else {
        console.log("Sample row from 'exams':", data[0]);
    }

    console.log("\nChecking 'faculty_subjects' to see how class/section are stored...");
    const { data: fs, error: fError } = await supabase.from('faculty_subjects').select('*').limit(1);
    if (fError) {
        console.error("Error fetching faculty_subjects:", fError.message);
    } else {
        console.log("Sample faculty_subjects row:", fs[0]);
    }
}

checkExamsSchema();
