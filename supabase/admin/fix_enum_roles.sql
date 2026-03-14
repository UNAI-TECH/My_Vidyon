-- =============================================================
-- CRITICAL ENUM UPDATE
-- Run this in Supabase SQL Editor BEFORE running any other fixes.
-- =============================================================

-- Safely add 'accountant'
DO $$ BEGIN
    ALTER TYPE public.user_role ADD VALUE 'accountant';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Safely add 'canteen_manager'
DO $$ BEGIN
    ALTER TYPE public.user_role ADD VALUE 'canteen_manager';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Safely add 'driver'
DO $$ BEGIN
    ALTER TYPE public.user_role ADD VALUE 'driver';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Verify the enum values
SELECT enumlabel 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE typname = 'user_role';
