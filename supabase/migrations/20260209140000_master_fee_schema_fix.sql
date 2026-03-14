-- ====================================================================
-- MASTER MIGRATION: Harmonize Fee & Student Schema for Parent Visibility
-- ====================================================================
-- Applies the schema requested by the user and ensures RLS/Realtime consistency.

-- 1. Helper Functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.tr_log_new_student()
RETURNS TRIGGER AS $$
BEGIN
    -- Basic logging placeholder
    RAISE NOTICE 'New student registered: %', NEW.name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Tables Harmonization

-- [SAFETY BLOCK] Drop policies on students and exam_schedules to allow type change
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    -- Drop policies on students
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'students' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.students', policy_record.policyname);
    END LOOP;

    -- Drop policies on exam_schedules (they join with students)
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'exam_schedules' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.exam_schedules', policy_record.policyname);
    END LOOP;

    -- Drop policies on exam_schedule_entries (they join with students via exam_schedules)
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'exam_schedule_entries' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.exam_schedule_entries', policy_record.policyname);
    END LOOP;
END $$;

-- Students Table Configuration
CREATE TABLE IF NOT EXISTS public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  register_number TEXT UNIQUE,
  class_name TEXT,
  section TEXT,
  parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_name TEXT,
  parent_email TEXT,
  parent_contact TEXT,
  parent_relation TEXT,
  email TEXT,
  phone TEXT,
  dob DATE,
  gender TEXT,
  blood_group TEXT,
  address TEXT,
  city TEXT,
  zip_code TEXT,
  academic_year TEXT DEFAULT '2025-26',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stop_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Now safe to alter type
ALTER TABLE public.students ALTER COLUMN institution_id TYPE TEXT;
ALTER TABLE public.students ALTER COLUMN parent_id TYPE UUID;

-- Student Fees Table Configuration
-- [SAFETY BLOCK] Drop all policies on student_fees to allow type change
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'student_fees' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_fees', policy_record.policyname);
    END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.student_fees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  amount_due NUMERIC(10, 2) NOT NULL,
  amount_paid NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue')),
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now safe to alter type
ALTER TABLE public.student_fees ALTER COLUMN institution_id TYPE TEXT;

-- Notifications Table Configuration
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Student Leave Requests Table Configuration
CREATE TABLE IF NOT EXISTS public.student_leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Triggers & Realtime

-- Replica Identity for Realtime (Fixes "CLOSED" status)
ALTER TABLE public.students REPLICA IDENTITY FULL;
-- Check if student_parents exists before altering
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'student_parents') THEN ALTER TABLE public.student_parents REPLICA IDENTITY FULL; END IF; END $$;
ALTER TABLE public.student_leave_requests REPLICA IDENTITY FULL;
ALTER TABLE public.student_fees REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Triggers
DROP TRIGGER IF EXISTS on_student_created ON public.students;
CREATE TRIGGER on_student_created AFTER INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION tr_log_new_student();

DROP TRIGGER IF EXISTS update_student_fees_updated_at ON public.student_fees;
CREATE TRIGGER update_student_fees_updated_at BEFORE UPDATE ON public.student_fees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Secure RLS Policies

-- Student Fees Policies
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institution admins can manage student fees" ON public.student_fees;
CREATE POLICY "Institution admins can manage student fees" ON public.student_fees FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.institutions i ON i.institution_id = p.institution_id
        WHERE p.id = auth.uid()
        AND (i.institution_id = student_fees.institution_id)
        AND p.role IN ('admin', 'accountant', 'institution')
    )
);

DROP POLICY IF EXISTS "Parents/Students can view their fees" ON public.student_fees;
CREATE POLICY "Parents/Students can view their fees" ON public.student_fees FOR SELECT TO authenticated
USING (
    -- Option A: Direct parent_id in students table
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_fees.student_id
        AND s.parent_id = auth.uid()
    )
    OR
    -- Option B: Link via student_parents join table
    EXISTS (
        SELECT 1 FROM public.student_parents sp
        JOIN public.parents p ON p.id = sp.parent_id
        WHERE sp.student_id = student_fees.student_id
        AND p.profile_id = auth.uid()
    )
    OR
    -- Option C: Email fallback (ILIKE for case-insensitive)
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_fees.student_id
        AND s.parent_email ILIKE (auth.jwt() ->> 'email')
    )
    OR
    -- Option D: Self view for students
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_fees.student_id
        AND s.email ILIKE (auth.jwt() ->> 'email')
    )
);

-- Notifications Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Restore exam_schedules policies
ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can view exam schedules for their institution"
ON public.exam_schedules FOR SELECT TO authenticated
USING (institution_id = (auth.jwt() -> 'user_metadata' ->> 'institution_id'));

CREATE POLICY "Faculty can create exam schedules"
ON public.exam_schedules FOR INSERT TO authenticated
WITH CHECK (
    institution_id = (auth.jwt() -> 'user_metadata' ->> 'institution_id') AND
    created_by = auth.uid()
);

CREATE POLICY "Faculty can update their own exam schedules"
ON public.exam_schedules FOR UPDATE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Faculty can delete their own exam schedules"
ON public.exam_schedules FOR DELETE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Students can view exam schedules for their class"
ON public.exam_schedules FOR SELECT TO authenticated
USING (
    institution_id = (auth.jwt() -> 'user_metadata' ->> 'institution_id') AND
    class_id = (auth.jwt() -> 'user_metadata' ->> 'class_id') AND
    section = (auth.jwt() -> 'user_metadata' ->> 'section')
);

CREATE POLICY "Parents can view exam schedules for their children"
ON public.exam_schedules FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.students
        WHERE students.parent_id = auth.uid()
        AND students.class_name = exam_schedules.class_id
        AND students.section = exam_schedules.section
        AND students.institution_id = exam_schedules.institution_id
    )
);

-- Restore exam_schedule_entries policies
ALTER TABLE public.exam_schedule_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exam schedule entries"
ON public.exam_schedule_entries FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.exam_schedules
        WHERE exam_schedules.id = exam_schedule_entries.exam_schedule_id
    )
);

CREATE POLICY "Parents can view exam schedule entries for their children"
ON public.exam_schedule_entries FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.exam_schedules
        JOIN public.students ON students.class_name = exam_schedules.class_id 
           AND students.section = exam_schedules.section 
           AND students.institution_id = exam_schedules.institution_id
        WHERE exam_schedules.id = exam_schedule_entries.exam_schedule_id
        AND students.parent_id = auth.uid()
    )
);
