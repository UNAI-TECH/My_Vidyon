-- ============================================================================
-- FIX ALL SUPABASE RLS SECURITY VULNERABILITIES
-- ============================================================================
-- This script addresses ALL 14 security errors from the Supabase Database Linter:
--   1. policy_exists_rls_disabled  (2 errors) - transport_routes, transport_vehicles
--   2. rls_disabled_in_public      (7 errors) - transport_routes, transport_vehicles,
--      parent_student_relations, class_assignments, bus_routes, bus_stops, bus_locations
--   3. rls_references_user_metadata (5 errors) - exam_schedules (3), exam_schedule_entries (1)
--
-- Run this entire script in the Supabase SQL Editor.
-- ============================================================================


-- ============================================================================
-- SECTION 1: ENABLE RLS ON ALL TABLES THAT HAVE IT DISABLED
-- ============================================================================

-- 1a. transport_routes - already has "Allow read for auth" policy, just needs RLS ON
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;

-- 1b. transport_vehicles - already has "Allow read for auth" policy, just needs RLS ON
ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;

-- 1c. bus_routes - needs RLS + policies
ALTER TABLE public.bus_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bus_routes_select_same_institution" ON public.bus_routes;
CREATE POLICY "bus_routes_select_same_institution"
ON public.bus_routes FOR SELECT TO authenticated
USING (
    institution_id IN (
        SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "bus_routes_manage_admin" ON public.bus_routes;
CREATE POLICY "bus_routes_manage_admin"
ON public.bus_routes FOR ALL TO authenticated
USING (
    institution_id IN (
        SELECT institution_id FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'institution', 'driver')
    )
)
WITH CHECK (
    institution_id IN (
        SELECT institution_id FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'institution', 'driver')
    )
);

-- 1d. bus_stops - needs RLS + policies
ALTER TABLE public.bus_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bus_stops_select_via_route" ON public.bus_stops;
CREATE POLICY "bus_stops_select_via_route"
ON public.bus_stops FOR SELECT TO authenticated
USING (
    route_id IN (
        SELECT id FROM public.bus_routes
        WHERE institution_id IN (
            SELECT institution_id FROM public.profiles WHERE id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "bus_stops_manage_admin" ON public.bus_stops;
CREATE POLICY "bus_stops_manage_admin"
ON public.bus_stops FOR ALL TO authenticated
USING (
    route_id IN (
        SELECT id FROM public.bus_routes
        WHERE institution_id IN (
            SELECT institution_id FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'institution', 'driver')
        )
    )
)
WITH CHECK (
    route_id IN (
        SELECT id FROM public.bus_routes
        WHERE institution_id IN (
            SELECT institution_id FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'institution', 'driver')
        )
    )
);

-- 1e. bus_locations - needs RLS + policies
ALTER TABLE public.bus_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bus_locations_select_same_institution" ON public.bus_locations;
CREATE POLICY "bus_locations_select_same_institution"
ON public.bus_locations FOR SELECT TO authenticated
USING (
    institution_id IN (
        SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
);

DROP POLICY IF EXISTS "bus_locations_manage_driver" ON public.bus_locations;
CREATE POLICY "bus_locations_manage_driver"
ON public.bus_locations FOR ALL TO authenticated
USING (
    institution_id IN (
        SELECT institution_id FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'institution', 'driver')
    )
)
WITH CHECK (
    institution_id IN (
        SELECT institution_id FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'institution', 'driver')
    )
);

-- 1f. parent_student_relations - needs RLS + policies
ALTER TABLE public.parent_student_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_student_relations_select_own" ON public.parent_student_relations;
CREATE POLICY "parent_student_relations_select_own"
ON public.parent_student_relations FOR SELECT TO authenticated
USING (
    parent_id = auth.uid() OR
    student_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'institution')
    )
);

DROP POLICY IF EXISTS "parent_student_relations_manage_admin" ON public.parent_student_relations;
CREATE POLICY "parent_student_relations_manage_admin"
ON public.parent_student_relations FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'institution')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'institution')
    )
);

