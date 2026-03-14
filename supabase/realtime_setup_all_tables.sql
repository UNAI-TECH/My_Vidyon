-- =====================================================
-- COMPREHENSIVE REAL-TIME SETUP FOR ALL TABLES
-- This script enables Supabase Realtime and sets up RLS policies
-- for all critical tables in the application
-- =====================================================

-- =====================================================
-- PHASE 1: ENABLE REALTIME PUBLICATION (CONDITIONAL)
-- Only adds tables to publication if they exist
-- =====================================================

-- Helper function to safely add table to publication
CREATE OR REPLACE FUNCTION add_table_to_realtime(table_name text, schema_name text DEFAULT 'public') 
RETURNS void AS $$
DECLARE
  t_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname = schema_name
      AND c.relname = table_name
  ) INTO t_exists;

  IF t_exists THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I', schema_name, table_name);
    RAISE NOTICE 'Added % to supabase_realtime', table_name;
  ELSE
    RAISE NOTICE 'Table % does not exist, skipping', table_name;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Table % already in publication', table_name;
END;
$$ LANGUAGE plpgsql;

-- Add tables to publication (only if they exist)
SELECT add_table_to_realtime('students');
SELECT add_table_to_realtime('student_attendance');
SELECT add_table_to_realtime('grades');
SELECT add_table_to_realtime('assignments');
SELECT add_table_to_realtime('submissions');
SELECT add_table_to_realtime('fee_payments');
SELECT add_table_to_realtime('profiles');
SELECT add_table_to_realtime('institutions');
SELECT add_table_to_realtime('staff_attendance');
SELECT add_table_to_realtime('leave_requests');
SELECT add_table_to_realtime('academic_events');
SELECT add_table_to_realtime('announcements');
SELECT add_table_to_realtime('faculty_subjects');
SELECT add_table_to_realtime('classes');
SELECT add_table_to_realtime('subjects');
SELECT add_table_to_realtime('timetable_slots');
SELECT add_table_to_realtime('notifications');

-- Clean up helper function
DROP FUNCTION IF EXISTS add_table_to_realtime(text, text);

-- =====================================================
-- PHASE 2: ENABLE RLS ON ALL TABLES (CONDITIONAL)
-- =====================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'students', 'student_attendance', 'grades', 'assignments', 
            'submissions', 'fee_payments', 'profiles', 'institutions',
            'staff_attendance', 'leave_requests', 'academic_events', 
            'announcements', 'faculty_subjects', 'classes', 'subjects',
            'timetable_slots', 'notifications'
        )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
        RAISE NOTICE 'Enabled RLS on %', r.tablename;
    END LOOP;
END $$;

-- =====================================================
-- PHASE 3: RLS POLICIES FOR STUDENTS TABLE
-- =====================================================

-- Students can view their own record
DROP POLICY IF EXISTS "Students view own record" ON public.students;
CREATE POLICY "Students view own record" 
ON public.students FOR SELECT TO authenticated
USING (id = auth.uid());

-- Parents can view their children's records (only if parent_id column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'parent_id'
    ) THEN
        DROP POLICY IF EXISTS "Parents view children" ON public.students;
        EXECUTE 'CREATE POLICY "Parents view children" 
        ON public.students FOR SELECT TO authenticated
        USING (parent_id = auth.uid())';
        RAISE NOTICE 'Created parent policy for students table';
    ELSE
        RAISE NOTICE 'Skipping parent policy - parent_id column does not exist';
    END IF;
END $$;

-- Institution admins can view their students
DROP POLICY IF EXISTS "Institution admins view students" ON public.students;
CREATE POLICY "Institution admins view students" 
ON public.students FOR ALL TO authenticated
USING (
  institution_id IN (
    SELECT institution_id FROM public.profiles
    WHERE id = auth.uid() AND (role = 'institution' OR role = 'admin')
  )
);

-- Faculty can view students in their classes
DROP POLICY IF EXISTS "Faculty view their students" ON public.students;
CREATE POLICY "Faculty view their students" 
ON public.students FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.faculty_subjects fs
    JOIN public.classes c ON fs.class_id = c.id
    WHERE fs.faculty_profile_id = auth.uid()
    AND c.name = students.class_name
    AND fs.section = students.section
  )
);

