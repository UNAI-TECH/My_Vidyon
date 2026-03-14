-- =====================================================
-- FINAL COMPREHENSIVE RLS FIX
-- Resolves visibility issues for Parents and Faculty
-- =====================================================

-- 1. UNLOCK METADATA TABLES (Read-only for all authenticated users)
-- Tables like faculty_subjects, classes, and subjects must be readable
-- for the RLS joins and frontend lookups to work.

DROP POLICY IF EXISTS "Authenticated users view faculty assignments" ON public.faculty_subjects;
CREATE POLICY "Authenticated users view faculty assignments" 
ON public.faculty_subjects FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users view classes" ON public.classes;
CREATE POLICY "Authenticated users view classes" 
ON public.classes FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users view subjects" ON public.subjects;
CREATE POLICY "Authenticated users view subjects" 
ON public.subjects FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users view student_parents" ON public.student_parents;
CREATE POLICY "Authenticated users view student_parents" 
ON public.student_parents FOR SELECT TO authenticated
USING (true);

-- 2. RE-FIX LEAVE REQUESTS POLICIES
DROP POLICY IF EXISTS "Users view own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Faculty view class leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Faculty manage class leave requests" ON public.leave_requests;

-- Parent/Student View Policy
CREATE POLICY "Users view own leave requests" 
ON public.leave_requests FOR ALL TO authenticated
USING (
  -- User is the student
  student_id = auth.uid() 
  OR
  -- User is a parent linked directly in students table
  student_id IN (
    SELECT id FROM public.students WHERE parent_id = auth.uid()
  )
  OR
  -- User is a parent linked via student_parents join table
  student_id IN (
    SELECT student_id FROM public.student_parents 
    WHERE parent_id IN (
      SELECT id FROM public.parents WHERE profile_id = auth.uid()
    )
  )
);

-- Faculty View Policy
CREATE POLICY "Faculty view class leave requests" 
ON public.leave_requests FOR SELECT TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    WHERE s.class_name IN (
        SELECT c.name FROM public.classes c
        JOIN public.faculty_subjects fs ON fs.class_id = c.id
        WHERE fs.faculty_profile_id = auth.uid()
        AND fs.assignment_type = 'class_teacher'
        AND fs.section = s.section
    )
  )
);

-- Faculty Manage Policy
CREATE POLICY "Faculty manage class leave requests" 
ON public.leave_requests FOR UPDATE TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    WHERE s.class_name IN (
        SELECT c.name FROM public.classes c
        JOIN public.faculty_subjects fs ON fs.class_id = c.id
        WHERE fs.faculty_profile_id = auth.uid()
        AND fs.assignment_type = 'class_teacher'
        AND fs.section = s.section
    )
  )
);

-- 3. ENSURE STUDENTS TABLE ALLOWS PARENT VIEWING (via join table)
DROP POLICY IF EXISTS "Parents view children via link" ON public.students;
CREATE POLICY "Parents view children via link" 
ON public.students FOR SELECT TO authenticated
USING (
  id IN (
    SELECT student_id FROM public.student_parents
    WHERE parent_id IN (
      SELECT id FROM public.parents WHERE profile_id = auth.uid()
    )
  )
);

-- 4. ENSURE RLS IS ACTIVE
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    RAISE NOTICE 'RLS Policies synchronized successfully';
END $$;
