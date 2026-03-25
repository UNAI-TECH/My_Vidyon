-- Academic Year Promotion Feature — Migration Script
-- Run this in Supabase SQL Editor

-- 1. Create promotion_requests table
CREATE TABLE IF NOT EXISTS public.promotion_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id text NOT NULL,
  from_year text NOT NULL,
  to_year text NOT NULL,
  status text DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid,
  notes text,
  CONSTRAINT promotion_requests_pkey PRIMARY KEY (id),
  CONSTRAINT promotion_requests_institution_id_fkey
    FOREIGN KEY (institution_id) REFERENCES public.institutions(institution_id)
);

-- 2. Add class_order and is_final_class to classes table
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS class_order integer DEFAULT 0;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS is_final_class boolean DEFAULT false;

-- 3. Enable RLS on promotion_requests
ALTER TABLE public.promotion_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for promotion_requests
DROP POLICY IF EXISTS "Allow authenticated read" ON public.promotion_requests;
CREATE POLICY "Allow authenticated read" ON public.promotion_requests
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.promotion_requests;
CREATE POLICY "Allow authenticated insert" ON public.promotion_requests
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update" ON public.promotion_requests;
CREATE POLICY "Allow authenticated update" ON public.promotion_requests
  FOR UPDATE TO authenticated USING (true);

