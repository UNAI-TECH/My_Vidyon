-- Fix RLS Policies for exam_schedules and entries to avoid auth.users table access
-- This resolves the "permission denied for table users" error

-- 1. Redefine Exam Schedules SELECT/INSERT policies to use auth.jwt() instead of subqueries to auth.users
DROP POLICY IF EXISTS "Students can view exam schedules for their class" ON public.exam_schedules;
CREATE POLICY "Students can view exam schedules for their class"
ON public.exam_schedules FOR SELECT
TO authenticated
USING (
    institution_id = (auth.jwt() -> 'user_metadata' ->> 'institution_id') AND
    EXISTS (
        SELECT 1 FROM public.students
        WHERE (students.email = auth.jwt() ->> 'email')
        AND students.class_name = exam_schedules.class_id
        AND students.section = exam_schedules.section
        -- Note: using auth.jwt() ->> 'email' is safer than selecting from auth.users
    )
);

-- 2. Redefine entries policy
DROP POLICY IF EXISTS "Students and faculty can view exam schedule entries" ON public.exam_schedule_entries;
CREATE POLICY "Students and faculty can view exam schedule entries"
ON public.exam_schedule_entries FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.exam_schedules
        WHERE public.exam_schedules.id = exam_schedule_entries.exam_schedule_id
        AND (
            public.exam_schedules.created_by = auth.uid()
            OR
            (
                public.exam_schedules.institution_id = (auth.jwt() -> 'user_metadata' ->> 'institution_id')
                AND EXISTS (
                    SELECT 1 FROM public.students
                    WHERE students.email = auth.jwt() ->> 'email'
                    AND students.class_name = public.exam_schedules.class_id
                    AND students.section = public.exam_schedules.section
                )
            )
        )
    )
);

-- 3. Ensure Insert/Update/Delete work without subqueries if possible
-- The current policies in FIX_ALL_RLS_VULNERABILITIES were already mostly okay but we'll harden them.
DROP POLICY IF EXISTS "Faculty can create exam schedules" ON public.exam_schedules;
CREATE POLICY "Faculty can create exam schedules"
ON public.exam_schedules FOR INSERT
TO authenticated
WITH CHECK (
    institution_id = (auth.jwt() -> 'user_metadata' ->> 'institution_id') 
    AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Faculty can update their own exam schedules" ON public.exam_schedules;
CREATE POLICY "Faculty can update their own exam schedules"
ON public.exam_schedules FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Faculty can delete their own exam schedules" ON public.exam_schedules;
CREATE POLICY "Faculty can delete their own exam schedules"
ON public.exam_schedules FOR DELETE
TO authenticated
USING (created_by = auth.uid());
