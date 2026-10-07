-- Migration: Password Reset Requests System
-- Allows any user (students, parents, faculty, ad managers, finance managers, stakeholders, admins)
-- to submit a password reset request from the login screen, which superadmin or institution admins can review and accept.

CREATE TABLE IF NOT EXISTS public.password_reset_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT,
    institution_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    admin_notes TEXT
);

-- Index for speedy queries by status, institution, and email
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status ON public.password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_inst ON public.password_reset_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_email ON public.password_reset_requests(email);

-- Enable RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Allow public insertion so unauthenticated users on login screen can request resets
DROP POLICY IF EXISTS "Public can submit password reset request" ON public.password_reset_requests;
CREATE POLICY "Public can submit password reset request" ON public.password_reset_requests
    FOR INSERT TO public WITH CHECK (true);

-- Allow reading requests (controlled in frontend by user role / institution scope)
DROP POLICY IF EXISTS "Public can view password reset requests" ON public.password_reset_requests;
CREATE POLICY "Public can view password reset requests" ON public.password_reset_requests
    FOR SELECT TO public USING (true);

-- Allow updates (approval/rejection)
DROP POLICY IF EXISTS "Public can update password reset requests" ON public.password_reset_requests;
CREATE POLICY "Public can update password reset requests" ON public.password_reset_requests
    FOR UPDATE TO public USING (true) WITH CHECK (true);