-- 5. Create the promote_institution RPC function
CREATE OR REPLACE FUNCTION public.promote_institution(
  p_institution_id text,
  p_from_year text,
  p_to_year text,
  p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group RECORD;
  v_class RECORD;
  v_new_group_id uuid;
  v_new_class_id uuid;
  v_student RECORD;
  v_next_class RECORD;
  v_promoted_count integer := 0;
  v_alumni_count integer := 0;
  v_staff_count integer := 0;
  v_class_map jsonb := '{}'::jsonb;
BEGIN
  -- 0. Clean up destination year data in case of re-run
  DELETE FROM public.timetable_configs WHERE institution_id = p_institution_id AND academic_year = p_to_year;
  DELETE FROM public.faculty_subjects WHERE institution_id = p_institution_id AND academic_year = p_to_year;
  DELETE FROM public.fee_structures WHERE institution_id = p_institution_id AND academic_year = p_to_year;
  DELETE FROM public.classes WHERE academic_year = p_to_year AND group_id IN (SELECT id FROM public.groups WHERE institution_id = p_institution_id);
  DELETE FROM public.groups WHERE institution_id = p_institution_id AND academic_year = p_to_year;

  -- 1. Update institution academic year
  UPDATE public.institutions
  SET current_academic_year = p_to_year,
      academic_year = p_to_year
  WHERE institution_id = p_institution_id;

  -- 2. Clone groups for new year
  FOR v_group IN
    SELECT * FROM public.groups
    WHERE institution_id = p_institution_id
      AND (academic_year = p_from_year OR academic_year IS NULL)
  LOOP
    v_new_group_id := gen_random_uuid();
    INSERT INTO public.groups (id, institution_id, name, academic_year)
    VALUES (v_new_group_id, p_institution_id, v_group.name, p_to_year);

    -- Clone classes within each group
    FOR v_class IN
      SELECT * FROM public.classes
      WHERE group_id = v_group.id
        AND (academic_year = p_from_year OR academic_year IS NULL)
    LOOP
      v_new_class_id := gen_random_uuid();
      INSERT INTO public.classes (id, group_id, name, sections, class_order, is_final_class, academic_year)
      VALUES (v_new_class_id, v_new_group_id, v_class.name, v_class.sections, v_class.class_order, v_class.is_final_class, p_to_year);

      -- Store mapping: old class name → new class id
      v_class_map := v_class_map || jsonb_build_object(v_class.class_order::text, jsonb_build_object(
        'new_class_id', v_new_class_id::text,
        'name', v_class.name,
        'is_final', v_class.is_final_class
      ));
    END LOOP;
  END LOOP;

  -- 3. Promote students
  FOR v_student IN
    SELECT s.*, c.class_order, c.is_final_class
    FROM public.students s
    LEFT JOIN public.classes c ON c.name = s.class_name
      AND (c.academic_year = p_from_year OR c.academic_year IS NULL)
      AND EXISTS (
        SELECT 1 FROM public.groups g
        WHERE g.id = c.group_id AND g.institution_id = p_institution_id
      )
    WHERE s.institution_id = p_institution_id
      AND (s.academic_year = p_from_year OR s.academic_year IS NULL)
      AND s.is_active = true
  LOOP
    IF v_student.is_final_class = true THEN
      -- Mark as alumni
      UPDATE public.students
      SET is_active = false
      WHERE id = v_student.id;

      -- Also deactivate their profile
      UPDATE public.profiles
      SET is_active = false
      WHERE id = v_student.profile_id;

      v_alumni_count := v_alumni_count + 1;
    ELSE
      -- Find next class (class_order + 1)
      SELECT c.name INTO v_next_class
      FROM public.classes c
      JOIN public.groups g ON g.id = c.group_id
      WHERE g.institution_id = p_institution_id
        AND c.academic_year = p_to_year
        AND c.class_order = COALESCE(v_student.class_order, 0) + 1;

      IF v_next_class.name IS NOT NULL THEN
        UPDATE public.students
        SET class_name = v_next_class.name,
            academic_year = p_to_year
        WHERE id = v_student.id;
      ELSE
        -- If no next class found, keep same class name but update year
        UPDATE public.students
        SET academic_year = p_to_year
        WHERE id = v_student.id;
      END IF;

      -- Update student's profile year
      UPDATE public.profiles
      SET academic_year = p_to_year
      WHERE id = v_student.profile_id;

      v_promoted_count := v_promoted_count + 1;
    END IF;
  END LOOP;

  -- 4. Retain staff - update their academic year
  UPDATE public.profiles
  SET academic_year = p_to_year
  WHERE institution_id = p_institution_id
    AND role IN ('faculty', 'accountant', 'admin', 'canteen_manager', 'driver')
    AND (academic_year = p_from_year OR academic_year IS NULL);

  GET DIAGNOSTICS v_staff_count = ROW_COUNT;

  -- 5. Clone faculty_subjects for new year (excluding class teachers)
  INSERT INTO public.faculty_subjects (institution_id, faculty_profile_id, subject_id, class_id, section, assignment_type, academic_year)
  SELECT
    fs.institution_id,
    fs.faculty_profile_id,
    fs.subject_id,
    c_new.id as class_id,
    fs.section,
    fs.assignment_type,
    p_to_year
  FROM public.faculty_subjects fs
  JOIN public.classes c_old ON c_old.id = fs.class_id
  JOIN public.groups g_old ON g_old.id = c_old.group_id
  JOIN public.groups g_new ON g_new.name = g_old.name AND g_new.academic_year = p_to_year AND g_new.institution_id = p_institution_id
  JOIN public.classes c_new ON c_new.name = c_old.name AND c_new.group_id = g_new.id AND c_new.academic_year = p_to_year
  WHERE fs.institution_id = p_institution_id
    AND (fs.academic_year = p_from_year OR fs.academic_year IS NULL)
    AND fs.assignment_type != 'class_teacher';

  -- 6. Clone fee_structures for new year
  INSERT INTO public.fee_structures (institution_id, name, amount, academic_year, description, due_date, class_name)
  SELECT
    institution_id,
    name,
    amount,
    p_to_year,
    description,
    NULL,
    class_name
  FROM public.fee_structures
  WHERE institution_id = p_institution_id
    AND (academic_year = p_from_year OR academic_year IS NULL);

  -- 7. Clone timetable_configs for new year
  INSERT INTO public.timetable_configs (
    institution_id, class_id, section, days_of_week, periods_per_day,
    start_time, period_duration_minutes, break_configs, buffer_time_minutes,
    lunch_start_time, lunch_duration_minutes, days_per_week,
    short_break_start_time, short_break_duration_minutes, short_break_name,
    extra_breaks, academic_year
  )
  SELECT
    tc.institution_id, c_new.id as class_id, tc.section, tc.days_of_week, tc.periods_per_day,
    tc.start_time, tc.period_duration_minutes, tc.break_configs, tc.buffer_time_minutes,
    tc.lunch_start_time, tc.lunch_duration_minutes, tc.days_per_week,
    tc.short_break_start_time, tc.short_break_duration_minutes, tc.short_break_name,
    tc.extra_breaks, p_to_year
  FROM public.timetable_configs tc
  JOIN public.classes c_old ON c_old.id = tc.class_id
  JOIN public.groups g_old ON g_old.id = c_old.group_id
  JOIN public.groups g_new ON g_new.name = g_old.name AND g_new.academic_year = p_to_year AND g_new.institution_id = p_institution_id
  JOIN public.classes c_new ON c_new.name = c_old.name AND c_new.group_id = g_new.id AND c_new.academic_year = p_to_year
  WHERE tc.institution_id = p_institution_id
    AND (tc.academic_year = p_from_year OR tc.academic_year IS NULL);

  -- 8. Update promotion request status
  UPDATE public.promotion_requests
  SET status = 'approved',
      approved_at = now()
  WHERE id = p_request_id;

  -- 9. Update parent profiles year
  UPDATE public.profiles
  SET academic_year = p_to_year
  WHERE institution_id = p_institution_id
    AND role = 'parent'
    AND (academic_year = p_from_year OR academic_year IS NULL);

  RETURN jsonb_build_object(
    'success', true,
    'promoted_students', v_promoted_count,
    'alumni_students', v_alumni_count,
    'retained_staff', v_staff_count,
    'new_year', p_to_year
  );
END;
$$;
