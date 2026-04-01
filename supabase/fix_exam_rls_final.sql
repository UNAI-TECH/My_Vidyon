-- =====================================================
-- FIX EXAM RLS POLICY FOR STUDENTS
-- =====================================================
-- This script corrects the security policy that was preventing 
-- students from seeing their class exams.

DROP POLICY IF EXISTS "Students view own class exams" ON public.exam_schedules;

CREATE POLICY "Students view own class exams"
ON public.exam_schedules FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.students
        WHERE user_id = auth.uid() 
        AND class_id = exam_schedules.class_id 
        AND (section IS NULL OR section = exam_schedules.section)
    )
);

-- Ensure exam entries are also visible to students linked to those schedules
DROP POLICY IF EXISTS "Everyone views entries" ON public.exam_schedule_entries;
CREATE POLICY "Everyone views entries"
ON public.exam_schedule_entries FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.exam_schedules
        WHERE id = exam_schedule_entries.exam_schedule_id
    )
);
