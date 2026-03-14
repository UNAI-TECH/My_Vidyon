-- =============================================
-- FIX EXAM SCHEDULES RLS POLICIES FOR PARENTS
-- =============================================

-- 1. Add Parent SELECT policy for exam_schedules
-- This allows parents to view schedules for any class/section where they have a child
DROP POLICY IF EXISTS "Parents can view exam schedules for their children" ON exam_schedules;

CREATE POLICY "Parents can view exam schedules for their children"
ON exam_schedules FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM students
        WHERE students.parent_id = auth.uid() -- Assuming parent_id stores the Auth User ID directly based on usage patterns
        AND students.class_name = exam_schedules.class_id
        AND students.section = exam_schedules.section
        AND students.institution_id = exam_schedules.institution_id
    )
);

-- 2. Ensure entries are visible to anyone who can see the schedule
-- (The existing policy should already handle this, but we'll make it more robust)
DROP POLICY IF EXISTS "Users can view exam schedule entries" ON exam_schedule_entries;

CREATE POLICY "Users can view exam schedule entries"
ON exam_schedule_entries FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM exam_schedules
        WHERE exam_schedules.id = exam_schedule_entries.exam_schedule_id
    )
);

-- 3. Add a more specific policy for Parents on entries just in case
DROP POLICY IF EXISTS "Parents can view exam schedule entries for their children" ON exam_schedule_entries;

CREATE POLICY "Parents can view exam schedule entries for their children"
ON exam_schedule_entries FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM exam_schedules
        JOIN students ON students.class_name = exam_schedules.class_id 
           AND students.section = exam_schedules.section 
           AND students.institution_id = exam_schedules.institution_id
        WHERE exam_schedules.id = exam_schedule_entries.exam_schedule_id
        AND students.parent_id = auth.uid()
    )
);

-- 4. Fix redundant or overly broad policies if any
-- Optional: If staff policy is too broad, we could restrict it to profile.role = 'staff'
-- But for now, ensuring parents have their own explicit path is priority.

COMMENT ON POLICY "Parents can view exam schedules for their children" ON exam_schedules IS 
'Allows parents to view exam schedules for their children by matching class, section and institution.';
