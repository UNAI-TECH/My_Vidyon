CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Attendance', 'Performance', 'Financial', etc.
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed'
    url TEXT -- URL to the file in storage (optional for now)
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.reports;
CREATE POLICY "Enable all access for authenticated users" ON public.reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reports') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
    END IF;
END $$;
