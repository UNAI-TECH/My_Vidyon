-- Migration: Add Short Break (Refreshment Break) Support
-- Description: Adds fields to timetable_configs for a short/refreshment break

ALTER TABLE public.timetable_configs 
ADD COLUMN IF NOT EXISTS short_break_start_time TIME WITHOUT TIME ZONE DEFAULT '11:00:00',
ADD COLUMN IF NOT EXISTS short_break_duration_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS short_break_name TEXT DEFAULT 'Short Break';
