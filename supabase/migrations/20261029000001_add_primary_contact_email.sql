-- Migration: Add primary_contact_email to institutions table
-- Date: 2026-10-29

ALTER TABLE public.institutions
ADD COLUMN IF NOT EXISTS primary_contact_email TEXT;

COMMENT ON COLUMN public.institutions.primary_contact_email IS 'Primary contact email of institution leadership used for password resets and official Vidyon notifications';

