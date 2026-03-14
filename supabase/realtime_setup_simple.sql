-- =====================================================
-- SAFER REALTIME SETUP - Only creates policies for existing columns
-- Run this AFTER create_all_tables.sql
-- =====================================================

-- =====================================================
-- PHASE 1: ENABLE REALTIME PUBLICATION (CONDITIONAL)
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

-- Add tables to publication
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

DROP FUNCTION IF EXISTS add_table_to_realtime(text, text);

-- =====================================================
-- PHASE 2: ENABLE RLS (CONDITIONAL)
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
-- PHASE 3: BASIC RLS POLICIES (ALWAYS SAFE)
-- =====================================================

-- These policies only reference columns that MUST exist (primary keys, etc.)

-- Students - basic policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
        DROP POLICY IF EXISTS "Students view own record" ON public.students;
        EXECUTE 'CREATE POLICY "Students view own record" ON public.students FOR SELECT TO authenticated USING (id = auth.uid())';
        
        DROP POLICY IF EXISTS "Institution admins manage students" ON public.students;
        EXECUTE 'CREATE POLICY "Institution admins manage students" ON public.students FOR ALL TO authenticated 
        USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN (''institution'', ''admin'')))';
        
        RAISE NOTICE 'Created basic policies for students';
    END IF;
END $$;

-- Profiles - basic policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
        EXECUTE 'CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid())';
        
        DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
        EXECUTE 'CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid())';
        
        RAISE NOTICE 'Created basic policies for profiles';
    END IF;
END $$;

-- Student Attendance - basic policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_attendance') THEN
        DROP POLICY IF EXISTS "Students view own attendance" ON public.student_attendance;
        EXECUTE 'CREATE POLICY "Students view own attendance" ON public.student_attendance FOR SELECT TO authenticated USING (student_id = auth.uid())';
        
        DROP POLICY IF EXISTS "Institution manages attendance" ON public.student_attendance;
        EXECUTE 'CREATE POLICY "Institution manages attendance" ON public.student_attendance FOR ALL TO authenticated 
        USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN (''institution'', ''admin'', ''faculty'')))';
        
        RAISE NOTICE 'Created basic policies for student_attendance';
    END IF;
END $$;

-- Grades - basic policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'grades') THEN
        DROP POLICY IF EXISTS "Students view own grades" ON public.grades;
        EXECUTE 'CREATE POLICY "Students view own grades" ON public.grades FOR SELECT TO authenticated USING (student_id = auth.uid())';
        
        DROP POLICY IF EXISTS "Institution manages grades" ON public.grades;
        EXECUTE 'CREATE POLICY "Institution manages grades" ON public.grades FOR ALL TO authenticated 
        USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN (''institution'', ''admin'', ''faculty'')))';
        
        RAISE NOTICE 'Created basic policies for grades';
    END IF;
END $$;

-- Assignments - basic policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assignments') THEN
        DROP POLICY IF EXISTS "Institution manages assignments" ON public.assignments;
        EXECUTE 'CREATE POLICY "Institution manages assignments" ON public.assignments FOR ALL TO authenticated 
        USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN (''institution'', ''admin'', ''faculty'')))';
        
        RAISE NOTICE 'Created basic policies for assignments';
    END IF;
END $$;

-- Submissions - basic policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'submissions') THEN
        DROP POLICY IF EXISTS "Students manage own submissions" ON public.submissions;
        EXECUTE 'CREATE POLICY "Students manage own submissions" ON public.submissions FOR ALL TO authenticated USING (student_id = auth.uid())';
        
        RAISE NOTICE 'Created basic policies for submissions';
    END IF;
END $$;

-- Fee Payments - basic policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fee_payments') THEN
        DROP POLICY IF EXISTS "Students view own fees" ON public.fee_payments;
        EXECUTE 'CREATE POLICY "Students view own fees" ON public.fee_payments FOR SELECT TO authenticated USING (student_id = auth.uid())';
        
        DROP POLICY IF EXISTS "Institution manages fees" ON public.fee_payments;
        EXECUTE 'CREATE POLICY "Institution manages fees" ON public.fee_payments FOR ALL TO authenticated 
        USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN (''institution'', ''admin'')))';
        
        RAISE NOTICE 'Created basic policies for fee_payments';
    END IF;
