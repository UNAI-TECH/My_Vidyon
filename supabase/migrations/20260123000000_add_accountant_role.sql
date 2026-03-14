-- Add 'accountant' to user_role enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid WHERE typname = 'user_role' AND enumlabel = 'accountant') THEN
        ALTER TYPE user_role ADD VALUE 'accountant';
    END IF;
END$$;

-- Create accountants table
CREATE TABLE IF NOT EXISTS public.accountants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(profile_id)
);

-- RLS for accountants
ALTER TABLE public.accountants ENABLE ROW LEVEL SECURITY;

-- Policies for accountants table
-- Institution admins can view/manage accountants
CREATE POLICY "Institution admins can manage accountants" ON public.accountants
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE public.profiles.id = auth.uid()
            AND public.profiles.role IN ('institution', 'admin')
            AND public.profiles.institution_id = public.accountants.institution_id
        )
    );

-- Accountants can view their own record
CREATE POLICY "Accountants can view own record" ON public.accountants
    FOR SELECT
    USING (auth.uid() = profile_id);
