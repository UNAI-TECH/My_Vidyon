-- ============================================================
-- CRITICAL FIX: Add assigned_class_teacher_id to leave_requests
-- ============================================================
-- This migration adds direct teacher mapping to eliminate complex joins
-- Run this in Supabase SQL Editor or your local database

-- Step 1: Add the column
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS assigned_class_teacher_id UUID;

-- Step 2: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leave_requests_teacher
ON leave_requests(assigned_class_teacher_id, status);

-- Step 3: Backfill existing leave requests with class teacher ID
UPDATE leave_requests lr
SET assigned_class_teacher_id = (
    SELECT fs.faculty_profile_id
    FROM students s
    JOIN classes c ON c.name = s.class_name
    JOIN faculty_subjects fs ON fs.class_id = c.id AND fs.section = s.section
    WHERE s.id = lr.student_id
      AND fs.assignment_type = 'class_teacher'
    LIMIT 1
)
WHERE lr.assigned_class_teacher_id IS NULL;

-- Step 4: Verify the migration
SELECT 
    COUNT(*) as total_leaves,
    COUNT(assigned_class_teacher_id) as leaves_with_teacher,
    COUNT(*) - COUNT(assigned_class_teacher_id) as leaves_without_teacher
FROM leave_requests;

-- Expected: All leaves should have assigned_class_teacher_id populated
-- If leaves_without_teacher > 0, those students don't have a class teacher assigned

-- Step 5: View sample data to verify
SELECT 
    lr.id,
    lr.status,
    lr.assigned_class_teacher_id,
    s.name as student_name,
    s.class_name,
    s.section,
    p.email as faculty_email
FROM leave_requests lr
JOIN students s ON s.id = lr.student_id
LEFT JOIN profiles p ON p.id = lr.assigned_class_teacher_id
LIMIT 5;

-- DONE! Now the app will use simplified queries.