END $$;

-- Notifications - basic policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
        EXECUTE 'CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid())';
        
        DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
        EXECUTE 'CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid())';
        
        RAISE NOTICE 'Created basic policies for notifications';
    END IF;
END $$;

-- Leave Requests - basic policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leave_requests') THEN
        DROP POLICY IF EXISTS "Students view own leave requests" ON public.leave_requests;
        EXECUTE 'CREATE POLICY "Students view own leave requests" ON public.leave_requests FOR ALL TO authenticated USING (student_id = auth.uid())';
        
        DROP POLICY IF EXISTS "Institution manages leave requests" ON public.leave_requests;
        EXECUTE 'CREATE POLICY "Institution manages leave requests" ON public.leave_requests FOR ALL TO authenticated 
        USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''institution'', ''admin'')))';
        
        RAISE NOTICE 'Created basic policies for leave_requests';
    END IF;
END $$;

-- Academic Events - basic policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'academic_events') THEN
        DROP POLICY IF EXISTS "Everyone views events" ON public.academic_events;
        EXECUTE 'CREATE POLICY "Everyone views events" ON public.academic_events FOR SELECT TO authenticated USING (true)';
        
        DROP POLICY IF EXISTS "Institution manages events" ON public.academic_events;
        EXECUTE 'CREATE POLICY "Institution manages events" ON public.academic_events FOR ALL TO authenticated 
        USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN (''institution'', ''admin'')))';
        
        RAISE NOTICE 'Created basic policies for academic_events';
    END IF;
END $$;

-- Announcements - basic policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcements') THEN
        DROP POLICY IF EXISTS "Everyone views announcements" ON public.announcements;
        EXECUTE 'CREATE POLICY "Everyone views announcements" ON public.announcements FOR SELECT TO authenticated USING (true)';
        
        DROP POLICY IF EXISTS "Institution manages announcements" ON public.announcements;
        EXECUTE 'CREATE POLICY "Institution manages announcements" ON public.announcements FOR ALL TO authenticated 
        USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN (''institution'', ''admin'')))';
        
        RAISE NOTICE 'Created basic policies for announcements';
    END IF;
END $$;

-- Faculty Subjects - basic policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'faculty_subjects') THEN
        DROP POLICY IF EXISTS "Faculty view own assignments" ON public.faculty_subjects;
        EXECUTE 'CREATE POLICY "Faculty view own assignments" ON public.faculty_subjects FOR SELECT TO authenticated USING (faculty_profile_id = auth.uid())';
        
        DROP POLICY IF EXISTS "Institution manages faculty_subjects" ON public.faculty_subjects;
        EXECUTE 'CREATE POLICY "Institution manages faculty_subjects" ON public.faculty_subjects FOR ALL TO authenticated 
        USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN (''institution'', ''admin'')))';
        
        RAISE NOTICE 'Created basic policies for faculty_subjects';
    END IF;
END $$;

-- Timetable Slots - basic policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'timetable_slots') THEN
        DROP POLICY IF EXISTS "Everyone views timetable" ON public.timetable_slots;
        EXECUTE 'CREATE POLICY "Everyone views timetable" ON public.timetable_slots FOR SELECT TO authenticated USING (true)';
        
        DROP POLICY IF EXISTS "Institution manages timetable" ON public.timetable_slots;
        EXECUTE 'CREATE POLICY "Institution manages timetable" ON public.timetable_slots FOR ALL TO authenticated 
        USING (institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN (''institution'', ''admin'', ''faculty'')))';
        
        RAISE NOTICE 'Created basic policies for timetable_slots';
    END IF;
END $$;

-- =====================================================
-- DONE - Basic real-time setup complete
-- =====================================================

RAISE NOTICE '==============================================';
RAISE NOTICE 'Real-time setup complete!';
RAISE NOTICE 'Basic RLS policies created for existing tables';
RAISE NOTICE '==============================================';
