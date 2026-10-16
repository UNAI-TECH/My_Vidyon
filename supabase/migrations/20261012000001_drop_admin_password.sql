-- ============================================================
-- Migration: 20261012000001_drop_admin_password.sql
-- Purpose: Remediate Critical Security Vulnerability VULN-001 / SEC-001
-- Description:
--   Permanently drop plaintext admin_password column from public.institutions.
--   Administrative passwords are authenticated and secured exclusively via
--   Supabase Auth (auth.users) with Argon2/bcrypt password hashing.
-- ============================================================

-- 1. Remove admin_password column from public.institutions if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'institutions' 
          AND column_name = 'admin_password'
    ) THEN
        ALTER TABLE public.institutions DROP COLUMN admin_password;
        RAISE NOTICE 'Dropped plaintext admin_password column from public.institutions';
    ELSE
        RAISE NOTICE 'Column admin_password does not exist on public.institutions';
    END IF;
END $$;

-- 2. Audit / Documentation comment
COMMENT ON TABLE public.institutions IS 'Institutions tenant table. Administrative credentials secured via auth.users.';