-- 1g. class_assignments - needs RLS + policies
ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_assignments_select_own" ON public.class_assignments;
CREATE POLICY "class_assignments_select_own"
ON public.class_assignments FOR SELECT TO authenticated
USING (
    student_id = auth.uid() OR
    teacher_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'institution')
    )
);

DROP POLICY IF EXISTS "class_assignments_manage_admin" ON public.class_assignments;
CREATE POLICY "class_assignments_manage_admin"
ON public.class_assignments FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'institution')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'institution')
    )
);


-- ============================================================================
-- SECTION 2: FIX exam_schedules POLICIES THAT REFERENCE user_metadata
-- ============================================================================
-- The linter flagged these policies for using auth.jwt()->'user_metadata'
-- which is EDITABLE by end users. We replace with profiles table lookups.

-- 2a. Drop the vulnerable policies
DROP POLICY IF EXISTS "Faculty can view exam schedules for their institution" ON public.exam_schedules;
DROP POLICY IF EXISTS "Faculty can create exam schedules" ON public.exam_schedules;
DROP POLICY IF EXISTS "Students can view exam schedules for their class" ON public.exam_schedules;

-- 2b. Recreate them using profiles table (secure, not user-editable)
CREATE POLICY "Faculty can view exam schedules for their institution"
ON public.exam_schedules FOR SELECT
TO authenticated
USING (
    institution_id = (
        SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "Faculty can create exam schedules"
ON public.exam_schedules FOR INSERT
TO authenticated
WITH CHECK (
    institution_id = (
        SELECT institution_id FROM public.profiles WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
);

CREATE POLICY "Students can view exam schedules for their class"
ON public.exam_schedules FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.students
        WHERE students.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND students.class_name = exam_schedules.class_id
        AND students.section = exam_schedules.section
        AND students.institution_id = (
            SELECT institution_id FROM public.profiles WHERE id = auth.uid()
        )
    )
);


-- ============================================================================
-- SECTION 3: FIX exam_schedule_entries POLICY THAT REFERENCES user_metadata
-- ============================================================================

-- 3a. Drop the vulnerable policy
DROP POLICY IF EXISTS "Students and faculty can view exam schedule entries" ON public.exam_schedule_entries;

-- 3b. Recreate it using profiles table lookups instead of user_metadata
CREATE POLICY "Students and faculty can view exam schedule entries"
ON public.exam_schedule_entries FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.exam_schedules
        WHERE exam_schedules.id = exam_schedule_entries.exam_schedule_id
        AND (
            -- Faculty access: they created the schedule
            exam_schedules.created_by = auth.uid()
            OR
            -- Student access: check students table for matching class/section
            (
                exam_schedules.institution_id = (
                    SELECT institution_id FROM public.profiles WHERE id = auth.uid()
                )
                AND EXISTS (
                    SELECT 1 FROM public.students
                    WHERE students.email = (SELECT email FROM auth.users WHERE id = auth.uid())
                    AND students.class_name = exam_schedules.class_id
                    AND students.section = exam_schedules.section
                    AND students.institution_id = (
                        SELECT institution_id FROM public.profiles WHERE id = auth.uid()
                    )
                )
            )
        )
    )
);


-- ============================================================================
-- SECTION 4: VERIFICATION
-- ============================================================================
SELECT '✅ All RLS fixes applied successfully!' as status;

-- Verify RLS is enabled on all affected tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'transport_routes', 'transport_vehicles',
    'bus_routes', 'bus_stops', 'bus_locations',
    'parent_student_relations', 'class_assignments',
    'exam_schedules', 'exam_schedule_entries'
  )
ORDER BY tablename;

-- List all policies on affected tables
SELECT
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'transport_routes', 'transport_vehicles',
    'bus_routes', 'bus_stops', 'bus_locations',
    'parent_student_relations', 'class_assignments',
    'exam_schedules', 'exam_schedule_entries'
  )
ORDER BY tablename, policyname;
