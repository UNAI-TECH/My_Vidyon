-- Database Migration: RLS Management Fix
-- This migration ensures that authenticated users (Admins) can manage core entities.

-- 1. Institutions
DROP POLICY IF EXISTS "Allow read for all auth users" ON public.institutions;
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.institutions;
CREATE POLICY "Allow management for authenticated users" ON public.institutions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Groups
DROP POLICY IF EXISTS "Allow read for all auth users" ON public.groups;
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.groups;
CREATE POLICY "Allow management for authenticated users" ON public.groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Classes
DROP POLICY IF EXISTS "Allow read for all auth users" ON public.classes;
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.classes;
CREATE POLICY "Allow management for authenticated users" ON public.classes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Subjects
DROP POLICY IF EXISTS "Allow read for all auth users" ON public.subjects;
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.subjects;
CREATE POLICY "Allow management for authenticated users" ON public.subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Students
DROP POLICY IF EXISTS "Allow read for all auth users" ON public.students;
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.students;
CREATE POLICY "Allow management for authenticated users" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Staff Details
DROP POLICY IF EXISTS "Allow read for all auth users" ON public.staff_details;
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.staff_details;
CREATE POLICY "Allow management for authenticated users" ON public.staff_details FOR ALL TO authenticated USING (true) WITH CHECK (true);
