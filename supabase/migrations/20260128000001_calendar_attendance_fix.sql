-- Migration: Calendar & Attendance Fix
-- Date: 2026-01-28 00:00:01

-- 1. Add academic year start/end dates to institutions
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS academic_year_start DATE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS academic_year_end DATE;

-- 2. Update existing institutions with a default academic year (optional)
UPDATE public.institutions 
SET academic_year_start = '2025-06-01', academic_year_end = '2026-04-15'
WHERE academic_year_start IS NULL;

-- 3. Seed common Indian Holidays for 2026 into academic_events for ALL institutions
-- Using a DO block to loop through all institutions
DO $$ 
DECLARE 
    inst RECORD;
BEGIN 
    FOR inst IN SELECT institution_id FROM public.institutions LOOP
        -- Jan 1: New Year
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date)
        VALUES (inst.institution_id, 'New Year Holliday', 'School closed for New Year', 'holiday', 'General', '2026-01-01 00:00:00+00', '2026-01-01 23:59:59+00')
        ON CONFLICT DO NOTHING;

        -- Jan 14: Pongal / Makar Sankranti
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date)
        VALUES (inst.institution_id, 'Pongal / Makar Sankranti', 'Harvest festival holidays', 'holiday', 'Festival', '2026-01-14 00:00:00+00', '2026-01-16 23:59:59+00')
        ON CONFLICT DO NOTHING;

        -- Jan 26: Republic Day
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date)
        VALUES (inst.institution_id, 'Republic Day', 'Republic Day Celebration & Holiday', 'holiday', 'National', '2026-01-26 00:00:00+00', '2026-01-26 23:59:59+00')
        ON CONFLICT DO NOTHING;

        -- Mar 13: Holi
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date)
        VALUES (inst.institution_id, 'Holi', 'Festival of colors holiday', 'holiday', 'Festival', '2026-03-13 00:00:00+00', '2026-03-13 23:59:59+00')
        ON CONFLICT DO NOTHING;

        -- Aug 15: Independence Day
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date)
        VALUES (inst.institution_id, 'Independence Day', 'Independence Day Celebration & Holiday', 'holiday', 'National', '2026-08-15 00:00:00+00', '2026-08-15 23:59:59+00')
        ON CONFLICT DO NOTHING;

        -- Oct 2: Gandhi Jayanti
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date)
        VALUES (inst.institution_id, 'Gandhi Jayanti', 'Mahatma Gandhi Birthday holiday', 'holiday', 'National', '2026-10-02 00:00:00+00', '2026-10-02 23:59:59+00')
        ON CONFLICT DO NOTHING;

        -- Oct 29: Diwali
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date)
        VALUES (inst.institution_id, 'Diwali', 'Festival of lights holidays', 'holiday', 'Festival', '2026-10-29 00:00:00+00', '2026-11-01 23:59:59+00')
        ON CONFLICT DO NOTHING;

        -- Dec 25: Christmas
        INSERT INTO public.academic_events (institution_id, title, description, event_type, category, start_date, end_date)
        VALUES (inst.institution_id, 'Christmas', 'Christmas holiday', 'holiday', 'Festival', '2026-12-25 00:00:00+00', '2026-12-25 23:59:59+00')
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
