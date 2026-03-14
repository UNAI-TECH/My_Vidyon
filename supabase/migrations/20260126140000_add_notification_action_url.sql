-- Add action_url column to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;

-- Add title column to special_timetable_slots for "Reason" tracking
ALTER TABLE public.special_timetable_slots ADD COLUMN IF NOT EXISTS title TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
