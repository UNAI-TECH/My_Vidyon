-- ============================================
-- FIX EXAM SCHEDULE ENTRIES RLS POLICY
-- ============================================
-- This replaces the incorrect policy with one that queries the students table

-- 1. Drop the existing policy (it relies on JWT metadata which students don't have)
DROP POLICY IF EXISTS "Users can view exam schedule entries with proper permissions" ON exam_schedule_entries;
DROP POLICY IF EXISTS "Users can view exam schedule entries" ON exam_schedule_entries;

-- 2. Create a new policy that checks the students table directly (like exam_schedules does)
CREATE POLICY "Students and faculty can view exam schedule entries"
ON exam_schedule_entries FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM exam_schedules
        WHERE exam_schedules.id = exam_schedule_entries.exam_schedule_id
        AND (
            -- Faculty access: they created the schedule
            exam_schedules.created_by = auth.uid()
            OR
            -- Student access: check students table for matching class/section
            (
                exam_schedules.institution_id = (auth.jwt() -> 'user_metadata' ->> 'institution_id')
                AND EXISTS (
                    SELECT 1 FROM students
                    WHERE students.email = auth.jwt() ->> 'email'
                    AND students.class_name = exam_schedules.class_id
                    AND students.section = exam_schedules.section
                    AND students.institution_id = exam_schedules.institution_id
                )
            )
        )
    )
);

-- 3. Add comment for documentation
COMMENT ON POLICY "Students and faculty can view exam schedule entries" ON exam_schedule_entries IS
'Allows students to view exam entries by checking the students table for their class/section, and allows faculty to view entries they created. Matches the exam_schedules policy approach.';

-- 4. Verification query
SELECT 'RLS policy for exam_schedule_entries updated successfully' as status;
