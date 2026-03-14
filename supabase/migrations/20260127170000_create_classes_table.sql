-- Create classes table if it doesn't exist
-- This table is referenced by faculty_subjects but may not have been created

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  section TEXT DEFAULT 'A',
  academic_year TEXT DEFAULT '2025-26',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(institution_id, class_name, section, academic_year)
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Allow read for authenticated users" ON public.classes;
CREATE POLICY "Allow read for authenticated users" 
ON public.classes 
FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.classes;
CREATE POLICY "Allow insert for authenticated users" 
ON public.classes 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.classes;
CREATE POLICY "Allow update for authenticated users" 
ON public.classes 
FOR UPDATE 
TO authenticated 
USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_classes_institution ON public.classes(institution_id);
CREATE INDEX IF NOT EXISTS idx_classes_name ON public.classes(class_name);

-- Populate with common classes if empty
INSERT INTO public.classes (institution_id, class_name, section)
SELECT DISTINCT 
    institution_id,
    class_name,
    'A' as section
FROM public.students
WHERE class_name IS NOT NULL
ON CONFLICT (institution_id, class_name, section, academic_year) DO NOTHING;

COMMENT ON TABLE public.classes IS 'Stores class and section information for institutions';
