-- Academic Year Management Implementation
-- This migration adds academic year support and institution status management

-- 1. Add status column to institutions table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='institutions' AND column_name='status') THEN
    ALTER TABLE public.institutions 
    ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted'));
  END IF;
END $$;

-- 2. Add current_academic_year to institutions table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='institutions' AND column_name='current_academic_year') THEN
    ALTER TABLE public.institutions 
    ADD COLUMN current_academic_year TEXT DEFAULT '2025-26';
  END IF;
END $$;

-- 3. Add academic_year to students table (to track which year they were admitted/enrolled)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='students' AND column_name='academic_year') THEN
    ALTER TABLE public.students 
    ADD COLUMN academic_year TEXT DEFAULT '2025-26';
  END IF;
END $$;

-- 4. Add academic_year to student_attendance table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='student_attendance') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='student_attendance' AND column_name='academic_year') THEN
      ALTER TABLE public.student_attendance 
      ADD COLUMN academic_year TEXT;
    END IF;
  END IF;
END $$;

-- 5. Add academic_year to assignments table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='assignments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='assignments' AND column_name='academic_year') THEN
      ALTER TABLE public.assignments 
      ADD COLUMN academic_year TEXT;
    END IF;
  END IF;
END $$;

-- 6. Update existing records to have current academic year
UPDATE public.students SET academic_year = '2025-26' WHERE academic_year IS NULL;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='student_attendance') THEN
    UPDATE public.student_attendance SET academic_year = '2025-26' WHERE academic_year IS NULL;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='assignments') THEN
    UPDATE public.assignments SET academic_year = '2025-26' WHERE academic_year IS NULL;
  END IF;
END $$;
