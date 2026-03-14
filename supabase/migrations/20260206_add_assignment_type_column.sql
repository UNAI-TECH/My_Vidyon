-- Migration: Add assignment_type column to faculty_subjects table
-- This ensures the column exists for distinguishing class teachers from subject staff

-- Add assignment_type column if it doesn't exist
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
