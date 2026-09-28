-- ============================================================================
-- ADVANCED AD SPONSOR REVENUE, PRICING & FREQUENCY SYSTEM
-- ============================================================================
-- Features:
-- 1. No due dates: Ads run indefinitely until paid budget runs out (remaining_balance <= 0)
-- 2. Two Pricing Models: View Ad (cost_per_view) & Click Ad (cost_per_click) with custom prices
-- 3. Dashboard Targeting: Target 'all' (generic) or specific roles ('student', 'parent', 'faculty', 'institution')
-- 4. Impression & Click tracking with atomic debit functions
-- ============================================================================

-- 1. Add columns to academic_events for advanced sponsor ads & allow flexible dates
ALTER TABLE public.academic_events 
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ad_pricing_type VARCHAR(20) DEFAULT 'both', -- 'both', 'click', 'view'
ADD COLUMN IF NOT EXISTS cost_per_click NUMERIC(10, 2) DEFAULT 2.50,
ADD COLUMN IF NOT EXISTS cost_per_view NUMERIC(10, 2) DEFAULT 0.20,
ADD COLUMN IF NOT EXISTS cost_per_visit NUMERIC(10, 2) DEFAULT 2.50,
ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all', -- 'all', 'student', 'parent', 'faculty', 'institution'
ADD COLUMN IF NOT EXISTS amount_debited NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicks_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS visits_count INTEGER DEFAULT 0;

-- Drop NOT NULL on end_date to allow indefinite campaigns without explicit end dates
ALTER TABLE public.academic_events ALTER COLUMN end_date DROP NOT NULL;
ALTER TABLE public.academic_events ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE public.academic_events ALTER COLUMN event_date DROP NOT NULL;

-- 2. Backfill existing sponsored ads
UPDATE public.academic_events
SET 
  paid_amount = COALESCE(NULLIF(paid_amount, 0), 5000.00),
  cost_per_click = COALESCE(NULLIF(cost_per_click, 0), cost_per_visit, 2.50),
  cost_per_view = COALESCE(NULLIF(cost_per_view, 0), 0.20),
  cost_per_visit = COALESCE(NULLIF(cost_per_visit, 0), 2.50),
  ad_pricing_type = COALESCE(ad_pricing_type, 'both'),
  target_audience = COALESCE(target_audience, 'all'),
  amount_debited = COALESCE(amount_debited, 0),
  remaining_balance = CASE 
    WHEN remaining_balance IS NULL OR remaining_balance = 0 THEN COALESCE(NULLIF(paid_amount, 0), 5000.00) - COALESCE(amount_debited, 0)
    ELSE remaining_balance 
  END,
  views_count = COALESCE(views_count, 0),
  clicks_count = COALESCE(clicks_count, visits_count, 0),
  visits_count = COALESCE(visits_count, 0)
WHERE is_admin_added = true AND (event_type = 'sponsored' OR event_type IS NULL);

