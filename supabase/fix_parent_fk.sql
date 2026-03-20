-- FIX: Update leave_requests parent_id foreign key
-- This changes the reference from 'parents' table to 'profiles' table to ensure 
-- all parent users (who all have profiles) can successfully submit requests.

-- 1. Drop the existing constraint
ALTER TABLE public.leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_parent_id_fkey;

-- 2. Add the new constraint referencing public.profiles
ALTER TABLE public.leave_requests
ADD CONSTRAINT leave_requests_parent_id_fkey
FOREIGN KEY (parent_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- 3. Verify
SELECT 'Parent ID foreign key updated to reference profiles(id)' as status;
