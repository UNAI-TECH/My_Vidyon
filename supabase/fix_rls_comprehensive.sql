-- =====================================================
-- COMPREHENSIVE RLS FIX FOR LEAVE SYSTEM
-- Resolves all visibility blockers for Parents and Faculty
-- =====================================================

-- 1. UNLOCK ALL METADATA AND JOIN TABLES (Read-only for Authenticated)
-- This ensures that frontend queries can always find relationships.

DROP POLICY IF EXISTS "Public view classes" ON public.classes;
CREATE POLICY "Public view classes" ON public.classes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public view subjects" ON public.subjects;
CREATE POLICY "Public view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public view faculty assignments" ON public.faculty_subjects;
CREATE POLICY "Public view faculty assignments" ON public.faculty_subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public view parents metadata" ON public.parents;
CREATE POLICY "Public view parents metadata" ON public.parents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public view student-parent links" ON public.student_parents;
CREATE POLICY "Public view student-parent links" ON public.student_parents FOR SELECT TO authenticated USING (true);

-- 2. ENHANCE STUDENTS VISIBILITY
-- Ensure faculty can see students in their assigned sections
-- Ensure parents can see their own children
DROP POLICY IF EXISTS "Faculty view assigned students" ON public.students;
CREATE POLICY "Faculty view assigned students" 
ON public.students FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.faculty_subjects fs
    JOIN public.classes c ON fs.class_id = c.id
    WHERE fs.faculty_profile_id = auth.uid()
    AND c.name = students.class_name
    AND fs.section = students.section
  )
  OR
  id IN (
    SELECT student_id FROM public.student_parents
    WHERE parent_id IN (
      SELECT id FROM public.parents WHERE profile_id = auth.uid()
    )
  )
);

-- 3. FIX LEAVE REQUESTS VISIBILITY
DROP POLICY IF EXISTS "Users view own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Faculty view class leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Faculty manage class leave requests" ON public.leave_requests;

-- Parent/Student View Policy (Simplified)
CREATE POLICY "Users view own leave requests" 
ON public.leave_requests FOR ALL TO authenticated
USING (
  student_id = auth.uid() 
  OR
  parent_id IN (
    SELECT id FROM public.parents WHERE profile_id = auth.uid()
  )
  OR
  student_id IN (
    SELECT id FROM public.students WHERE parent_id = auth.uid()
  )
);

-- Faculty View/Manage Policy (Unified & Simplified)
CREATE POLICY "Faculty manage class leave requests" 
ON public.leave_requests FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.faculty_subjects fs ON (
      fs.class_id IN (SELECT id FROM public.classes WHERE name = s.class_name)
      AND fs.section = s.section
    )
    WHERE s.id = leave_requests.student_id
    AND fs.faculty_profile_id = auth.uid()
    AND fs.assignment_type = 'class_teacher'
  )
);

-- 4. ENSURE RLS IS ENABLED ON ALL
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    RAISE NOTICE 'Comprehensive RLS Synchronization Complete';
END $$;
