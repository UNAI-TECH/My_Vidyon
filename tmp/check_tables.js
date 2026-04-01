import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY4NTAyOCwiZXhwIjoyMDgzMjYxMDI4fQ.ywwhWFvNKwCvK-IsZcHmXLYO3XCCnx50CDbEMPZfNbs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    const { data: tables, error } = await supabase.from('pg_tables').select('tablename').eq('schemaname', 'public');
    if (error) {
        // Alternative: try to select from 'exams' and 'exam_schedules'
        console.log("Trying to select from 'exams'...");
        const { error: e1 } = await supabase.from('exams').select('id').limit(1);
        console.log("Exams exists?", !e1);
        if (e1) console.log("Exams error:", e1.message);

        console.log("\nTrying to select from 'exam_schedules'...");
        const { data: d2, error: e2 } = await supabase.from('exam_schedules').select('id, exam_display_name').limit(1);
        console.log("Exam_schedules exists?", !e2);
        if (d2) console.log("Exam_schedules sample:", d2[0]);
    } else {
        console.log("Tables:", tables.map(t => t.tablename));
    }
}

checkTables();
