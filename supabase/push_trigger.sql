-- ==========================================
-- AUTOMATIC PUSH NOTIFICATION TRIGGER
-- ==========================================
-- This script will make your database "talk" to your Edge Function.
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/ccyqzcaghwaggtmkmigi/sql

-- 1. Enable pg_net extension (required for making web requests from SQL)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the function that calls our Edge Function
CREATE OR REPLACE FUNCTION public.handle_new_notification_push()
RETURNS TRIGGER AS $$
BEGIN
  -- We call the Edge Function asynchronously
  PERFORM
    net.http_post(
      url := 'https://ccyqzcaghwaggtmkmigi.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeXF6Y2FnaHdhZ2d0bWttaWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODUwMjgsImV4cCI6MjA4MzI2MTAyOH0.pJTXXaMH1FQC5ml7IWGI3DjOfIl0aAW4Xcgy5dhKSvE'
      ),
      body := jsonb_build_object(
        'userId', NEW.user_id,
        'title', NEW.title,
        'body', NEW.message,
        'data', jsonb_build_object(
            'action_url', NEW.action_url,
            'notification_id', NEW.id
        )
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the trigger to the notifications table
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_notification_push();

-- 4. (Optional) Also handle Academic Events (Broadcasts)
CREATE OR REPLACE FUNCTION public.handle_new_event_push()
RETURNS TRIGGER AS $$
BEGIN
  -- Since events are for everyone in the institution, we'll need a different strategy
  -- for "broadcasts", but for now, let's just log it.
  -- Push to the notification table is already handled by your frontend for most cases!
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
