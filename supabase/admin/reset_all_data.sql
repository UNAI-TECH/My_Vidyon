-- ============================================================
-- MY VIDYON — COMPLETE DATABASE RESET
-- ============================================================
-- WHAT THIS DOES:
--   ✅ Deletes ALL rows from ALL public schema tables
--   ✅ Deletes ALL files from ALL storage buckets
--   ✅ Deletes ALL auth users EXCEPT myvidyon@gmail.com
--   ✅ Re-seeds system data (feature_flags, permissions, super admin profile)
--
-- WHAT THIS PRESERVES:
--   ✅ All table structures, columns, constraints, indexes
--   ✅ All RLS policies
--   ✅ All database functions & triggers
--   ✅ All edge functions (deployed separately — untouched)
--   ✅ Super admin: myvidyon@gmail.com
--   ✅ master_institutions_catalog (system reference data)
--   ✅ institution_templates (system reference data)
--
-- HOW TO RUN:
--   1. Open: https://supabase.com/dashboard/project/ccyqzcaghwaggtmkmigi/sql/new
--   2. Paste this entire script
--   3. Click "RUN" (▶)
-- ============================================================

-- ============================================================
-- STEP 1: SAFETY CHECK — Abort if super admin is missing
-- ============================================================
DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'myvidyon@gmail.com';
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION
            'SAFETY HALT: myvidyon@gmail.com not found in auth.users. '
            'The reset has been ABORTED — no data was deleted.';
    END IF;
    RAISE NOTICE 'Super admin found: %. Proceeding...', v_admin_id;
END $$;

-- ============================================================
-- STEP 2: Disable triggers for fast bulk operations
-- ============================================================
SET session_replication_role = replica;

-- ============================================================
-- STEP 3: Clear all storage bucket files
-- Bucket definitions (logos, avatars, event-banners, etc.) are kept.
-- Only the uploaded files/objects inside them are deleted.
-- ============================================================
DELETE FROM storage.objects;

-- ============================================================
-- STEP 4: Truncate ALL public schema tables
-- Dynamically discovers every table so nothing is missed.
-- Skips: master_institutions_catalog, institution_templates
--        (these are system/seed reference tables)
-- ============================================================
DO $$
DECLARE
    r      RECORD;
    v_sql  TEXT;
    v_keep TEXT[] := ARRAY[
        'master_institutions_catalog',
        'institution_templates'
    ];
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> ALL(v_keep)
        ORDER BY tablename
    LOOP
        BEGIN
            v_sql := format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', r.tablename);
            EXECUTE v_sql;
            RAISE NOTICE 'Cleared: %', r.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Skipped (could not truncate) %: %', r.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================
-- STEP 5: Delete all auth.users except myvidyon@gmail.com
-- Cleans dependent auth rows first to respect FK constraints
-- ============================================================

-- 5a. Auth sessions
-- (user_id may be stored as varchar, cast to match)
DELETE FROM auth.sessions
WHERE user_id::text IN (
    SELECT id::text FROM auth.users WHERE email != 'myvidyon@gmail.com'
);

-- 5b. Refresh tokens
DELETE FROM auth.refresh_tokens
WHERE user_id::text IN (
    SELECT id::text FROM auth.users WHERE email != 'myvidyon@gmail.com'
);

-- 5c. Identities (OAuth/email links)
DELETE FROM auth.identities
WHERE user_id::text IN (
    SELECT id::text FROM auth.users WHERE email != 'myvidyon@gmail.com'
);

-- 5d. MFA factors
DELETE FROM auth.mfa_factors
WHERE user_id::text IN (
    SELECT id::text FROM auth.users WHERE email != 'myvidyon@gmail.com'
);

-- 5e. Finally delete the users
DELETE FROM auth.users
WHERE email != 'myvidyon@gmail.com';

-- ============================================================
-- STEP 6: Re-enable triggers
-- ============================================================
SET session_replication_role = DEFAULT;

-- ============================================================
-- STEP 7: Re-seed system data
-- ============================================================

-- 7a. Feature flags (global toggles)
INSERT INTO public.feature_flags (flag_key, enabled, description)
VALUES
    ('transport_module_enabled',   false, 'Gates the Transport module (transport_manager and driver roles). Enable when transport is implemented.'),
    ('stakeholder_export_enabled', false, 'Global fallback: if true, all stakeholders can export. Per-stakeholder override is in institution_stakeholder_links.can_export.')
ON CONFLICT (flag_key) DO NOTHING;

