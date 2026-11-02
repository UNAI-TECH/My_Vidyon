-- ============================================================
-- Migration: Create onboarding_drafts table
-- Purpose: Persist in-progress institution onboarding drafts in Supabase database
-- ============================================================

CREATE TABLE IF NOT EXISTS public.onboarding_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    institution_name TEXT NOT NULL DEFAULT 'Untitled Institution',
    institution_code TEXT,
    institution_category TEXT NOT NULL DEFAULT 'school',
    step INT NOT NULL DEFAULT 1,
    draft_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_drafts_user ON public.onboarding_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_drafts_updated ON public.onboarding_drafts(updated_at DESC);

-- Row Level Security
ALTER TABLE public.onboarding_drafts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'onboarding_drafts' 
        AND schemaname = 'public' 
        AND policyname = 'Authenticated users manage onboarding drafts'
    ) THEN
        CREATE POLICY "Authenticated users manage onboarding drafts" 
        ON public.onboarding_drafts FOR ALL 
        TO authenticated 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

