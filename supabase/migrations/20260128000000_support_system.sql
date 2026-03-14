-- Migration: Support Query System
-- Date: 2026-01-28

-- 1. Create support_queries table
CREATE TABLE IF NOT EXISTS public.support_queries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    screenshot_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Enable RLS
ALTER TABLE public.support_queries ENABLE ROW LEVEL SECURITY;

-- Policies: 
-- Non-auth users can insert (for login page modal)
-- Institution admins can read their own institution's queries
DROP POLICY IF EXISTS "Anyone can insert support queries" ON public.support_queries;
CREATE POLICY "Anyone can insert support queries" ON public.support_queries
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view their institution's queries" ON public.support_queries;
CREATE POLICY "Admins can view their institution's queries" ON public.support_queries
    FOR SELECT TO authenticated
    USING ( institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'institution')) );

-- 2.1 Allow public to read institutions (required for support query routing on login page)
DROP POLICY IF EXISTS "Allow public read for institution lookup" ON public.institutions;
CREATE POLICY "Allow public read for institution lookup" ON public.institutions
    FOR SELECT TO public
    USING (true);

DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Anyone can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 3. Create storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Allow public upload to support-attachments" ON storage.objects;
CREATE POLICY "Allow public upload to support-attachments"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'support-attachments');

DROP POLICY IF EXISTS "Allow public read from support-attachments" ON storage.objects;
CREATE POLICY "Allow public read from support-attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'support-attachments');

-- 4. Add metadata column to notifications if it doesn't exist
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 5. Realtime
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_queries') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_queries;
    END IF;
END $$;