-- 7b. RBAC Permissions registry
INSERT INTO public.permissions (module, action, description) VALUES
    ('institutions',  'view',    'View institution details'),
    ('institutions',  'create',  'Create new institutions'),
    ('institutions',  'edit',    'Edit institution details'),
    ('institutions',  'delete',  'Delete institutions'),
    ('institutions',  'manage',  'Full institution management'),
    ('users',         'view',    'View users'),
    ('users',         'create',  'Create users'),
    ('users',         'edit',    'Edit users'),
    ('users',         'delete',  'Delete users'),
    ('users',         'manage',  'Full user management'),
    ('students',      'view',    'View students'),
    ('students',      'create',  'Create students'),
    ('students',      'edit',    'Edit students'),
    ('students',      'delete',  'Delete students'),
    ('attendance',    'view',    'View attendance'),
    ('attendance',    'create',  'Mark attendance'),
    ('attendance',    'edit',    'Edit attendance records'),
    ('grades',        'view',    'View grades/marks'),
    ('grades',        'create',  'Enter grades'),
    ('grades',        'edit',    'Edit grades'),
    ('grades',        'approve', 'Approve grade submissions'),
    ('assignments',   'view',    'View assignments'),
    ('assignments',   'create',  'Create assignments'),
    ('assignments',   'edit',    'Edit assignments'),
    ('assignments',   'delete',  'Delete assignments'),
    ('fees',          'view',    'View fees'),
    ('fees',          'create',  'Create fee entries'),
    ('fees',          'edit',    'Edit fee entries'),
    ('fees',          'manage',  'Full fee management'),
    ('timetable',     'view',    'View timetable'),
    ('timetable',     'manage',  'Manage timetable'),
    ('reports',       'view',    'View reports'),
    ('reports',       'export',  'Export reports'),
    ('notifications', 'view',    'View notifications'),
    ('notifications', 'create',  'Send notifications'),
    ('support',       'view',    'View support tickets'),
    ('support',       'manage',  'Manage support tickets'),
    ('admissions',    'view',    'View admissions'),
    ('admissions',    'create',  'Create admissions'),
    ('admissions',    'edit',    'Edit admissions'),
    ('admissions',    'approve', 'Approve or reject admissions'),
    ('canteen',       'view',    'View canteen menu and orders'),
    ('canteen',       'manage',  'Manage canteen menu and orders'),
    ('transport',     'view',    'View transport routes'),
    ('transport',     'manage',  'Manage transport routes and assignments'),
    ('leave',         'view',    'View leave requests'),
    ('leave',         'approve', 'Approve or reject leave requests'),
    ('calendar',      'view',    'View calendar events'),
    ('calendar',      'manage',  'Create and manage calendar events'),
    ('announcements', 'view',    'View announcements'),
    ('announcements', 'create',  'Create announcements')
ON CONFLICT (module, action) DO NOTHING;

-- 7c. Re-create the super admin profile row
-- Uses only columns confirmed to exist in all migrations.
-- Timestamps are conditionally inserted only if the column exists.
DO $$
DECLARE
    v_id        UUID;
    v_name      TEXT;
    v_email     TEXT;
    v_has_ts    BOOLEAN;
BEGIN
    -- Get super admin auth details
    SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Super Admin'), email
    INTO v_id, v_name, v_email
    FROM auth.users WHERE email = 'myvidyon@gmail.com';

    -- Check if created_at/updated_at exist on profiles
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'profiles'
          AND column_name  = 'created_at'
    ) INTO v_has_ts;

    IF v_has_ts THEN
        INSERT INTO public.profiles (id, full_name, email, role, created_at, updated_at)
        VALUES (v_id, v_name, v_email, 'superadmin', now(), now())
        ON CONFLICT (id) DO UPDATE
            SET role       = 'superadmin',
                email      = EXCLUDED.email,
                full_name  = EXCLUDED.full_name,
                updated_at = now();
    ELSE
        INSERT INTO public.profiles (id, full_name, email, role)
        VALUES (v_id, v_name, v_email, 'superadmin')
        ON CONFLICT (id) DO UPDATE
            SET role      = 'superadmin',
                email     = EXCLUDED.email,
                full_name = EXCLUDED.full_name;
    END IF;

    RAISE NOTICE 'Super admin profile re-created for: %', v_email;
END $$;

-- ============================================================
-- STEP 8: Final verification (dynamic — works with any table set)
-- ============================================================
DO $$
DECLARE
    r       RECORD;
    v_count BIGINT;
    v_sql   TEXT;
BEGIN
    RAISE NOTICE '--- PUBLIC SCHEMA TABLE ROW COUNTS ---';
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        v_sql := format('SELECT COUNT(*) FROM public.%I', r.tablename);
        EXECUTE v_sql INTO v_count;
        RAISE NOTICE '  %-45s : %', r.tablename, v_count;
    END LOOP;

    -- Auth & storage summary
    SELECT COUNT(*) INTO v_count FROM auth.users;
    RAISE NOTICE '  %-45s : %', 'auth.users (total)', v_count;

    SELECT COUNT(*) INTO v_count FROM storage.objects;
    RAISE NOTICE '  %-45s : %', 'storage.objects (files)', v_count;

    RAISE NOTICE '--------------------------------------';
END $$;

-- Confirm super admin survived
SELECT
    'RESET COMPLETE — Super admin preserved' AS result,
    au.email,
    p.role,
    p.full_name
FROM auth.users au
JOIN public.profiles p ON p.id = au.id
WHERE au.email = 'myvidyon@gmail.com';

