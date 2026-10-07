import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ccyqzcaghwaggtmkmigi.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE';
const supabase = createClient(supabaseUrl, anonKey);

async function test() {
  const res = await supabase.functions.invoke('create-user', {
    body: {
      email: 'myvidyon@gmail.com',
      role: 'superadmin',
      institution_id: 'global'
    }
  });
  console.log('Invoke with params:', { data: res.data, error: res.error });
}

test();
