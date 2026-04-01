import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    const { data, error } = await supabase.from('exam_schedules').select('*').limit(1);
    if (error) {
        console.error("Error fetching exam_schedules:", error);
    } else if (data.length > 0) {
        console.log("Columns in exam_schedules:", Object.keys(data[0]));
    } else {
        console.log("No data in exam_schedules table.");
    }
}

inspect();
