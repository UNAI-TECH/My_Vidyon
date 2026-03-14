-- =====================================================
-- FIX CERTIFICATES TABLE - ADD ALL MISSING COLUMNS
-- =====================================================

-- Add all potentially missing columns
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS student_id UUID;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS faculty_id UUID;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS faculty_name TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS course_description TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS uploaded_by TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Verify all columns exist
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'certificates'
ORDER BY ordinal_position;
