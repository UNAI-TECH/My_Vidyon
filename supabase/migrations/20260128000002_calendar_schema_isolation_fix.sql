-- Migration: Re-Sync Academic Events Schema & Isolation
-- This script ensures academic_events matches the user's requested schema and adds multi-tenant isolation.
-- STRICTLY uses 'institution_id' (TEXT) as the foreign key column as requested.

-- 1. Drop existing table to ensure fresh start with the user's provided schema
DROP TABLE IF EXISTS public.academic_events CASCADE;

-- 2. Create academic_events table as requested by the user
CREATE TABLE public.academic_events (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  institution_id text NOT NULL,
  title text NOT NULL,
  description text NULL,
  event_type text NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  created_at timestamp with time zone NULL DEFAULT timezone ('utc'::text, now()),
  category text NULL,
  banner_url text NULL,
  event_date date NULL,
  CONSTRAINT academic_events_pkey PRIMARY KEY (id),
  CONSTRAINT academic_events_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions (institution_id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 3. Create indexes as requested
CREATE INDEX IF NOT EXISTS idx_academic_events_institution ON public.academic_events USING btree (institution_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_academic_events_date ON public.academic_events USING btree (event_date) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_academic_events_banner_url ON public.academic_events USING btree (banner_url) TABLESPACE pg_default WHERE (banner_url IS NOT NULL);

-- 4. Enable Row Level Security (Isolation)
ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policy for Isolation
-- This policy ensures users only see events for THEIR institution.
-- It resolves the user's UUID (from profiles/auth) to the Institution's Text Code.
CREATE POLICY "Institution isolation for academic events"
ON public.academic_events
FOR ALL
USING (
  institution_id IN (
    SELECT p.institution_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
);

-- 6. Seed Holidays (Aligning with user's provided calendar screenshot)
DO $$ 
DECLARE 
    inst RECORD;
BEGIN 
    -- Iterate through institutions and insert events using their TEXT ID
    FOR inst IN SELECT institution_id FROM public.institutions LOOP
        -- Jan 1-2: New Year Holiday
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date, event_date)
        VALUES (inst.institution_id, 'New Year Holiday', 'School closed for New Year', 'holiday', 'General', '2026-01-01 00:00:00+00', '2026-01-02 23:59:59+00', '2026-01-01')
        ON CONFLICT DO NOTHING;

        -- Jan 14-17: Pongal / Makar Sankranti
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date, event_date)
        VALUES (inst.institution_id, 'Pongal / Makar Sankranti', 'Harvest festival holidays', 'holiday', 'Festival', '2026-01-14 00:00:00+00', '2026-01-17 23:59:59+00', '2026-01-14')
        ON CONFLICT DO NOTHING;

        -- Jan 26-27: Republic Day
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date, event_date)
        VALUES (inst.institution_id, 'Republic Day', 'Republic Day Celebration & Holiday', 'holiday', 'National', '2026-01-26 00:00:00+00', '2026-01-27 23:59:59+00', '2026-01-26')
        ON CONFLICT DO NOTHING;

        -- Mar 13: Holi
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date, event_date)
        VALUES (inst.institution_id, 'Holi', 'Festival of colors holiday', 'holiday', 'Festival', '2026-03-13 00:00:00+00', '2026-03-13 23:59:59+00', '2026-03-13')
        ON CONFLICT DO NOTHING;

        -- Aug 15: Independence Day
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date, event_date)
        VALUES (inst.institution_id, 'Independence Day', 'Independence Day Celebration & Holiday', 'holiday', 'National', '2026-08-15 00:00:00+00', '2026-08-15 23:59:59+00', '2026-08-15')
        ON CONFLICT DO NOTHING;

        -- Oct 2: Gandhi Jayanti
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date, event_date)
        VALUES (inst.institution_id, 'Gandhi Jayanti', 'Mahatma Gandhi Birthday holiday', 'holiday', 'National', '2026-10-02 00:00:00+00', '2026-10-02 23:59:59+00', '2026-10-02')
        ON CONFLICT DO NOTHING;

        -- Oct 29 - Nov 1: Diwali
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date, event_date)
        VALUES (inst.institution_id, 'Diwali', 'Festival of lights holidays', 'holiday', 'Festival', '2026-10-29 00:00:00+00', '2026-11-01 23:59:59+00', '2026-10-29')
        ON CONFLICT DO NOTHING;

        -- Dec 25: Christmas
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date, event_date)
        VALUES (inst.institution_id, 'Christmas', 'Christmas holiday', 'holiday', 'Festival', '2026-12-25 00:00:00+00', '2026-12-25 23:59:59+00', '2026-12-25')
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
