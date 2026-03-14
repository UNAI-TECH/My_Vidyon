-- Safe Database Fix - Add Missing Columns
-- This script safely adds missing columns without breaking existing tables

-- 1. Check and add event_date column to academic_events if it doesn't exist
DO $$ 
BEGIN
  -- Check if academic_events table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='academic_events') THEN
    -- Check if event_date column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='academic_events' AND column_name='event_date') THEN
      ALTER TABLE public.academic_events ADD COLUMN event_date DATE;
      RAISE NOTICE 'Added event_date column to academic_events';
    ELSE
      RAISE NOTICE 'event_date column already exists in academic_events';
    END IF;
  ELSE
    -- Create the table if it doesn't exist
    CREATE TABLE public.academic_events (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT,
      event_date DATE NOT NULL,
      start_time TIME,
      end_time TIME,
      location TEXT,
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;
    
    -- Fixed RLS policy - join through institutions table to match TEXT with UUID
    CREATE POLICY "Users can view events from their institution"
      ON public.academic_events FOR SELECT
      USING (
        institution_id IN (
          SELECT i.id 
          FROM public.institutions i
          INNER JOIN public.profiles p ON p.institution_id = i.institution_id
          WHERE p.id = auth.uid()
        )
      );
    
    RAISE NOTICE 'Created academic_events table';
  END IF;
END $$;

-- 2. Check and create grades table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='grades') THEN
    CREATE TABLE public.grades (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
      marks DECIMAL NOT NULL,
      total_marks DECIMAL NOT NULL DEFAULT 100,
      exam_type TEXT,
      date DATE NOT NULL,
      grade_letter TEXT,
      remarks TEXT,
      graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
    
    -- Fixed RLS policy - join through institutions table to match TEXT with UUID
    CREATE POLICY "Users can view grades from their institution"
      ON public.grades FOR SELECT
      USING (
        institution_id IN (
          SELECT i.id 
          FROM public.institutions i
          INNER JOIN public.profiles p ON p.institution_id = i.institution_id
          WHERE p.id = auth.uid()
        )
      );
    
    RAISE NOTICE 'Created grades table';
  ELSE
    RAISE NOTICE 'grades table already exists';
  END IF;
END $$;

-- 3. Verify all required columns exist
DO $$
DECLARE
  missing_columns TEXT := '';
BEGIN
  -- Check institutions table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='institutions' AND column_name='status') THEN
    missing_columns := missing_columns || 'institutions.status, ';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='institutions' AND column_name='current_academic_year') THEN
    missing_columns := missing_columns || 'institutions.current_academic_year, ';
  END IF;
  
  -- Check students table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='academic_year') THEN
    missing_columns := missing_columns || 'students.academic_year, ';
  END IF;
  
  IF missing_columns != '' THEN
    RAISE NOTICE 'Missing columns: %. Run add_academic_year_management.sql migration.', missing_columns;
  ELSE
    RAISE NOTICE 'All required columns exist!';
  END IF;
END $$;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_academic_events_institution ON public.academic_events(institution_id);
CREATE INDEX IF NOT EXISTS idx_academic_events_date ON public.academic_events(event_date);
CREATE INDEX IF NOT EXISTS idx_grades_student ON public.grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_institution ON public.grades(institution_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Database fix completed successfully!';
  RAISE NOTICE 'Next step: Run add_academic_year_management.sql if you haven''t already.';
END $$;
