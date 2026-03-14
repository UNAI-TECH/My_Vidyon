-- Migration to enhance Exam and Marks system for the Marks Entry Workflow

-- 1. Enhance exams table
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS exam_type TEXT,
ADD COLUMN IF NOT EXISTS exam_display_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Enhance exam_results table to support workflow
ALTER TABLE public.exam_results
ADD COLUMN IF NOT EXISTS internal_marks DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS external_marks DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS total_marks DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, APPROVED, PUBLISHED
ADD COLUMN IF NOT EXISTS rejection_comment TEXT,
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS class_id TEXT,
ADD COLUMN IF NOT EXISTS section TEXT;

-- 3. Add RLS for faculty to manage results
DROP POLICY IF EXISTS "Faculty can manage their own subject marks" ON public.exam_results;
CREATE POLICY "Faculty can manage their own subject marks"
ON public.exam_results
FOR ALL
TO authenticated
USING (
    staff_id = auth.uid() 
    OR 
    EXISTS (
        SELECT 1 FROM staff_details 
        WHERE profile_id = auth.uid() AND (role = 'class_teacher' OR role = 'admin')
    )
);

-- 4. Ensure students can only see published marks
DROP POLICY IF EXISTS "Students see published results" ON public.exam_results;
CREATE POLICY "Students see published results"
ON public.exam_results
FOR SELECT
TO authenticated
USING (
    status = 'PUBLISHED' 
    AND 
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid() OR id = auth.uid())
);
