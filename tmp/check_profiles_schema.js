import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY4NTAyOCwiZXhwIjoyMDgzMjYxMDI4fQ.ywwhWFvNKwCvK-IsZcHmXLYO3XCCnx50CDbEMPZfNbs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log("Checking columns for 'profiles' table...");
    const testColumns = [
        'id', 'email', 'full_name', 'name', 'role', 'institution_id', 
        'is_active', 'updated_at', 'phone', 'staff_id', 'department', 
        'date_of_birth', 'dob', 'profile_image_url', 'avatar_url'
    ];
    
    for (const col of testColumns) {
        const { error: colErr } = await supabase.from('profiles').select(col).limit(1);
        if (colErr) {
            console.log(`❌ Column '${col}' DOES NOT exist (${colErr.message})`);
        } else {
            console.log(`✅ Column '${col}' exists`);
        }
    }
}

checkColumns();
