-- ============================================================================
-- COMPLETE PRODUCTION FIX - Apply this after confirming diagnosis
-- ============================================================================
-- This script will fix the leave request routing issue in production
-- Run this in Supabase SQL Editor ONLY AFTER reviewing diagnostic results
-- ============================================================================

-- Step 1: Add assignment_type column to faculty_subjects (if missing)
-- ============================================================================
DO $$ 
BEGIN
    -- Check if column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'faculty_subjects' 
          AND column_name = 'assignment_type'
    ) THEN
        ALTER TABLE public.faculty_subjects
        ADD COLUMN assignment_type TEXT CHECK (assignment_type IN ('class_teacher', 'subject_staff'));
        
        RAISE NOTICE 'Added assignment_type column to faculty_subjects';
    ELSE
        RAISE NOTICE 'assignment_type column already exists';
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_faculty_subjects_assignment_type
ON public.faculty_subjects(assignment_type, class_id, section);

-- Step 2: Update existing faculty_subjects records
-- ============================================================================
-- Set assignment_type based on whether subject_id is present
UPDATE public.faculty_subjects
SET assignment_type = CASE
    WHEN subject_id IS NOT NULL THEN 'subject_staff'
    ELSE 'class_teacher'
END
WHERE assignment_type IS NULL;

-- Step 3: Fix the get_student_class_teacher() function
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

-- Step 4: Backfill existing leave requests
-- ============================================================================
-- Update any existing leave requests that don't have assigned_class_teacher_id
UPDATE public.leave_requests lr
SET assigned_class_teacher_id = public.get_student_class_teacher(lr.student_id)
WHERE lr.assigned_class_teacher_id IS NULL;

-- Step 5: Verify the fix
-- ============================================================================
-- Check how many leaves were updated
SELECT 
    COUNT(*) as total_leaves,
    COUNT(assigned_class_teacher_id) as leaves_with_teacher,
    COUNT(*) - COUNT(assigned_class_teacher_id) as leaves_without_teacher
FROM public.leave_requests;

-- Check a sample of updated leaves
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

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ Fix applied successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Refresh the Faculty Portal in your browser';
    RAISE NOTICE '2. The leave requests should now appear in the list';
    RAISE NOTICE '3. Test submitting a new leave request to verify the trigger works';
END $$;
