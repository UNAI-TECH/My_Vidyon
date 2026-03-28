-- =====================================================
-- ERP NOTIFICATION & STORAGE SYSTEM - FINAL FIXES
-- =====================================================

-- 1. HARDEN NOTIFICATION TRIGGERS
-- Run this to update the logic for Timetables, Exams, and Announcements
-- [Instructions]: Ensure you have the 'notification_automation.sql' updated from the codebase.
-- For convenience, the most critical fixes are below:

-- Harden Timetable Recipient Lookup
CREATE OR REPLACE FUNCTION public.on_timetable_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Notify Faculty
    IF NEW.faculty_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, action_url)
        VALUES (
            NEW.faculty_id,
            'Timetable Update',
            'Your timetable for ' || NEW.day_of_week || ' at ' || NEW.start_time || ' has been updated.',
            'timetable',
            '/(root)/faculty/timetable/index'
        );
    END IF;
    
    -- 2. Notify All Students in the Class (Robust Join)
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    SELECT s.id, 'Timetable Updated', 
           'Your timetable for ' || NEW.day_of_week || ' has been updated. Check the new schedule.', 
           'timetable', 
           '/(root)/student/timetable/index'
    FROM public.students s
    WHERE s.class_id = NEW.class_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ADD UNIQUE CONSTRAINT TO PUSH TOKENS
-- This allows the app to 'upsert' tokens correctly without duplicates.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_push_tokens_user_id_fcm_token_key'
    ) THEN
        ALTER TABLE public.user_push_tokens 
        ADD CONSTRAINT user_push_tokens_user_id_fcm_token_key 
        UNIQUE (user_id, fcm_token);
    END IF;
END $$;

-- 3. ENSURE REPORTS BUCKET ACCESS (RE-RUN IF NOT ALREADY FIXED)
-- This ensures the 'reports' folder is ready for Excel exports.
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for the bucket
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow Authenticated Uploads' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Allow Authenticated Uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reports');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow Authenticated Reads' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Allow Authenticated Reads" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'reports');
    END IF;
END $$;
