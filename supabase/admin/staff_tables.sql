-- Create staff_details table to store faculty assignments
CREATE TABLE IF NOT EXISTS public.staff_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_id TEXT NOT NULL,
  staff_id TEXT,
  role TEXT,
  subject_assigned TEXT,
  class_assigned TEXT,
  section_assigned TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS
ALTER TABLE public.staff_details ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated users
CREATE POLICY "Allow read for all auth users" 
ON public.staff_details FOR SELECT 
TO authenticated USING (true);
