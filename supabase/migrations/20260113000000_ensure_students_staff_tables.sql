-- Ensure students table exists with proper structure
CREATE TABLE IF NOT EXISTS public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  register_number TEXT UNIQUE,
  class_name TEXT,
  section TEXT,
  dob DATE,
  gender TEXT,
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,
  parent_contact TEXT,
  email TEXT,
  address TEXT,
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS for students table
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read for all auth users" ON public.students;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.students;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.students;

-- Create policies for students table
CREATE POLICY "Allow read for all auth users" 
ON public.students 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.students 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" 
ON public.students 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow delete for authenticated users" 
ON public.students 
FOR DELETE 
TO authenticated 
USING (true);

-- Ensure staff_details table exists (for faculty/staff members)
CREATE TABLE IF NOT EXISTS public.staff_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  staff_id TEXT,
  role TEXT,
  subject_assigned TEXT,
  subjects TEXT[], -- Array of subjects for multiple assignments
  class_assigned TEXT,
  section_assigned TEXT,
  department TEXT,
  designation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS for staff_details table
ALTER TABLE public.staff_details ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read for all auth users" ON public.staff_details;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.staff_details;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.staff_details;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON public.staff_details;

-- Create policies for staff_details table
CREATE POLICY "Allow read for all auth users" 
ON public.staff_details 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.staff_details 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" 
ON public.staff_details 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow delete for authenticated users" 
ON public.staff_details 
FOR DELETE 
TO authenticated 
USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_institution_id ON public.students(institution_id);
CREATE INDEX IF NOT EXISTS idx_students_class_section ON public.students(class_name, section);
CREATE INDEX IF NOT EXISTS idx_staff_details_institution_id ON public.staff_details(institution_id);
CREATE INDEX IF NOT EXISTS idx_staff_details_profile_id ON public.staff_details(profile_id);

-- Add comment for documentation
COMMENT ON TABLE public.students IS 'Stores student information for all institutions';
COMMENT ON TABLE public.staff_details IS 'Stores staff/faculty details and assignments';
