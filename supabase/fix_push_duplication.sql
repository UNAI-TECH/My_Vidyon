-- =====================================================
-- FIX DUPLICATE PUSH NOTIFICATIONS
-- =====================================================
-- Problem: Users receive each push notification TWICE.
-- Root Cause: The Edge Function is called TWICE per notification insert:
--   1. By the SQL trigger `on_notification_created` (via pg_net.http_post)
--   2. By a Supabase Dashboard Database Webhook (if configured)
--
-- This script:
--   A) Drops the SQL-based pg_net trigger (we keep the Dashboard Webhook OR vice versa)
--   B) Cleans up duplicate push tokens in user_push_tokens
--   C) Adds a device_id column for proper per-device upsert
--   D) Adds a pushed_at column to notifications for idempotency
--
-- IMPORTANT: After running this, go to Supabase Dashboard -> Database -> Webhooks
--            and DELETE any webhook on the `notifications` table if it exists.
--            We will keep ONLY the SQL trigger as the single source.
-- =====================================================

-- =====================================================
-- STEP 1: Drop and recreate the push trigger cleanly
-- =====================================================
-- First, drop the old trigger to stop double-firing
DROP TRIGGER IF EXISTS on_notification_created ON public.notifications;

-- Recreate a clean, idempotent push function
CREATE OR REPLACE FUNCTION public.handle_new_notification_push()
RETURNS TRIGGER AS $$
BEGIN
  -- Guard: skip if already pushed (idempotency)
  IF NEW.pushed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Mark as pushed BEFORE calling the Edge Function
  -- This prevents re-entry if the trigger fires again
  UPDATE public.notifications SET pushed_at = NOW() WHERE id = NEW.id;

  -- Call the Edge Function asynchronously via pg_net
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

-- Reattach — single trigger, single firing
CREATE TRIGGER on_notification_created
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_notification_push();


-- =====================================================
-- STEP 2: Add pushed_at column for idempotency
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'pushed_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN pushed_at TIMESTAMPTZ DEFAULT NULL;
    COMMENT ON COLUMN public.notifications.pushed_at IS 'Timestamp when push was sent. NULL means not yet pushed.';
  END IF;
END $$;


-- =====================================================
-- STEP 3: Add device_id to user_push_tokens
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_push_tokens' 
    AND column_name = 'device_id'
  ) THEN
    ALTER TABLE public.user_push_tokens ADD COLUMN device_id TEXT;
    COMMENT ON COLUMN public.user_push_tokens.device_id IS 'Unique device identifier to prevent duplicate tokens per device.';
  END IF;
END $$;

-- Add a unique constraint on (user_id, device_id) so each device has exactly one token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_push_tokens_user_device_key'
  ) THEN
    -- First, clean up any existing duplicates by keeping only the newest token per user
    DELETE FROM public.user_push_tokens a
    USING public.user_push_tokens b
    WHERE a.user_id = b.user_id
    AND a.fcm_token = b.fcm_token
    AND a.created_at < b.created_at;

    -- Now add the constraint (user_id + fcm_token must be unique)
    -- The original constraint may already exist, so wrap in exception handler
    BEGIN
      ALTER TABLE public.user_push_tokens
        ADD CONSTRAINT user_push_tokens_user_device_key UNIQUE (user_id, device_id);
    EXCEPTION WHEN duplicate_table THEN
      NULL; -- constraint already exists
    END;
  END IF;
END $$;


-- =====================================================
-- STEP 4: Clean up stale/duplicate tokens
-- =====================================================
-- Remove tokens older than 60 days (likely expired FCM tokens)
DELETE FROM public.user_push_tokens
WHERE last_used_at < NOW() - INTERVAL '60 days';

-- Remove exact duplicate rows (same user_id + fcm_token), keep newest
DELETE FROM public.user_push_tokens a
USING public.user_push_tokens b
WHERE a.user_id = b.user_id
AND a.fcm_token = b.fcm_token
AND a.id != b.id
AND a.created_at < b.created_at;


-- =====================================================
-- STEP 5: Verify — list active triggers on notifications
-- =====================================================
SELECT tgname, tgtype, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'public.notifications'::regclass
AND NOT t.tgisinternal;
