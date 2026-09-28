-- ============================================================================
-- FIX LEAVE REQUEST ROUTING & CLASS TEACHER RESOLUTION
-- ============================================================================
-- Fixes the issue where student leave requests were cross-assigned to teachers
-- from different institutions because the old function did not filter by institution_id.
-- ============================================================================

-- 1. Ensure institution_id column exists on leave_requests
ALTER TABLE public.leave_requests
ADD COLUMN IF NOT EXISTS institution_id TEXT;

CREATE INDEX IF NOT EXISTS idx_leave_requests_institution_id
ON public.leave_requests(institution_id);

CREATE INDEX IF NOT EXISTS idx_leave_requests_assigned_teacher
ON public.leave_requests(assigned_class_teacher_id, status);

-- 2. Fixed get_student_class_teacher function (matches SAME institution)
CREATE OR REPLACE FUNCTION public.get_student_class_teacher(student_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id uuid;
  v_student_inst text;
  v_student_class text;
  v_student_section text;
  v_class_id uuid;
  v_class_teacher_id uuid;
BEGIN
  -- Fetch student's institution, class_name, and section
  SELECT institution_id, class_name, section
  INTO v_student_inst, v_student_class, v_student_section
  FROM public.students
  WHERE id = student_uuid;

  IF v_student_inst IS NULL OR v_student_class IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. Find matching class in the SAME institution
  SELECT id, class_teacher_id
  INTO v_class_id, v_class_teacher_id
  FROM public.classes
  WHERE institution_id = v_student_inst
    AND name = v_student_class
  LIMIT 1;

  -- 2. Check faculty_subjects for class_teacher assignment in the same class & section
  IF v_class_id IS NOT NULL THEN
    SELECT faculty_profile_id
    INTO v_teacher_id
    FROM public.faculty_subjects
    WHERE class_id = v_class_id
      AND (section = v_student_section OR section IS NULL OR section = '' OR v_student_section IS NULL)
      AND assignment_type = 'class_teacher'
    LIMIT 1;

    IF v_teacher_id IS NOT NULL THEN
      RETURN v_teacher_id;
    END IF;

    -- 3. Fallback to class_teacher_id directly on the class row
    IF v_class_teacher_id IS NOT NULL THEN
      RETURN v_class_teacher_id;
    END IF;
  END IF;

  -- 4. Fallback: match by classes and faculty_subjects filtered by student's institution
  SELECT fs.faculty_profile_id
  INTO v_teacher_id
  FROM public.classes c
  JOIN public.faculty_subjects fs ON fs.class_id = c.id
  WHERE c.institution_id = v_student_inst
    AND c.name = v_student_class
    AND (fs.section = v_student_section OR fs.section IS NULL OR v_student_section IS NULL)
    AND fs.assignment_type = 'class_teacher'
  LIMIT 1;

  RETURN v_teacher_id;
END;
$$;

-- 3. Trigger to automatically assign the correct class teacher and institution_id on insert
CREATE OR REPLACE FUNCTION public.assign_class_teacher_to_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inst text;
BEGIN
  -- Automatically assign the student's class teacher if missing
  IF NEW.student_id IS NOT NULL AND NEW.assigned_class_teacher_id IS NULL THEN
    NEW.assigned_class_teacher_id := public.get_student_class_teacher(NEW.student_id);
  END IF;

  -- Ensure institution_id is populated from student
  IF NEW.student_id IS NOT NULL AND (NEW.institution_id IS NULL OR NEW.institution_id = '') THEN
    SELECT institution_id INTO v_inst FROM public.students WHERE id = NEW.student_id;
    IF v_inst IS NOT NULL THEN
      NEW.institution_id := v_inst;
    END IF;
  END IF;

  -- Ensure institution_id is populated from staff for faculty leaves
  IF NEW.staff_id IS NOT NULL AND (NEW.institution_id IS NULL OR NEW.institution_id = '') THEN
    SELECT institution_id INTO v_inst FROM public.profiles WHERE id = NEW.staff_id;
    IF v_inst IS NOT NULL THEN
      NEW.institution_id := v_inst;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_class_teacher ON public.leave_requests;

CREATE TRIGGER trigger_assign_class_teacher
BEFORE INSERT ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.assign_class_teacher_to_leave();

-- 4. Clean up all legacy policies and apply strict institution-isolated RLS policies
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Faculty view class leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Institution manages leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users view own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Students view own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Staff can view own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Staff can insert own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Institution managers can handle all leaves" ON public.leave_requests;
DROP POLICY IF EXISTS "Faculty can view assigned student leaves" ON public.leave_requests;
DROP POLICY IF EXISTS "Enable read/write for authenticated users" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_select_policy" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_insert_policy" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_update_policy" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_delete_policy" ON public.leave_requests;

-- INSERT POLICY (Allows staff, parents, students, and admins to submit requests)
CREATE POLICY "leave_requests_insert_policy"
ON public.leave_requests
FOR INSERT TO authenticated
WITH CHECK (
  -- 1. Staff inserting their own leave request
  (staff_id = auth.uid())
  OR
  -- 2. Parent inserting leave request for their child
  (parent_id = auth.uid())
  OR
  (student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid()))
  OR
  -- 3. Student inserting their own leave request
  (student_id = auth.uid())
  OR
  (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid() OR profile_id = auth.uid()))
  OR
  -- 4. Institution manager / Admin
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'institution')
  )
);

