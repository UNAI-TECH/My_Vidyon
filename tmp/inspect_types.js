import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY4NTAyOCwiZXhwIjoyMDgzMjYxMDI4fQ.ywwhWFvNKwCvK-IsZcHmXLYO3XCCnx50CDbEMPZfNbs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTypes() {
    const { data, error } = await supabase.rpc('get_column_types', { t_name: 'exam_schedules' });
    if (error) {
        // If RPC doesn't exist, try a direct query to information_schema
        const { data: cols, error: cErr } = await supabase.from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_name', 'exam_schedules')
            .eq('table_schema', 'public');
        
        if (cErr) {
            console.error("Error:", cErr.message);
        } else {
            console.log("Column types:", cols);
        }
    } else {
        console.log("Column types:", data);
    }
}

inspectTypes();
