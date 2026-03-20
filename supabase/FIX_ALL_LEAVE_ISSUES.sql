-- ============================================================================
-- FIX ALL LEAVE REQUEST ISSUES (Consolidated v4 - SELF-CONTAINED)
-- ============================================================================
-- 1. Helper Functions (Required for RLS)
-- 2. Schema Fixes: leave_type, status constraint, parent_id FK
-- 3. Access Fixes: RLS policies for classes (via groups) and faculty_subjects
-- ============================================================================

-- A. HELPER FUNCTIONS (Ensuring they exist)
CREATE OR REPLACE FUNCTION public.check_user_institution(p_institution_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles pr
        JOIN public.institutions i ON i.institution_id = pr.institution_id
        WHERE pr.id = auth.uid()
          AND (i.institution_id = p_institution_id OR i.id::text = p_institution_id)
    );
END;
$$;

-- B. SCHEMA FIXES
ALTER TABLE public.leave_requests
ADD COLUMN IF NOT EXISTS leave_type TEXT DEFAULT 'General',
ADD COLUMN IF NOT EXISTS assigned_class_teacher_id UUID;

ALTER TABLE public.leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_status_check;

ALTER TABLE public.leave_requests
ADD CONSTRAINT leave_requests_status_check
CHECK (status IN ('pending', 'recommended', 'approved', 'rejected'));

ALTER TABLE public.leave_requests
ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_parent_id_fkey;

ALTER TABLE public.leave_requests
ADD CONSTRAINT leave_requests_parent_id_fkey
FOREIGN KEY (parent_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- C. ACCESS FIXES (Using the helper above)
DO $$
BEGIN
    -- 1. Classes Table (Linked via groups)
    DROP POLICY IF EXISTS "Authenticated read classes" ON public.classes;
    CREATE POLICY "Authenticated read classes"
    ON public.classes FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.groups g 
        WHERE g.id = classes.group_id 
        AND public.check_user_institution(g.institution_id::text)
      )
    );

    -- 2. Faculty Subjects Table (Has direct institution_id)
    DROP POLICY IF EXISTS "Authenticated read faculty subjects" ON public.faculty_subjects;
    CREATE POLICY "Authenticated read faculty subjects"
    ON public.faculty_subjects FOR SELECT
    TO authenticated
    USING (public.check_user_institution(institution_id::text));
END $$;

-- D. VERIFICATION
SELECT 'SUCCESS: All schema, access, and helper functions resolved (v4)!' as status;
