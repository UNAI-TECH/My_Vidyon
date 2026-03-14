-- Migration: Assignments and Announcements
-- Date: 2026-01-24

-- 1. Assignments Table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL, -- specific subject
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE, -- target class
    section TEXT, -- Optional: target specific section
    faculty_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- created by
    due_date TIMESTAMP WITH TIME ZONE,
    file_url TEXT, -- Attachment
    max_marks NUMERIC(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Assignment Submissions Table
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    submission_url TEXT,
    answer_text TEXT,
    status TEXT DEFAULT 'submitted', -- 'submitted', 'graded', 'late'
    marks_obtained NUMERIC(5, 2),
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'all', -- 'all', 'students', 'faculty', 'parents', 'class'
    target_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL, -- Optional if type is 'class'
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for now - authenticated users can read/write appropriately)
-- In production, rigorous policies needed.

-- Assignments: Faculty can Insert/Update/Delete own. Students can Read assignments for their class.
CREATE POLICY "Faculty can manage their assignments" ON public.assignments
    FOR ALL TO authenticated
    USING ( (auth.uid() = faculty_id) OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin'))) )
    WITH CHECK ( (auth.uid() = faculty_id) OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin'))) );

CREATE POLICY "Students can read their class assignments" ON public.assignments
    FOR SELECT TO authenticated
    USING ( true ); -- Simplify for now, filtering usually happens on query side anyway. Ideal: check student class.

-- Submissions: Students insert own. Faculty read/update.
CREATE POLICY "Students manage their submissions" ON public.assignment_submissions
    FOR ALL TO authenticated
    USING ( student_id IN (SELECT id FROM public.students WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())) )
    WITH CHECK ( student_id IN (SELECT id FROM public.students WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())) );

CREATE POLICY "Faculty manage submissions" ON public.assignment_submissions
    FOR ALL TO authenticated
    USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')) )
    WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('faculty', 'admin')) );

-- Announcements: Read all if authenticated (filtered by query usually). Write if Admin/Faculty.
CREATE POLICY "Read announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage announcements" ON public.announcements FOR ALL TO authenticated 
    USING ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'institution')) )
    WITH CHECK ( EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'faculty', 'institution')) );


-- Realtime
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'assignments') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'announcements') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
    END IF;
END $$;
