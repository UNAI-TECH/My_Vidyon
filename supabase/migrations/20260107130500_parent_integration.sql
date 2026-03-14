-- Database Migration: Role-Based Login & Parent Integration

-- 1. Add admin_password to institutions
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS admin_password TEXT;

-- 2. Create Parents table
CREATE TABLE IF NOT EXISTS public.parents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Create Student-Parent join table (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.student_parents (
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
  PRIMARY KEY (student_id, parent_id)
);

-- 4. Enable RLS
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;

-- 5. Add Policies
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.parents;
CREATE POLICY "Allow management for authenticated users" ON public.parents FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.student_parents;
CREATE POLICY "Allow management for authenticated users" ON public.student_parents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Enable Realtime
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'parents') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.parents;
    END IF;
END $$;
