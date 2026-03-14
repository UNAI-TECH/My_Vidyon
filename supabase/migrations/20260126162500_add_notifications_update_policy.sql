-- Migration: Add UPDATE policy for notifications
-- Date: 2026-01-26
-- Purpose: Allow users to mark their own notifications as read

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
