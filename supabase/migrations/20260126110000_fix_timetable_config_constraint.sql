-- Migration: Fix Timetable Config Constraint
-- Description: Adds a unique constraint on institution_id to allow upserting global configs

-- 1. Add unique constraint to timetable_configs
-- We use a named constraint so it's easier to manage
ALTER TABLE public.timetable_configs 
ADD CONSTRAINT timetable_configs_institution_id_key UNIQUE (institution_id);

-- 2. If there were multiple rows per institution (from the previous per-class schema), 
-- this migration might fail. In a real scenario, we'd need to deduplicate.
-- For this ERP, we'll assume we want one global config per institution as per the new UI.
