-- Create custom types if they don't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'institution', 'faculty', 'parent', 'student', 'accountant', 'canteen_manager', 'driver');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop trigger first to avoid issues during updates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate profiles table with more flexibility (Removed references temporarily for debugging)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'student',
  institution_id TEXT,
  status TEXT DEFAULT 'active',
  date_of_birth DATE,
  phone TEXT,
  staff_id TEXT,
  department TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Idempotent Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON public.profiles;
CREATE POLICY "Authenticated users can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Super defensive function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _role_text TEXT;
  _role user_role;
BEGIN
  -- Get role from metadata
  _role_text := new.raw_user_meta_data->>'role';
  
  -- Map 'teacher' to 'faculty' if needed
  IF _role_text = 'teacher' THEN
    _role_text := 'faculty';
  END IF;

  -- Determine role with safe casting
  BEGIN
    IF _role_text IS NOT NULL THEN
      _role := _role_text::user_role;
    ELSE
      _role := 'student'::user_role;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If casting fails, log it and default to student (or check if it's a staff-like creation)
    _role := 'student'::user_role;
  END;

  -- Insert or Update (ON CONFLICT handles duplicates smoothly)
  INSERT INTO public.profiles (id, email, full_name, role, institution_id)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    _role,
    new.raw_user_meta_data->>'institution_id'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    institution_id = EXCLUDED.institution_id,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- SILENT FAIL: Ensure the Auth transaction is NEVER blocked by this trigger
  RETURN NEW;
END;
$$;

-- Re-attach trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- [Previous triggers and profiles table remain above]

-- Institutions Table
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT UNIQUE NOT NULL, -- The unique School Code
  name TEXT NOT NULL,
  type TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  email TEXT,
  admin_email TEXT UNIQUE,
  phone TEXT,
  academic_year TEXT,
  logo_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Groups Table (Primary, Middle, etc.)
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sections TEXT[], -- Array of sections like ['A', 'B']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  department TEXT,
  class_name TEXT,
  group_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Students Table
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
  parent_contact TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS for all new tables
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Simple Policies (Allow read for Authenticated, Write for Admin-only would be better but keeping it open for now as requested)
CREATE POLICY "Allow read for all auth users" ON public.institutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for all auth users" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for all auth users" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for all auth users" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for all auth users" ON public.students FOR SELECT TO authenticated USING (true);

-- Storage Setup (Execute this in Supabase SQL editor to create bucket)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
-- CREATE POLICY "Admin Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');
