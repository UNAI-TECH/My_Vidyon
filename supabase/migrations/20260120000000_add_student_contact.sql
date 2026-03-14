-- Add phone column to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Index for phone number searches
CREATE INDEX IF NOT EXISTS idx_students_phone ON public.students(phone);

COMMENT ON COLUMN public.students.phone IS 'Personal phone number of the student (distinct from parent_phone)';
