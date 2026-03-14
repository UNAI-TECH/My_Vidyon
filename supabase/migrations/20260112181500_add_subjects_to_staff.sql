-- Migration: Add subjects column to staff_details
-- Date: 2026-01-12 18:15:00

ALTER TABLE public.staff_details ADD COLUMN IF NOT EXISTS subjects TEXT[];

-- Ensure realtime (duplicate check is harmless/idempotent in previous scripts but good to keep if new table mainly)
-- staff_details is already in publication from previous steps.
