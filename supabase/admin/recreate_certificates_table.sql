-- =====================================================
-- DROP AND RECREATE CERTIFICATES TABLE (COMPLETE FIX)
-- =====================================================

-- Step 1: Drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS public.certificates CASCADE;

-- Step 2: Create the table with ALL columns
CREATE TABLE public.certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID,
  student_email TEXT NOT NULL,
  student_name TEXT,
  faculty_id UUID,
  faculty_name TEXT,
  institution_id TEXT,
  category TEXT NOT NULL,
  course_description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  class_name TEXT,
  section TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by TEXT,
  status TEXT DEFAULT 'active'
);

-- Step 3: Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies
DROP POLICY IF EXISTS "Students can view own certificates" ON public.certificates;
CREATE POLICY "Students can view own certificates" 
ON public.certificates FOR SELECT TO authenticated 
USING (student_email = (auth.jwt()->>'email'));

DROP POLICY IF EXISTS "Authenticated users can manage certificates" ON public.certificates;
CREATE POLICY "Authenticated users can manage certificates" 
ON public.certificates FOR ALL TO authenticated 
USING (true) WITH CHECK (true);

-- Step 5: Create indexes
CREATE INDEX idx_certificates_student_email ON public.certificates(student_email);
CREATE INDEX idx_certificates_faculty_id ON public.certificates(faculty_id);
CREATE INDEX idx_certificates_uploaded_at ON public.certificates(uploaded_at DESC);

-- Step 6: Verify
SELECT 
    column_name, 
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'certificates'
ORDER BY ordinal_position;