-- SELECT POLICY (Strictly scoped by user and institution)
CREATE POLICY "leave_requests_select_policy"
ON public.leave_requests
FOR SELECT TO authenticated
USING (
  -- 1. Student viewing their own leave requests
  (auth.uid() = student_id)
  OR
  (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid() OR profile_id = auth.uid()))
  OR
  -- 2. Parent viewing their children's leave requests
  (auth.uid() = parent_id)
  OR
  (student_id IN (SELECT id FROM public.students WHERE parent_id = auth.uid()))
  OR
  -- 3. Staff viewing their own leave requests
  (auth.uid() = staff_id)
  OR
  -- 4. Faculty assigned as class teacher (strictly in the same institution)
  (
    auth.uid() = assigned_class_teacher_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.institution_id = leave_requests.institution_id
    )
  )
  OR
  -- 5. Admin / Institution manager in the same institution
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.institution_id = leave_requests.institution_id
    AND p.role IN ('admin', 'institution')
  )
);

-- UPDATE POLICY (Faculty and Admin approval/rejection)
CREATE POLICY "leave_requests_update_policy"
ON public.leave_requests
FOR UPDATE TO authenticated
USING (
  -- 1. Faculty assigned as class teacher in the same institution
  (
    auth.uid() = assigned_class_teacher_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.institution_id = leave_requests.institution_id
    )
  )
  OR
  -- 2. Admin / Institution manager in the same institution
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.institution_id = leave_requests.institution_id
    AND p.role IN ('admin', 'institution')
  )
);

-- DELETE POLICY
CREATE POLICY "leave_requests_delete_policy"
ON public.leave_requests
FOR DELETE TO authenticated
USING (
  (staff_id = auth.uid() AND status = 'pending')
  OR
  (parent_id = auth.uid() AND status = 'pending')
  OR
  (student_id = auth.uid() AND status = 'pending')
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.institution_id = leave_requests.institution_id
    AND p.role IN ('admin', 'institution')
  )
);

-- 5. Backfill all existing leave requests to the right class teacher and institution
UPDATE public.leave_requests lr
SET assigned_class_teacher_id = COALESCE(public.get_student_class_teacher(lr.student_id), lr.assigned_class_teacher_id),
    institution_id = COALESCE(lr.institution_id, (SELECT institution_id FROM public.students s WHERE s.id = lr.student_id))
WHERE lr.student_id IS NOT NULL;

