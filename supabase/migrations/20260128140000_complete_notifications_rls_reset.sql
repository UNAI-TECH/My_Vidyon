-- COMPLETE RLS RESET FOR NOTIFICATIONS TABLE
-- Run this to completely reset and fix notification policies

-- Step 1: Disable RLS temporarily to clear everything
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.notifications';
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new simple policies

-- Allow ANY authenticated user to insert notifications
CREATE POLICY "allow_authenticated_insert"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view their own notifications
CREATE POLICY "allow_own_select"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to update their own notifications
CREATE POLICY "allow_own_update"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own notifications
CREATE POLICY "allow_own_delete"
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
