
-- Diagnostic script to check student data
SELECT 
    id, 
    institution_id, 
    name, 
    email, 
    class_name, 
    academic_year,
    created_at
FROM public.students
ORDER BY created_at DESC
LIMIT 10;

-- Check institutions for comparison
SELECT id, institution_id, name FROM public.institutions;

-- Check if academic_year column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' AND column_name = 'academic_year';
