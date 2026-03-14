-- ============================================
-- COMPLETE FIX FOR EXAM SCHEDULE ENTRIES RLS
-- ============================================
-- Run this COMPLETE SQL in your Supabase SQL Editor to fix the data fetching issue

-- Step 1: Drop ALL existing policies on exam_schedule_entries
DROP POLICY IF EXISTS "Users can view exam schedule entries with proper permissions" ON exam_schedule_entries;
DROP POLICY IF EXISTS "Users can view exam schedule entries" ON exam_schedule_entries;
DROP POLICY IF EXISTS "Faculty can create exam schedule entries" ON exam_schedule_entries;
DROP POLICY IF EXISTS "Faculty can update exam schedule entries" ON exam_schedule_entries;
DROP POLICY IF EXISTS "Faculty can delete exam schedule entries" ON exam_schedule_entries;

-- Step 2: Create NEW comprehensive SELECT policy that queries the students table
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

-- Step 3: Re-create INSERT policy for faculty
CREATE POLICY "Faculty can create exam schedule entries"
ON exam_schedule_entries FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM exam_schedules
        WHERE exam_schedules.id = exam_schedule_entries.exam_schedule_id
        AND exam_schedules.created_by = auth.uid()
    )
);

-- Step 4: Re-create UPDATE policy for faculty
CREATE POLICY "Faculty can update exam schedule entries"
ON exam_schedule_entries FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM exam_schedules
        WHERE exam_schedules.id = exam_schedule_entries.exam_schedule_id
        AND exam_schedules.created_by = auth.uid()
    )
);

-- Step 5: Re-create DELETE policy for faculty
CREATE POLICY "Faculty can delete exam schedule entries"
ON exam_schedule_entries FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM exam_schedules
        WHERE exam_schedules.id = exam_schedule_entries.exam_schedule_id
        AND exam_schedules.created_by = auth.uid()
    )
);

-- Step 6: Add documentation comments
COMMENT ON POLICY "Students and faculty can view exam schedule entries" ON exam_schedule_entries IS
'Allows students to view exam entries by checking the students table for their class/section (not JWT metadata), and allows faculty to view entries they created.';

-- Step 7: Verification
SELECT 'RLS policies for exam_schedule_entries updated successfully!' as status;

-- Step 8: Test query (run this to verify students can see entries)
-- Replace the email with a test student's email
SELECT 
    es.exam_display_name,
    es.class_id,
    es.section,
    COUNT(ese.id) as entry_count
FROM exam_schedules es
LEFT JOIN exam_schedule_entries ese ON ese.exam_schedule_id = es.id
WHERE es.institution_id = (SELECT institution_id FROM students WHERE email = 'your-test-student@example.com' LIMIT 1)
GROUP BY es.id, es.exam_display_name, es.class_id, es.section;
