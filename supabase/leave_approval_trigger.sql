-- =============================================================
-- leave_approval_trigger.sql
-- Run this in the Supabase SQL Editor to enable auto-notifications
-- on leave request INSERT / UPDATE.
-- =============================================================

-- ─── 1. Ensure notifications table has all needed columns ───
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ─── 2. Ensure leave_requests has leave_type column ───
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS leave_type TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS assigned_class_teacher_id UUID;

-- ─── 3. Trigger function ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_leave_request_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_name  TEXT;
  v_faculty_id    UUID;
BEGIN
  -- Get student name from students or profiles
  SELECT COALESCE(p.full_name, p.email, 'A student')
    INTO v_student_name
    FROM profiles p
   WHERE p.id = NEW.student_id
   LIMIT 1;

  -- ── On INSERT: notify the assigned class teacher / faculty ──
  IF TG_OP = 'INSERT' THEN
    -- Auto-lookup teacher if not provided
    IF NEW.assigned_class_teacher_id IS NULL THEN
        SELECT fs.faculty_profile_id INTO NEW.assigned_class_teacher_id
        FROM public.students s
        JOIN public.classes c ON c.name = s.class_name
        JOIN public.faculty_subjects fs ON fs.class_id = c.id
        WHERE s.id = NEW.student_id
        AND fs.assignment_type = 'class_teacher'
        AND (s.section = ANY(c.sections) OR s.section IS NULL)
        LIMIT 1;
    END IF;

    -- Use assigned_class_teacher_id if present
    IF NEW.assigned_class_teacher_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, read, metadata, action_url)
      VALUES (
        NEW.assigned_class_teacher_id,
        'New Leave Request',
        COALESCE(v_student_name, 'A student') || ' has requested leave from '
          || TO_CHAR(NEW.from_date, 'Mon DD') || ' to ' || TO_CHAR(NEW.to_date, 'Mon DD'),
        'leave',
        FALSE,
        jsonb_build_object('leave_id', NEW.id, 'student_id', NEW.student_id),
        '/(root)/faculty/leave'
      );
    END IF;

    -- Also notify institution admins via a broadcast-style entry (user_id = student's institution admin)
    -- (Optional: extend here if you store institution admin user IDs)

  -- ── On UPDATE (status change): notify the student ───────────
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify the student
    INSERT INTO public.notifications (user_id, title, message, type, read, metadata, action_url)
    VALUES (
      NEW.student_id,
      CASE NEW.status
        WHEN 'approved' THEN 'Leave Approved ✅'
        WHEN 'rejected' THEN 'Leave Rejected ❌'
        WHEN 'recommended' THEN 'Leave Recommended 🔄'
        ELSE 'Leave Status Updated'
      END,
      'Your leave request for ' || TO_CHAR(NEW.from_date, 'Mon DD') || '–' || TO_CHAR(NEW.to_date, 'Mon DD')
        || ' has been ' || NEW.status || '.',
      'leave',
      FALSE,
      jsonb_build_object('leave_id', NEW.id, 'status', NEW.status),
      '/(root)/student/leave/index'
    );

    -- If there's a parent_id, notify the parent too
    IF NEW.parent_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, read, metadata, action_url)
      VALUES (
        NEW.parent_id,
        CASE NEW.status
          WHEN 'approved' THEN 'Child''s Leave Approved ✅'
          WHEN 'rejected' THEN 'Child''s Leave Rejected ❌'
          ELSE 'Child''s Leave Status Updated'
        END,
        'Leave request for ' || TO_CHAR(NEW.from_date, 'Mon DD') || '–' || TO_CHAR(NEW.to_date, 'Mon DD')
          || ' has been ' || NEW.status || '.',
        'leave',
        FALSE,
        jsonb_build_object('leave_id', NEW.id, 'status', NEW.status, 'student_id', NEW.student_id),
        '/(root)/parent/index'
      );
    END IF;

    -- Set updated_at
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- ─── 4. Attach trigger to leave_requests ─────────────────────
DROP TRIGGER IF EXISTS trg_leave_request_notification ON public.leave_requests;

CREATE TRIGGER trg_leave_request_notification
  BEFORE INSERT OR UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_leave_request_notification();

-- ─── 5. RLS: allow students to insert their own requests ─────
DROP POLICY IF EXISTS "Students can insert own leave requests" ON public.leave_requests;
CREATE POLICY "Students can insert own leave requests"
  ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Students see only their own requests
DROP POLICY IF EXISTS "Students view own leave requests" ON public.leave_requests;
CREATE POLICY "Students view own leave requests"
  ON public.leave_requests
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Faculty see leaves assigned to them
DROP POLICY IF EXISTS "Faculty view assigned leaves" ON public.leave_requests;
CREATE POLICY "Faculty view assigned leaves"
  ON public.leave_requests
  FOR SELECT TO authenticated
  USING (assigned_class_teacher_id = auth.uid());

-- Faculty/Institution can update status
DROP POLICY IF EXISTS "Faculty update leave status" ON public.leave_requests;
CREATE POLICY "Faculty update leave status"
  ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (assigned_class_teacher_id = auth.uid() OR
         EXISTS (
           SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
         ))
  WITH CHECK (TRUE);

-- Notifications: users read own
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications"
  ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());


-- Leave approval trigger and policies created successfully.
