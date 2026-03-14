-- Add this to your Supabase migrations folder
-- File: supabase/migrations/20260206_add_class_teacher_to_leaves.sql

-- Add assigned_class_teacher_id column
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS assigned_class_teacher_id UUID REFERENCES profiles(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_teacher
ON leave_requests(assigned_class_teacher_id, status);

-- Backfill existing leave requests
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
