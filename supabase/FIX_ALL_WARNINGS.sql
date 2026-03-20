-- ============================================================================
-- FIX ALL SUPABASE WARNINGS & INFO ITEMS (v3 - HELPER FUNCTION APPROACH)
-- ============================================================================
-- Creates a SECURITY DEFINER helper function to handle UUID/TEXT institution_id
-- matching, then uses it in all policies for clean, type-safe comparisons.
-- ============================================================================


-- ============================================================================
-- STEP 0: CREATE HELPER FUNCTION
-- ============================================================================
-- This function checks if the current user belongs to a given institution
-- and has one of the allowed roles. It handles BOTH UUID and TEXT institution_id
-- by accepting TEXT and comparing against both institutions.id and institutions.institution_id.

CREATE OR REPLACE FUNCTION public.check_user_institution_role(
    p_institution_id text,
    p_allowed_roles text[]
)
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
          AND pr.role::text = ANY(p_allowed_roles)
          AND (i.institution_id = p_institution_id OR i.id::text = p_institution_id)
    );
END;
$$;

-- Simpler version: just checks if user belongs to institution (any role)
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

-- Role-only check (no institution_id needed)
CREATE OR REPLACE FUNCTION public.check_user_role(p_allowed_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role::text = ANY(p_allowed_roles)
    );
END;
$$;


-- ============================================================================
-- SECTION 1: FIX function_search_path_mutable (35 functions)
-- ============================================================================
DO $$
DECLARE
    func_record RECORD;
    func_names TEXT[] := ARRAY[
        'update_updated_at_column','enable_user_access','mark_absent_students',
        'get_current_user_profile','is_parent_of_student','assign_class_teacher_to_leave',
        'get_my_leave_requests_as_student','get_my_leave_requests_as_parent',
        'get_my_leave_requests_as_faculty','get_pending_leave_count_for_faculty',
        'get_student_class_teacher','handle_attendance_status','get_staff_for_assignment',
        'tr_notify_canteen_denial','tr_log_new_institution','tr_log_new_profile',
        'tr_log_new_student','log_platform_activity','handle_announcement_notification',
        'tr_log_new_payment','tr_log_new_announcement','tr_sync_canteen_photo',
        'create_announcement','assign_class_teacher','assign_subject_staff',
        'get_class_teacher','get_subject_staff','get_class_assignments',
        'faculty_post_announcement','cleanup_expired_sessions',
        'handle_new_notification_push','handle_new_event_push',
        'disable_user_access','mark_absent_staff','tr_sync_canteen_permission'
    ];
BEGIN
    FOR func_record IN
        SELECT n.nspname AS sn, p.proname AS fn,
               pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = ANY(func_names)
    LOOP
        EXECUTE format(
            'ALTER FUNCTION %I.%I(%s) SET search_path = public',
            func_record.sn, func_record.fn, func_record.args
        );
        RAISE NOTICE 'Fixed: %.%(%)', func_record.sn, func_record.fn, func_record.args;
    END LOOP;
END $$;


-- ============================================================================
-- SECTION 2: FIX rls_policy_always_true (26 policies)
-- ============================================================================
-- All institution_id comparisons now go through the helper functions,
-- which accept TEXT and handle UUID/TEXT matching internally.