-- =====================================================
-- PHASE 4: RLS POLICIES FOR STUDENT_ATTENDANCE
-- =====================================================

DROP POLICY IF EXISTS "Students view own attendance" ON public.student_attendance;
CREATE POLICY "Students view own attendance" 
ON public.student_attendance FOR SELECT TO authenticated
USING (student_id = auth.uid());

-- Parents can view children attendance (conditional on parent_id existence)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'parent_id'
    ) THEN
        DROP POLICY IF EXISTS "Parents view children attendance" ON public.student_attendance;
        EXECUTE 'CREATE POLICY "Parents view children attendance" 
        ON public.student_attendance FOR SELECT TO authenticated
        USING (
          student_id IN (
            SELECT id FROM public.students WHERE parent_id = auth.uid()
          )
        )';
        RAISE NOTICE 'Created parent policy for student_attendance';
    END IF;
END $$;

DROP POLICY IF EXISTS "Institution manages attendance" ON public.student_attendance;
CREATE POLICY "Institution manages attendance" 
ON public.student_attendance FOR ALL TO authenticated
USING (
  institution_id IN (
    SELECT institution_id FROM public.profiles
    WHERE id = auth.uid() AND (role = 'institution' OR role = 'admin' OR role = 'faculty')
  )
);

-- =====================================================
-- PHASE 5: RLS POLICIES FOR GRADES
-- =====================================================

DROP POLICY IF EXISTS "Students view own grades" ON public.grades;
CREATE POLICY "Students view own grades" 
ON public.grades FOR SELECT TO authenticated
USING (student_id = auth.uid());

-- Parents can view children grades (conditional on parent_id existence)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'parent_id'
    ) THEN
        DROP POLICY IF EXISTS "Parents view children grades" ON public.grades;
        EXECUTE 'CREATE POLICY "Parents view children grades" 
        ON public.grades FOR SELECT TO authenticated
        USING (
          student_id IN (
            SELECT id FROM public.students WHERE parent_id = auth.uid()
          )
        )';
        RAISE NOTICE 'Created parent policy for grades';
    END IF;
END $$;

DROP POLICY IF EXISTS "Institution manages grades" ON public.grades;
CREATE POLICY "Institution manages grades" 
ON public.grades FOR ALL TO authenticated
USING (
  institution_id IN (
    SELECT institution_id FROM public.profiles
    WHERE id = auth.uid() AND (role = 'institution' OR role = 'admin' OR role = 'faculty')
  )
);

-- =====================================================
-- PHASE 6: RLS POLICIES FOR ASSIGNMENTS
-- =====================================================

DROP POLICY IF EXISTS "Students view assignments" ON public.assignments;
CREATE POLICY "Students view assignments" 
ON public.assignments FOR SELECT TO authenticated
USING (
  class_id IN (
    SELECT c.id FROM public.classes c
    JOIN public.students s ON c.name = s.class_name
    WHERE s.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Institution manages assignments" ON public.assignments;
CREATE POLICY "Institution manages assignments" 
ON public.assignments FOR ALL TO authenticated
USING (
  institution_id IN (
    SELECT institution_id FROM public.profiles
    WHERE id = auth.uid() AND (role = 'institution' OR role = 'admin' OR role = 'faculty')
  )
);

-- =====================================================
-- PHASE 7: RLS POLICIES FOR SUBMISSIONS
-- =====================================================

DROP POLICY IF EXISTS "Students manage own submissions" ON public.submissions;
CREATE POLICY "Students manage own submissions" 
ON public.submissions FOR ALL TO authenticated
USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Faculty view submissions" ON public.submissions;
CREATE POLICY "Faculty view submissions" 
ON public.submissions FOR SELECT TO authenticated
USING (
  assignment_id IN (
    SELECT id FROM public.assignments
    WHERE teacher_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Institution views submissions" ON public.submissions;
CREATE POLICY "Institution views submissions" 
ON public.submissions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'institution' OR role = 'admin')
  )
);

-- =====================================================
-- PHASE 8: RLS POLICIES FOR FEE_PAYMENTS
-- =====================================================

DROP POLICY IF EXISTS "Students view own fees" ON public.fee_payments;
CREATE POLICY "Students view own fees" 
ON public.fee_payments FOR SELECT TO authenticated
USING (student_id = auth.uid());

-- Parents can view children fees (conditional on parent_id existence)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'parent_id'
    ) THEN
        DROP POLICY IF EXISTS "Parents view children fees" ON public.fee_payments;
        EXECUTE 'CREATE POLICY "Parents view children fees" 
        ON public.fee_payments FOR SELECT TO authenticated
        USING (
          student_id IN (
            SELECT id FROM public.students WHERE parent_id = auth.uid()
          )
        )';
        RAISE NOTICE 'Created parent policy for fee_payments';
    END IF;
