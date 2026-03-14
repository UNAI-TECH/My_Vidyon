-- Create the faculty_subjects table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.faculty_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE, -- Assuming classes table exists
    section TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE, -- Nullable for class_teacher
    faculty_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('class_teacher', 'subject_staff')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime for this table
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_subjects;

-- Enable Row Level Security
ALTER TABLE public.faculty_subjects ENABLE ROW LEVEL SECURITY;

-- Policy: Institution Admins can do everything for their institution
DROP POLICY IF EXISTS "Institution Admins can manage faculty_subjects" ON public.faculty_subjects;
CREATE POLICY "Institution Admins can manage faculty_subjects"
ON public.faculty_subjects
FOR ALL
TO authenticated
USING (
    institution_id IN (
        SELECT institution_id 
        FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'institution' OR role = 'admin')
    )
);

-- Policy: Faculty can VIEW their own assignments
DROP POLICY IF EXISTS "Faculty can view their own assignments" ON public.faculty_subjects;
CREATE POLICY "Faculty can view their own assignments"
ON public.faculty_subjects
FOR SELECT
TO authenticated
USING (
    faculty_profile_id = auth.uid()
);

-- Policy: Faculty can VIEW assignments for classes they manage (e.g. as Class Teacher) - RECURSIVE / CAUSING ERRORS
-- Removed to fix "infinite recursion detected in policy" error.
DROP POLICY IF EXISTS "Class Teachers can view staff in their class" ON public.faculty_subjects;
/* 
-- This caused recursion. Disabled for now.
CREATE POLICY "Class Teachers can view staff in their class"
ON public.faculty_subjects
FOR SELECT
TO authenticated
USING (
    class_id IN (
        SELECT class_id 
        FROM public.faculty_subjects 
        WHERE faculty_profile_id = auth.uid() 
        AND assignment_type = 'class_teacher' 
        AND section = public.faculty_subjects.section
    )
); 
*/

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_faculty_subjects_faculty_id ON public.faculty_subjects(faculty_profile_id);
CREATE INDEX IF NOT EXISTS idx_faculty_subjects_institution_id ON public.faculty_subjects(institution_id);
CREATE INDEX IF NOT EXISTS idx_faculty_subjects_lookup ON public.faculty_subjects(class_id, section, subject_id);
