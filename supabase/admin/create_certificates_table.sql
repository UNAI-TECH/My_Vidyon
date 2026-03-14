-- =====================================================
-- CREATE CERTIFICATES TABLE (SIMPLIFIED VERSION)
-- =====================================================

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Student information
  student_id UUID,
  student_email TEXT NOT NULL,
  student_name TEXT,
  
  -- Faculty information
  faculty_id UUID,
  faculty_name TEXT,
  
  -- Institution
  institution_id TEXT,
  
  -- Certificate details
  category TEXT NOT NULL,
  course_description TEXT,
  
  -- File information
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  
  -- Class information
  class_name TEXT,
  section TEXT,
  
  -- Metadata
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by TEXT,
  
  -- Status
  status TEXT DEFAULT 'active'
);

-- Step 2: Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies
DROP POLICY IF EXISTS "Students can view own certificates" ON public.certificates;
CREATE POLICY "Students can view own certificates" 
ON public.certificates FOR SELECT TO authenticated 
USING (student_email = (auth.jwt()->>'email'));

DROP POLICY IF EXISTS "Authenticated users can manage certificates" ON public.certificates;
CREATE POLICY "Authenticated users can manage certificates" 
ON public.certificates FOR ALL TO authenticated 
USING (true) WITH CHECK (true);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_certificates_student_email ON public.certificates(student_email);
CREATE INDEX IF NOT EXISTS idx_certificates_faculty_id ON public.certificates(faculty_id);
CREATE INDEX IF NOT EXISTS idx_certificates_uploaded_at ON public.certificates(uploaded_at DESC);

-- Step 5: Verify
SELECT COUNT(*) as table_exists FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'certificates';
