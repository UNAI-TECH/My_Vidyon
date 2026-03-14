-- Migration: Fix Admin Permissions and Enable Cascades
-- 1. Enable RLS on all tables (ensure security layer is active)
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies and create permissive ones for authenticated users
-- (This ensures Admins can do everything. Fine-grained roles can be added later if needed)

-- Institutions
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.institutions;
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.institutions;
CREATE POLICY "Allow management for authenticated users" ON public.institutions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Groups
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.groups;
CREATE POLICY "Allow management for authenticated users" ON public.groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Classes
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.classes;
CREATE POLICY "Allow management for authenticated users" ON public.classes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Subjects
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.subjects;
CREATE POLICY "Allow management for authenticated users" ON public.subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Students
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.students;
CREATE POLICY "Allow management for authenticated users" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Staff Details
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.staff_details;
CREATE POLICY "Allow management for authenticated users" ON public.staff_details FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Parents
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.parents;
CREATE POLICY "Allow management for authenticated users" ON public.parents FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 3. Fix Foreign Key Constraints to Allow Cascading Deletes
-- This fixes "Cannot delete institution" errors by ensuring related data is deleted automatically.
-- We use DO blocks to safely handle constraints if they have different names, 
-- but we primarily target the standard naming convention. 
-- IMPORTANT: We assume institution_id in child tables references institutions(institution_id).

DO $$
BEGIN
    -- Groups -> Institutions
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'groups_institution_id_fkey') THEN
        ALTER TABLE public.groups DROP CONSTRAINT groups_institution_id_fkey;
    END IF;
    ALTER TABLE public.groups ADD CONSTRAINT groups_institution_id_fkey 
    FOREIGN KEY (institution_id) REFERENCES public.institutions(institution_id) ON DELETE CASCADE;

    -- Classes -> Groups (Delete classes when group is deleted)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'classes_group_id_fkey') THEN
        ALTER TABLE public.classes DROP CONSTRAINT classes_group_id_fkey;
    END IF;
    ALTER TABLE public.classes ADD CONSTRAINT classes_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

    -- Subjects -> Institutions
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subjects_institution_id_fkey') THEN
        ALTER TABLE public.subjects DROP CONSTRAINT subjects_institution_id_fkey;
    END IF;
    ALTER TABLE public.subjects ADD CONSTRAINT subjects_institution_id_fkey 
    FOREIGN KEY (institution_id) REFERENCES public.institutions(institution_id) ON DELETE CASCADE;

    -- Students -> Institutions
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'students_institution_id_fkey') THEN
        ALTER TABLE public.students DROP CONSTRAINT students_institution_id_fkey;
    END IF;
    ALTER TABLE public.students ADD CONSTRAINT students_institution_id_fkey 
    FOREIGN KEY (institution_id) REFERENCES public.institutions(institution_id) ON DELETE CASCADE;

    -- Staff Details -> Institutions
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'staff_details_institution_id_fkey') THEN
        ALTER TABLE public.staff_details DROP CONSTRAINT staff_details_institution_id_fkey;
    END IF;
    ALTER TABLE public.staff_details ADD CONSTRAINT staff_details_institution_id_fkey 
    FOREIGN KEY (institution_id) REFERENCES public.institutions(institution_id) ON DELETE CASCADE;

END $$;