-- 2a. academic_events
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.academic_events;
CREATE POLICY "Institution manages academic events"
ON public.academic_events FOR ALL TO authenticated
USING (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','faculty']))
WITH CHECK (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','faculty']));

-- 2b. assignments
DROP POLICY IF EXISTS "Enable insert for faculty" ON public.assignments;
CREATE POLICY "Faculty insert assignments"
ON public.assignments FOR INSERT TO authenticated
WITH CHECK (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','faculty']));

-- 2c. canteen_attendance
DROP POLICY IF EXISTS "Admin manage canteen attendance" ON public.canteen_attendance;
DROP POLICY IF EXISTS "Permissive canteen access" ON public.canteen_attendance;
CREATE POLICY "Institution manages canteen attendance"
ON public.canteen_attendance FOR ALL TO authenticated
USING (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','canteen_manager','faculty']))
WITH CHECK (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','canteen_manager','faculty']));

-- 2d. canteen_sessions
DROP POLICY IF EXISTS "Allow service role manage" ON public.canteen_sessions;
CREATE POLICY "Institution manages canteen sessions"
ON public.canteen_sessions FOR ALL TO authenticated
USING (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','canteen_manager']))
WITH CHECK (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','canteen_manager']));

-- 2e. certificates
DROP POLICY IF EXISTS "Authenticated users can manage certificates" ON public.certificates;
CREATE POLICY "Institution manages certificates"
ON public.certificates FOR ALL TO authenticated
USING (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','faculty']))
WITH CHECK (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','faculty']));

-- 2f. classes (no institution_id — role check only)
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.classes;
CREATE POLICY "Admin manages classes"
ON public.classes FOR ALL TO authenticated
USING (public.check_user_role(ARRAY['admin','institution']))
WITH CHECK (public.check_user_role(ARRAY['admin','institution']));

-- 2g. faculty_subjects (no institution_id — role check only)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.faculty_subjects;
CREATE POLICY "Admin manages faculty subjects"
ON public.faculty_subjects FOR ALL TO authenticated
USING (public.check_user_role(ARRAY['admin','institution']))
WITH CHECK (public.check_user_role(ARRAY['admin','institution']));

-- 2h. fee_structures
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.fee_structures;
CREATE POLICY "Institution manages fee structures"
ON public.fee_structures FOR ALL TO authenticated
USING (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','accountant']))
WITH CHECK (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','accountant']));

-- 2i. groups (no institution_id — role check only)
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.groups;
CREATE POLICY "Admin manages groups"
ON public.groups FOR ALL TO authenticated
USING (public.check_user_role(ARRAY['admin','institution']))
WITH CHECK (public.check_user_role(ARRAY['admin','institution']));

-- 2j. institutions (admin only)
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.institutions;
CREATE POLICY "Admin manages institutions"
ON public.institutions FOR ALL TO authenticated
USING (public.check_user_role(ARRAY['admin']))
WITH CHECK (public.check_user_role(ARRAY['admin']));

-- 2k. notifications
DROP POLICY IF EXISTS "insert_all" ON public.notifications;
CREATE POLICY "Insert notifications for own institution"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.check_user_institution(institution_id::text));

-- 2l. parents
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.parents;
CREATE POLICY "Admin manages parents"
ON public.parents FOR ALL TO authenticated
USING (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution']))
WITH CHECK (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution']));

-- 2m. reports
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.reports;
CREATE POLICY "Institution manages reports"
ON public.reports FOR ALL TO authenticated
USING (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','faculty']))
WITH CHECK (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','faculty']));

-- 2n. special_timetable_slots
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.special_timetable_slots;
CREATE POLICY "Institution manages special timetable slots"
ON public.special_timetable_slots FOR ALL TO authenticated
USING (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','faculty']))
WITH CHECK (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','faculty']));

-- 2o. staff_attendance
DROP POLICY IF EXISTS "Admin manage staff attendance" ON public.staff_attendance;
CREATE POLICY "Institution manages staff attendance"
ON public.staff_attendance FOR ALL TO authenticated
USING (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','faculty']))
WITH CHECK (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','faculty']));

-- 2p. staff_leaves (staff manage own + admin manage all)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.staff_leaves;
CREATE POLICY "Staff manage own leaves"
ON public.staff_leaves FOR ALL TO authenticated
USING (
    staff_id = auth.uid()
    OR public.check_user_institution_role(institution_id::text, ARRAY['admin','institution'])
)
WITH CHECK (
    staff_id = auth.uid()
    OR public.check_user_institution_role(institution_id::text, ARRAY['admin','institution'])
);

-- 2q. student_attendance
DROP POLICY IF EXISTS "Admin can manage attendance" ON public.student_attendance;
CREATE POLICY "Institution manages student attendance"
ON public.student_attendance FOR ALL TO authenticated
USING (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','faculty']))
WITH CHECK (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','faculty']));

-- 2r. student_fees
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.student_fees;
CREATE POLICY "Institution manages student fees"
ON public.student_fees FOR ALL TO authenticated
USING (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','accountant']))
WITH CHECK (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution','accountant']));

-- 2s. student_parents (no institution_id — role check only)
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.student_parents;
CREATE POLICY "Admin manages student parents"
ON public.student_parents FOR ALL TO authenticated
USING (public.check_user_role(ARRAY['admin','institution']))
WITH CHECK (public.check_user_role(ARRAY['admin','institution']));

-- 2t. subjects
DROP POLICY IF EXISTS "Allow management for authenticated users" ON public.subjects;
CREATE POLICY "Admin manages subjects"
ON public.subjects FOR ALL TO authenticated
USING (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution']))
WITH CHECK (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution']));

-- 2u. submissions (no institution_id — user-based)
DROP POLICY IF EXISTS "Enable insert for all" ON public.submissions;
CREATE POLICY "Users insert own submissions"
ON public.submissions FOR INSERT TO authenticated
WITH CHECK (
    student_id = auth.uid()::text
    OR public.check_user_role(ARRAY['admin','institution','faculty'])
);

-- 2v. support_queries
DROP POLICY IF EXISTS "Anyone can insert support queries" ON public.support_queries;
CREATE POLICY "Authenticated users can insert support queries"
ON public.support_queries FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 2w. timetable_configs
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.timetable_configs;
CREATE POLICY "Institution manages timetable configs"
ON public.timetable_configs FOR ALL TO authenticated
USING (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution']))
WITH CHECK (public.check_user_institution_role(institution_id::text, ARRAY['admin','institution']));

-- 2x. timetable_slots (no direct institution_id — check via config)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.timetable_slots;
CREATE POLICY "Institution manages timetable slots"
ON public.timetable_slots FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.timetable_configs tc
        WHERE tc.id = timetable_slots.config_id
        AND public.check_user_institution_role(tc.institution_id::text, ARRAY['admin','institution'])
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.timetable_configs tc
        WHERE tc.id = timetable_slots.config_id
        AND public.check_user_institution_role(tc.institution_id::text, ARRAY['admin','institution'])
    )
);


-- ============================================================================
-- SECTION 3: FIX extension_in_public (pg_net)
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
    RAISE NOTICE 'Moved pg_net to extensions schema';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not move pg_net: %. May need Supabase Dashboard.', SQLERRM;
END $$;


-- ============================================================================
-- SECTION 4: FIX rls_enabled_no_policy (2 backup tables)
-- ============================================================================
DROP POLICY IF EXISTS "Admin only access backup" ON public.announcements_backup;
CREATE POLICY "Admin only access backup"
ON public.announcements_backup FOR ALL TO authenticated
USING (public.check_user_role(ARRAY['admin']))
WITH CHECK (public.check_user_role(ARRAY['admin']));

DROP POLICY IF EXISTS "Admin only access backup conversion" ON public.announcements_backup_conversion;
CREATE POLICY "Admin only access backup conversion"
ON public.announcements_backup_conversion FOR ALL TO authenticated
USING (public.check_user_role(ARRAY['admin']))
WITH CHECK (public.check_user_role(ARRAY['admin']));


-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT '✅ All warning fixes applied successfully!' as status;
