-- ============================================================================
-- COMPLETE FIX FOR LEAVE REQUEST FACULTY ROUTING
-- ============================================================================
-- This script fixes the leave request routing issue by:
-- 1. Adding assignment_type column to faculty_subjects (if missing)
-- 2. Fixing the get_student_class_teacher() function to use correct table
-- 3. Ensuring the trigger works correctly
-- ============================================================================

-- Step 1: Add assignment_type column to faculty_subjects table
-- ============================================================================
ALTER TABLE public.faculty_subjects
ADD COLUMN IF NOT EXISTS assignment_type TEXT CHECK (assignment_type IN ('class_teacher', 'subject_staff'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_faculty_subjects_assignment_type
ON public.faculty_subjects(assignment_type, class_id, section);

-- Update existing records to have a default assignment_type if NULL
-- Assuming records with subject_id are subject_staff, others are class_teacher
UPDATE public.faculty_subjects
SET assignment_type = CASE
    WHEN subject_id IS NOT NULL THEN 'subject_staff'
    ELSE 'class_teacher'
END
WHERE assignment_type IS NULL;

-- Step 2: Fix the get_student_class_teacher() function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_student_class_teacher(student_uuid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT fs.faculty_profile_id
  FROM public.students s
  JOIN public.classes c ON c.name = s.class_name
  JOIN public.faculty_subjects fs ON fs.class_id = c.id AND fs.section = s.section
  WHERE s.id = student_uuid
    AND fs.assignment_type = 'class_teacher'
  LIMIT 1;
$$;

-- Step 3: Verify the trigger exists (it should already be created)
-- ============================================================================
-- The trigger should already exist from leave_requests_rls_and_queries.sql
-- If not, uncomment the following:

/*
CREATE OR REPLACE FUNCTION public.assign_class_teacher_to_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Automatically assign the student's class teacher
  NEW.assigned_class_teacher_id := public.get_student_class_teacher(NEW.student_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_class_teacher ON public.leave_requests;

CREATE TRIGGER trigger_assign_class_teacher
BEFORE INSERT ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.assign_class_teacher_to_leave();
*/

-- Step 4: Backfill existing leave requests (optional)
-- ============================================================================
-- Update any existing leave requests that don't have assigned_class_teacher_id
UPDATE public.leave_requests lr
SET assigned_class_teacher_id = public.get_student_class_teacher(lr.student_id)
WHERE lr.assigned_class_teacher_id IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Check if assignment_type column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'faculty_subjects' 
  AND column_name = 'assignment_type';

-- 2. Check class teacher assignments
SELECT 
    fs.id,
    fs.assignment_type,
    p.full_name as faculty_name,
    c.name as class_name,
    fs.section
FROM public.faculty_subjects fs
JOIN public.profiles p ON p.id = fs.faculty_profile_id
JOIN public.classes c ON c.id = fs.class_id
WHERE fs.assignment_type = 'class_teacher'
ORDER BY c.name, fs.section;

-- 3. Test the function with a sample student
-- Replace 'sample-student-id' with an actual student ID from your database
-- SELECT public.get_student_class_teacher('sample-student-id');

-- 4. Check leave requests with assigned teachers
SELECT 
    lr.id,
    s.name as student_name,
    s.class_name,
    s.section,
    p.full_name as assigned_teacher,
    lr.status,
    lr.created_at
FROM public.leave_requests lr
JOIN public.students s ON s.id = lr.student_id
LEFT JOIN public.profiles p ON p.id = lr.assigned_class_teacher_id
ORDER BY lr.created_at DESC
LIMIT 10;

-- 5. Count pending leave requests by faculty
SELECT 
    p.full_name as faculty_name,
    COUNT(*) as pending_count
FROM public.leave_requests lr
JOIN public.profiles p ON p.id = lr.assigned_class_teacher_id
WHERE lr.status = 'Pending'
GROUP BY p.id, p.full_name
ORDER BY pending_count DESC;
