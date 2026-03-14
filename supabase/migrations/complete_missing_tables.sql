-- FINAL COMPLETE DATABASE FIX
-- Run this AFTER safe_database_fix.sql to create all remaining tables

-- 1. Create assignments table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='assignments') THEN
    CREATE TABLE public.assignments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      subject TEXT NOT NULL,
      subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
      class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
      teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      due_date TIMESTAMPTZ NOT NULL,
      total_marks DECIMAL DEFAULT 100,
      attachment_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view assignments from their institution"
      ON public.assignments FOR SELECT
      USING (
        institution_id IN (
          SELECT i.id 
          FROM public.institutions i
          INNER JOIN public.profiles p ON p.institution_id = i.institution_id
          WHERE p.id = auth.uid()
        )
      );
    
    RAISE NOTICE 'Created assignments table';
  ELSE
    RAISE NOTICE 'assignments table already exists';
  END IF;
END $$;

-- 2. Create submissions table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='submissions') THEN
    CREATE TABLE public.submissions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
      submitted_at TIMESTAMPTZ DEFAULT now(),
      submission_url TEXT,
      submission_text TEXT,
      grade DECIMAL,
      feedback TEXT,
      status TEXT CHECK (status IN ('pending', 'submitted', 'graded', 'late')) DEFAULT 'submitted',
      graded_at TIMESTAMPTZ,
      graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(assignment_id, student_id)
    );
    
    ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view submissions from their institution"
      ON public.submissions FOR SELECT
      USING (
        assignment_id IN (
          SELECT a.id FROM public.assignments a
          WHERE a.institution_id IN (
            SELECT i.id 
            FROM public.institutions i
            INNER JOIN public.profiles p ON p.institution_id = i.institution_id
            WHERE p.id = auth.uid()
          )
        )
      );
    
    RAISE NOTICE 'Created submissions table';
  ELSE
    RAISE NOTICE 'submissions table already exists';
  END IF;
END $$;

-- 3. Create student_attendance table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='student_attendance') THEN
    CREATE TABLE public.student_attendance (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
      attendance_date DATE NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
      marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      remarks TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(student_id, attendance_date)
    );
    
    ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view attendance from their institution"
      ON public.student_attendance FOR SELECT
      USING (
        institution_id IN (
          SELECT i.id 
          FROM public.institutions i
          INNER JOIN public.profiles p ON p.institution_id = i.institution_id
          WHERE p.id = auth.uid()
        )
      );
    
    RAISE NOTICE 'Created student_attendance table';
  ELSE
    RAISE NOTICE 'student_attendance table already exists';
  END IF;
END $$;

-- 4. Create announcements table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='announcements') THEN
    CREATE TABLE public.announcements (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target_audience TEXT,
      priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
      published_at TIMESTAMPTZ DEFAULT now(),
      expires_at TIMESTAMPTZ,
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view announcements from their institution"
      ON public.announcements FOR SELECT
      USING (
        institution_id IN (
          SELECT i.id 
          FROM public.institutions i
          INNER JOIN public.profiles p ON p.institution_id = i.institution_id
          WHERE p.id = auth.uid()
        )
      );
    
    RAISE NOTICE 'Created announcements table';
  ELSE
    RAISE NOTICE 'announcements table already exists';
  END IF;
END $$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_institution ON public.assignments(institution_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student ON public.student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON public.student_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_announcements_institution ON public.announcements(institution_id);

-- 6. Verify all tables exist
DO $$
DECLARE
  missing_tables TEXT := '';
  table_count INT := 0;
BEGIN
  -- Check for required tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'institutions', 'profiles', 'students', 'classes', 'subjects',
    'assignments', 'submissions', 'grades', 'academic_events',
    'student_attendance', 'announcements'
  );
  
  RAISE NOTICE '✅ Found % out of 11 required tables', table_count;
  
  -- List missing tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='institutions') THEN
    missing_tables := missing_tables || 'institutions, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='profiles') THEN
    missing_tables := missing_tables || 'profiles, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='students') THEN
    missing_tables := missing_tables || 'students, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='classes') THEN
    missing_tables := missing_tables || 'classes, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='subjects') THEN
    missing_tables := missing_tables || 'subjects, ';
  END IF;
  
  IF missing_tables != '' THEN
    RAISE NOTICE '⚠️  Missing core tables: %. Run complete_database_setup.sql first!', missing_tables;
  ELSE
    RAISE NOTICE '✅ All core tables exist!';
  END IF;
  
  RAISE NOTICE '✅ Database setup complete! All tables and RLS policies created.';
END $$;
