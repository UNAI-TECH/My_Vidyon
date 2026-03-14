-- Migration: Add support for multiple breaks
-- Description: Adds a JSONB column to store multiple refreshment breaks

ALTER TABLE public.timetable_configs
ADD COLUMN IF NOT EXISTS extra_breaks JSONB DEFAULT '[]'::jsonb;
