-- Migration: Fix Notifications RLS
-- Date: 2026-01-26

-- Allow authenticated users with admin/faculty roles to create notifications
-- This is necessary for timetable updates, leave approvals, etc.

DROP POLICY IF EXISTS "Authorized users can insert notifications" ON public.notifications;

CREATE POLICY "Authorized users can insert notifications" 
ON public.notifications 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'institution', 'faculty')
  )
);

-- Allow users to view their own notifications
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;

CREATE POLICY "Users view own notifications" 
ON public.notifications 
FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid()
);
