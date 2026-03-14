-- Super Admin Dashboard Infrastructure

-- 1. Table for Platform-wide Activities (Audit Logs)
CREATE TABLE IF NOT EXISTS public.platform_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'success', 'info', 'warning', 'destructive', 'default'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Table for Revenue / Subscriptions tracking
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'active',
  billing_cycle TEXT DEFAULT 'monthly',
  next_billing_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Enable RLS
ALTER TABLE public.platform_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Admin only would be better, but keeping simple for now)
CREATE POLICY "Allow read for all auth users" ON public.platform_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for all auth users" ON public.subscriptions FOR SELECT TO authenticated USING (true);

-- 5. Helper function for logging activity
CREATE OR REPLACE FUNCTION public.log_platform_activity(
  _action TEXT,
  _target TEXT,
  _type TEXT DEFAULT 'info',
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.platform_activities (action, target, type, metadata)
  VALUES (_action, _target, _type, _metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Triggers for Automatic Data Logging

-- Log New Institution
CREATE OR REPLACE FUNCTION public.tr_log_new_institution()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_platform_activity(
    'New Institution Registered',
    NEW.name,
    'success',
    jsonb_build_object('institution_id', NEW.institution_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_institution_created ON public.institutions;
CREATE TRIGGER on_institution_created
  AFTER INSERT ON public.institutions
  FOR EACH ROW EXECUTE PROCEDURE public.tr_log_new_institution();

-- Log New User (via profiles)
CREATE OR REPLACE FUNCTION public.tr_log_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_platform_activity(
    'New User Provisioned',
    NEW.full_name || ' (' || NEW.role || ')',
    'info',
    jsonb_build_object('user_id', NEW.id, 'role', NEW.role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.tr_log_new_profile();

-- Log New Student
CREATE OR REPLACE FUNCTION public.tr_log_new_student()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_platform_activity(
    'Student Enrolled',
    NEW.name || ' (Reg: ' || NEW.register_number || ')',
    'success',
    jsonb_build_object('student_id', NEW.id, 'class', NEW.class_name)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_student_created ON public.students;
CREATE TRIGGER on_student_created
  AFTER INSERT ON public.students
  FOR EACH ROW EXECUTE PROCEDURE public.tr_log_new_student();

-- 7. ENABLE REALTIME for everything
-- Note: This is usually done in the Supabase Dashboard, but can be done via SQL
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.institutions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
