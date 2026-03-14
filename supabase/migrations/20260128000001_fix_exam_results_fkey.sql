-- Fix exam_results foreign key to reference exam_schedules instead of exams

-- Drop the old foreign key constraint that references exams table
ALTER TABLE public.exam_results
DROP CONSTRAINT IF EXISTS exam_results_exam_id_fkey;

-- Add new foreign key constraint that references exam_schedules table
ALTER TABLE public.exam_results
ADD CONSTRAINT exam_results_exam_id_fkey 
FOREIGN KEY (exam_id) REFERENCES public.exam_schedules(id) ON DELETE CASCADE;

-- Update the unique constraint to match
ALTER TABLE public.exam_results
DROP CONSTRAINT IF EXISTS exam_results_exam_id_student_id_subject_id_key;

ALTER TABLE public.exam_results
ADD CONSTRAINT exam_results_exam_id_student_id_subject_id_key 
UNIQUE (exam_id, student_id, subject_id);
