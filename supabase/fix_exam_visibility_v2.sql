-- Fix for Student Exam Visibility and RLS
-- Run this in your Supabase SQL Editor

DO $$ 
BEGIN
    -- 1. Ensure columns are named correctly to match the app (class_id)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_schedules' AND column_name = 'class_name') THEN
        ALTER TABLE public.exam_schedules RENAME COLUMN class_name TO class_id;
    END IF;

    -- 2. Relax the institution_id type to TEXT if it's currently UUID
    -- (This allows short IDs like 'MYVID2026' being used in the app)
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'exam_schedules' AND column_name = 'institution_id') = 'uuid' THEN
        ALTER TABLE public.exam_schedules ALTER COLUMN institution_id TYPE TEXT;
    END IF;

    -- 3. Update RLS Policy for Students
    DROP POLICY IF EXISTS "Students view own class exams" ON public.exam_schedules;
    CREATE POLICY "Students view own class exams"
    ON public.exam_schedules FOR SELECT TO authenticated
    USING (
        -- Match by Institution (Short ID)
        institution_id IN (
            SELECT institution_id FROM public.profiles WHERE id = auth.uid()
        )
        AND (
            -- Case A: Direct match (e.g. '10th' = '10th')
            EXISTS (
                SELECT 1 FROM public.students
                WHERE user_id = auth.uid()
                AND class_name = exam_schedules.class_id
                AND (section = exam_schedules.section OR exam_schedules.section IS NULL)
            )
            OR
            -- Case B: UUID match (students.class_name matches classes.name, then match classes.id vs exam_schedules.class_id)
            EXISTS (
                SELECT 1 FROM public.students s
                JOIN public.classes c ON c.name = s.class_name AND c.institution_id = s.institution_id
                WHERE s.user_id = auth.uid()
                AND c.id::text = exam_schedules.class_id
                AND (s.section = exam_schedules.section OR exam_schedules.section IS NULL)
            )
        )
    );

END $$;

-- Update child table entries RLS
DROP POLICY IF EXISTS "Everyone views entries" ON public.exam_schedule_entries;
CREATE POLICY "Everyone views entries"
ON public.exam_schedule_entries FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.exam_schedules
        WHERE id = exam_schedule_entries.exam_schedule_id
    )
);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
