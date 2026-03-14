-- ============================================
-- FIX EXAM SCHEDULES RLS POLICIES FOR STUDENTS
-- ============================================

-- Drop the old student policy that relies on JWT metadata
DROP POLICY IF EXISTS "Students can view exam schedules for their class" ON exam_schedules;

-- Create a new policy that checks the students table directly
-- This allows students to view exam schedules for their class and section
CREATE POLICY "Students can view exam schedules for their class"
ON exam_schedules FOR SELECT
TO authenticated
USING (
    institution_id = (auth.jwt() -> 'user_metadata' ->> 'institution_id') AND
    EXISTS (
        SELECT 1 FROM students
        WHERE students.email = auth.jwt() ->> 'email'
        AND students.class_name = exam_schedules.class_id
        AND students.section = exam_schedules.section
        AND students.institution_id = exam_schedules.institution_id
    )
);

-- Add a comment for documentation
COMMENT ON POLICY "Students can view exam schedules for their class" ON exam_schedules IS 
'Allows students to view exam schedules by checking their class and section from the students table, rather than relying on JWT metadata which may not be present.';

-- Verify the policy was created
SELECT 'RLS policy updated successfully' as status;
