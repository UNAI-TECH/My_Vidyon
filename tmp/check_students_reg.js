import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY4NTAyOCwiZXhwIjoyMDgzMjYxMDI4fQ.ywwhWFvNKwCvK-IsZcHmXLYO3XCCnx50CDbEMPZfNbs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    const testColumns = ['register_number', 'roll_number'];
    for (const col of testColumns) {
        const { error: colErr } = await supabase.from('students').select(col).limit(1);
        if (colErr) console.log(`❌ Column '${col}' DOES NOT exist`);
        else console.log(`✅ Column '${col}' exists`);
    }
}

checkColumns();
