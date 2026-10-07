import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY4NTAyOCwiZXhwIjoyMDgzMjYxMDI4fQ.ywwhWFvNKwCvK-IsZcHmXLYO3XCCnx50CDbEMPZfNbs';

const supabase = createClient(supabaseUrl, serviceKey);

async function test() {
  const { data, error } = await supabase.from('password_reset_requests').select('*').limit(1);
  console.log('Result:', { data, error });
}

test();
