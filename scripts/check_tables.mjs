import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY4NTAyOCwiZXhwIjoyMDgzMjYxMDI4fQ.ywwhWFvNKwCvK-IsZcHmXLYO3XCCnx50CDbEMPZfNbs';

const supabase = createClient(supabaseUrl, serviceKey);

async function test() {
  const t1 = await supabase.from('support_queries').select('*').limit(1);
  console.log('support_queries:', t1.error ? t1.error.message : 'EXISTS');
  const t2 = await supabase.from('promotion_requests').select('*').limit(1);
  console.log('promotion_requests:', t2.error ? t2.error.message : 'EXISTS');
  const t3 = await supabase.from('audit_logs').select('*').limit(1);
  console.log('audit_logs:', t3.error ? t3.error.message : 'EXISTS');
}

test();
