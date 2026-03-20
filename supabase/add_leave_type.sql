-- Migration: Add leave_type to leave_requests
-- Date: 2026-03-20

ALTER TABLE public.leave_requests
ADD COLUMN IF NOT EXISTS leave_type TEXT DEFAULT 'General';

-- Verify the column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leave_requests' AND column_name = 'leave_type'
    ) THEN
        RAISE NOTICE 'Column leave_type successfully added to leave_requests';
    ELSE
        RAISE EXCEPTION 'Failed to add column leave_type';
    END IF;
END $$;
