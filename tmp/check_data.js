import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY4NTAyOCwiZXhwIjoyMDgzMjYxMDI4fQ.ywwhWFvNKwCvK-IsZcHmXLYO3XCCnx50CDbEMPZfNbs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Checking exam_schedules...");
    const { data, error } = await supabase.from('exam_schedules').select('class_id, institution_id').limit(5);
    if (error) {
        console.error("Error fetching exam_schedules:", error.message);
    } else {
        console.log("Existing exam_schedules rows:", data.length);
        console.log("Existing class_id values:", data.map(d => d.class_id));
        console.log("Existing institution_id values:", data.map(d => d.institution_id));
    }

    console.log("\nChecking classes...");
    const { data: classes, error: cError } = await supabase.from('classes').select('id, name, institution_id').limit(5);
    if (cError) {
        console.error("Error fetching classes:", cError.message);
    } else {
        console.log("Existing classes:", classes.map(c => ({ id: c.id, name: c.name, inst: c.institution_id })));
    }
}

checkData();