END $$;

DROP POLICY IF EXISTS "Institution manages fees" ON public.fee_payments;
CREATE POLICY "Institution manages fees" 
ON public.fee_payments FOR ALL TO authenticated
USING (
  institution_id IN (
    SELECT institution_id FROM public.profiles
    WHERE id = auth.uid() AND (role = 'institution' OR role = 'admin')
  )
);

-- =====================================================
-- PHASE 9: RLS POLICIES FOR PROFILES
-- =====================================================

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" 
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" 
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Institution admins view their users" ON public.profiles;
CREATE POLICY "Institution admins view their users" 
ON public.profiles FOR SELECT TO authenticated
USING (
  institution_id IN (
    SELECT institution_id FROM public.profiles
    WHERE id = auth.uid() AND (role = 'institution' OR role = 'admin')
  )
);

-- =====================================================
-- PHASE 10: RLS POLICIES FOR LEAVE_REQUESTS
-- =====================================================

-- Students and parents can view/manage own leave requests (conditional)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'students' 
        AND column_name = 'parent_id'
    ) THEN
        DROP POLICY IF EXISTS "Users view own leave requests" ON public.leave_requests;
        EXECUTE 'CREATE POLICY "Users view own leave requests" 
        ON public.leave_requests FOR ALL TO authenticated
        USING (
          student_id = auth.uid() OR
          student_id IN (
            SELECT id FROM public.students WHERE parent_id = auth.uid()
          )
        )';
        RAISE NOTICE 'Created user/parent policy for leave_requests';
    ELSE
        -- Fallback if parent_id doesn't exist
        DROP POLICY IF EXISTS "Users view own leave requests" ON public.leave_requests;
        EXECUTE 'CREATE POLICY "Users view own leave requests" 
        ON public.leave_requests FOR ALL TO authenticated
        USING (student_id = auth.uid())';
        RAISE NOTICE 'Created student-only policy for leave_requests (no parent_id)';
    END IF;
END $$;

-- Faculty can view class leave requests
DROP POLICY IF EXISTS "Faculty view class leave requests" ON public.leave_requests;
CREATE POLICY "Faculty view class leave requests" 
ON public.leave_requests FOR SELECT TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM public.students s
    JOIN public.faculty_subjects fs ON fs.class_id IN (
      SELECT id FROM public.classes WHERE name = s.class_name
    )
    WHERE fs.faculty_profile_id = auth.uid()
    AND fs.assignment_type = 'class_teacher'
  )
);

DROP POLICY IF EXISTS "Institution manages leave requests" ON public.leave_requests;
CREATE POLICY "Institution manages leave requests" 
ON public.leave_requests FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'institution' OR role = 'admin')
  )
);

-- =====================================================
-- PHASE 11: INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_students_parent_id ON public.students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_institution_id ON public.students(institution_id);
CREATE INDEX IF NOT EXISTS idx_students_class_section ON public.students(class_name, section);

CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.student_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_institution ON public.student_attendance(institution_id);

CREATE INDEX IF NOT EXISTS idx_grades_student_id ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_institution ON public.grades(institution_id);

CREATE INDEX IF NOT EXISTS idx_assignments_class ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.assignments(teacher_id);

CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(assignment_id);

CREATE INDEX IF NOT EXISTS idx_fees_student ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_institution ON public.fee_payments(institution_id);

CREATE INDEX IF NOT EXISTS idx_profiles_institution ON public.profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =====================================================
-- END OF SETUP
-- =====================================================
