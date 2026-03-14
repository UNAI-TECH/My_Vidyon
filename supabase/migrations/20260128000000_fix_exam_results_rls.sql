-- Fix RLS policies for exam_results to allow faculty to insert marks

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Faculty can manage their own subject marks" ON public.exam_results;
DROP POLICY IF EXISTS "Allow read for auth" ON public.exam_results;

-- Allow faculty to insert marks (WITH CHECK for INSERT)
CREATE POLICY "Faculty can insert marks"
ON public.exam_results
FOR INSERT
TO authenticated
WITH CHECK (
    -- Check if user is faculty/admin in the institution
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('faculty', 'admin', 'institution')
    )
);

-- Allow faculty to update their own marks or if they're class teacher/admin
CREATE POLICY "Faculty can update marks"
ON public.exam_results
FOR UPDATE
TO authenticated
USING (
    staff_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.staff_details
        WHERE profile_id = auth.uid()
        AND (role ILIKE '%class%teacher%' OR role ILIKE '%admin%')
    )
    OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'institution')
    )
)
WITH CHECK (
    staff_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.staff_details
        WHERE profile_id = auth.uid()
        AND (role ILIKE '%class%teacher%' OR role ILIKE '%admin%')
    )
    OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'institution')
    )
);

-- Allow faculty and students to view marks based on role
CREATE POLICY "Faculty can view all marks"
ON public.exam_results
FOR SELECT
TO authenticated
USING (
    -- Faculty can see all marks in their institution
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('faculty', 'admin', 'institution')
    )
    OR
    -- Students can only see published marks
    (
        status = 'PUBLISHED'
        AND student_id = auth.uid()
    )
);

-- Allow faculty to delete marks  
CREATE POLICY "Faculty can delete marks"
ON public.exam_results
FOR DELETE
TO authenticated
USING (
    staff_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'institution')
    )
);