-- 3. Atomic Ad Click/Visit Debiting Function
CREATE OR REPLACE FUNCTION public.record_ad_click(p_ad_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ad RECORD;
  v_cost NUMERIC(10, 2);
  v_new_debited NUMERIC(10, 2);
  v_new_balance NUMERIC(10, 2);
BEGIN
  SELECT id, paid_amount, cost_per_click, cost_per_visit, ad_pricing_type, amount_debited, remaining_balance, clicks_count, visits_count
  INTO v_ad
  FROM public.academic_events
  WHERE id = p_ad_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ad campaign not found');
  END IF;

  -- Only debit click fee if ad allows clicks or is 'both'
  IF v_ad.ad_pricing_type = 'view' THEN
    v_cost := 0;
  ELSE
    v_cost := COALESCE(v_ad.cost_per_click, v_ad.cost_per_visit, 2.50);
  END IF;

  -- If remaining balance is already 0, do not debit further
  IF COALESCE(v_ad.paid_amount, 0) > 0 AND COALESCE(v_ad.remaining_balance, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Budget exhausted');
  END IF;

  -- Don't debit more than remaining balance
  IF COALESCE(v_ad.paid_amount, 0) > 0 THEN
    v_cost := LEAST(v_cost, COALESCE(v_ad.remaining_balance, v_cost));
  END IF;

  v_new_debited := COALESCE(v_ad.amount_debited, 0) + v_cost;

  IF COALESCE(v_ad.paid_amount, 0) > 0 THEN
    v_new_balance := GREATEST(0, v_ad.paid_amount - v_new_debited);
  ELSE
    v_new_balance := 0;
  END IF;

  UPDATE public.academic_events
  SET 
    amount_debited = v_new_debited,
    remaining_balance = v_new_balance,
    clicks_count = COALESCE(v_ad.clicks_count, 0) + 1,
    visits_count = COALESCE(v_ad.visits_count, 0) + 1
  WHERE id = p_ad_id;

  RETURN jsonb_build_object(
    'success', true,
    'ad_id', p_ad_id,
    'debited_amount', v_cost,
    'total_debited', v_new_debited,
    'remaining_balance', v_new_balance,
    'clicks_count', COALESCE(v_ad.clicks_count, 0) + 1
  );
END;
$$;

-- Alias for backwards compatibility with record_ad_visit
CREATE OR REPLACE FUNCTION public.record_ad_visit(p_ad_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.record_ad_click(p_ad_id);
END;
$$;

-- 4. Atomic Ad View (Impression) Debiting Function
CREATE OR REPLACE FUNCTION public.record_ad_view(p_ad_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ad RECORD;
  v_cost NUMERIC(10, 2);
  v_new_debited NUMERIC(10, 2);
  v_new_balance NUMERIC(10, 2);
BEGIN
  SELECT id, paid_amount, cost_per_view, ad_pricing_type, amount_debited, remaining_balance, views_count
  INTO v_ad
  FROM public.academic_events
  WHERE id = p_ad_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ad campaign not found');
  END IF;

  -- Only debit view fee if ad pricing type is 'view' or 'both'
  IF v_ad.ad_pricing_type = 'click' THEN
    v_cost := 0;
  ELSE
    v_cost := COALESCE(v_ad.cost_per_view, 0.20);
  END IF;

  -- If budget is exhausted, do not debit further
  IF COALESCE(v_ad.paid_amount, 0) > 0 AND COALESCE(v_ad.remaining_balance, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Budget exhausted');
  END IF;

  -- Don't debit more than remaining balance
  IF COALESCE(v_ad.paid_amount, 0) > 0 THEN
    v_cost := LEAST(v_cost, COALESCE(v_ad.remaining_balance, v_cost));
  END IF;

  v_new_debited := COALESCE(v_ad.amount_debited, 0) + v_cost;

  IF COALESCE(v_ad.paid_amount, 0) > 0 THEN
    v_new_balance := GREATEST(0, v_ad.paid_amount - v_new_debited);
  ELSE
    v_new_balance := 0;
  END IF;

  UPDATE public.academic_events
  SET 
    amount_debited = v_new_debited,
    remaining_balance = v_new_balance,
    views_count = COALESCE(v_ad.views_count, 0) + 1
  WHERE id = p_ad_id;

  RETURN jsonb_build_object(
    'success', true,
    'ad_id', p_ad_id,
    'debited_amount', v_cost,
    'total_debited', v_new_debited,
    'remaining_balance', v_new_balance,
    'views_count', COALESCE(v_ad.views_count, 0) + 1
  );
END;
$$;

-- 5. Permissions
GRANT EXECUTE ON FUNCTION public.record_ad_click(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_ad_visit(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_ad_view(UUID) TO authenticated, anon;

-- 6. Ensure publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'academic_events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.academic_events;
    END IF;
END $$;

-- ============================================================================
-- 7. AD LEADS & USER INQUIRY LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ad_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID REFERENCES public.academic_events(id) ON DELETE SET NULL,
    ad_title TEXT,
    user_id UUID,
    user_name TEXT,
    contact_number TEXT,
    user_email TEXT,
    user_role TEXT,
    institution_name TEXT,
    action_type TEXT DEFAULT 'click', -- 'click', 'inquiry'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_leads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and anon to insert leads
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public/authenticated insert to ad_leads" ON public.ad_leads;
    CREATE POLICY "Allow public/authenticated insert to ad_leads" 
    ON public.ad_leads FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all to view ad_leads" ON public.ad_leads;
    CREATE POLICY "Allow all to view ad_leads" 
    ON public.ad_leads FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow all to delete ad_leads" ON public.ad_leads;
    CREATE POLICY "Allow all to delete ad_leads" 
    ON public.ad_leads FOR DELETE USING (true);
END $$;

-- Atomic Lead Recording Function
CREATE OR REPLACE FUNCTION public.record_ad_lead(
    p_ad_id UUID,
    p_user_id UUID,
    p_user_name TEXT,
    p_contact_number TEXT,
    p_user_email TEXT,
    p_user_role TEXT,
    p_action_type TEXT DEFAULT 'click'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_title TEXT;
    v_lead_id UUID;
BEGIN
    -- Do not record admin or superadmin as leads
    IF LOWER(COALESCE(p_user_role, '')) IN ('admin', 'superadmin') THEN
        RETURN jsonb_build_object('success', false, 'reason', 'Admin accounts excluded from leads');
    END IF;

    SELECT title INTO v_title FROM public.academic_events WHERE id = p_ad_id;

    INSERT INTO public.ad_leads (
        ad_id, ad_title, user_id, user_name, contact_number, user_email, user_role, action_type
    ) VALUES (
        p_ad_id, COALESCE(v_title, 'Sponsored Campaign'), p_user_id, p_user_name, p_contact_number, p_user_email, p_user_role, p_action_type
    )
    RETURNING id INTO v_lead_id;

    RETURN jsonb_build_object('success', true, 'lead_id', v_lead_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_ad_lead TO authenticated, anon;

-- Clean up any existing test admin leads
DELETE FROM public.ad_leads WHERE LOWER(COALESCE(user_role, '')) IN ('admin', 'superadmin');

-- Ensure ad_leads in realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'ad_leads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_leads;
    END IF;
END $$;

