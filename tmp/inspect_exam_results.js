import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY4NTAyOCwiZXhwIjoyMDgzMjYxMDI4fQ.ywwhWFvNKwCvK-IsZcHmXLYO3XCCnx50CDbEMPZfNbs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectExamResults() {
    console.log("Checking exam_results columns...");
    // Since we can't query information_schema, we'll try a dummy select to deduce something or check a single row
    const { data: cols, error: cErr } = await supabase.from('exam_results').select('*').limit(1);
    if (cErr) {
        console.error("Error fetching exam_results:", cErr.message);
    } else {
        console.log("Sample exam_results row:", cols[0]);
    }

    // Try a direct query with a string to see if it fails (simulating the error)
    if (cols && cols[0]) {
        console.log("\nAttempting simulation query...");
        const { error: simError } = await supabase
            .from('exam_results')
            .select('id')
            .eq('exam_id', 'not-a-uuid');
        
        if (simError) {
            console.log("Simulation error for exam_id:", simError.message);
        } else {
            console.log("Simulation query succeeded for exam_id.");
        }
    }
}

inspectExamResults();
