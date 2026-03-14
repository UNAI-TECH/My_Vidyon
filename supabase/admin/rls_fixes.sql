-- Fix RLS Policies for Institutions
CREATE POLICY "Allow management for authenticated users" 
ON public.institutions FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Fix RLS Policies for Groups
CREATE POLICY "Allow management for authenticated users" 
ON public.groups FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Fix RLS Policies for Classes
CREATE POLICY "Allow management for authenticated users" 
ON public.classes FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Fix RLS Policies for Subjects
CREATE POLICY "Allow management for authenticated users" 
ON public.subjects FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Fix RLS Policies for Students
CREATE POLICY "Allow management for authenticated users" 
ON public.students FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Fix RLS Policies for Staff Details (if not already handled)
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.staff_details;
CREATE POLICY "Allow management for authenticated users" 
ON public.staff_details FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
