-- FIX: Update leave_requests status check constraint
-- This allows 'pending' as a valid status for new requests.

-- 1. Drop the old constraint (if it exists)
ALTER TABLE public.leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_status_check;

-- 2. Add the corrected constraint
ALTER TABLE public.leave_requests
ADD CONSTRAINT leave_requests_status_check
CHECK (status IN ('pending', 'recommended', 'approved', 'rejected'));

-- 3. Ensure default is 'pending'
ALTER TABLE public.leave_requests
ALTER COLUMN status SET DEFAULT 'pending';

-- 4. Verify leave_type column (just in case)
ALTER TABLE public.leave_requests
ADD COLUMN IF NOT EXISTS leave_type TEXT DEFAULT 'General';

-- 5. Final check
SELECT 'Database schema updated successfully!' as result;
