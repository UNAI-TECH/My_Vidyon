-- FIX: Allow parents and students to view classes and faculty assignments
-- This enables the "Class Teacher" name lookup in the Parent Dashboard.

-- 1. Classes Table
DROP POLICY IF EXISTS "Authenticated read classes" ON public.classes;
CREATE POLICY "Authenticated read classes"
ON public.classes FOR SELECT
TO authenticated
USING (public.check_user_institution(institution_id::text));

-- 2. Faculty Subjects Table
DROP POLICY IF EXISTS "Authenticated read faculty subjects" ON public.faculty_subjects;
CREATE POLICY "Authenticated read faculty subjects"
ON public.faculty_subjects FOR SELECT
TO authenticated
USING (public.check_user_institution(institution_id::text));

-- 3. Verify
SELECT 'RLS policies updated for classes and faculty_subjects' as status;
