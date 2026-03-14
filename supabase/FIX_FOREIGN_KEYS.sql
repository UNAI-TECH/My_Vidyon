-- ============================================================================
-- FIX ORPHANED REFERENCES AND ADD FOREIGN KEYS
-- ============================================================================
-- Some leave requests have assigned_class_teacher_id pointing to non-existent profiles
-- We need to clean this up first, then add the foreign key
-- ============================================================================

-- Step 1: Identify orphaned assigned_class_teacher_id values
-- ============================================================================
SELECT 
    lr.id,
    lr.assigned_class_teacher_id,
    'Profile does not exist' as issue
FROM public.leave_requests lr
LEFT JOIN public.profiles p ON p.id = lr.assigned_class_teacher_id
WHERE lr.assigned_class_teacher_id IS NOT NULL
  AND p.id IS NULL;

-- Step 2: Fix orphaned references by re-assigning using the correct function
-- ============================================================================
UPDATE public.leave_requests lr
SET assigned_class_teacher_id = public.get_student_class_teacher(lr.student_id)
FROM public.profiles p
WHERE lr.assigned_class_teacher_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = lr.assigned_class_teacher_id
  );

-- Step 3: Set NULL for any that still can't be resolved
-- ============================================================================
UPDATE public.leave_requests lr
SET assigned_class_teacher_id = NULL
WHERE lr.assigned_class_teacher_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = lr.assigned_class_teacher_id
  );

-- Step 4: Now add the foreign keys
-- ============================================================================
DO $$
BEGIN
    -- Add foreign key for student_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'leave_requests_student_id_fkey'
          AND table_name = 'leave_requests'
    ) THEN
        ALTER TABLE public.leave_requests
        ADD CONSTRAINT leave_requests_student_id_fkey
        FOREIGN KEY (student_id)
        REFERENCES public.students(id)
        ON DELETE CASCADE;
        RAISE NOTICE '✅ Added FK: leave_requests.student_id -> students.id';
    END IF;

    -- Add foreign key for parent_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'leave_requests_parent_id_fkey'
          AND table_name = 'leave_requests'
    ) THEN
        ALTER TABLE public.leave_requests
        ADD CONSTRAINT leave_requests_parent_id_fkey
        FOREIGN KEY (parent_id)
        REFERENCES public.parents(id)
        ON DELETE CASCADE;
        RAISE NOTICE '✅ Added FK: leave_requests.parent_id -> parents.id';
    END IF;

    -- Add foreign key for assigned_class_teacher_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'leave_requests_assigned_class_teacher_id_fkey'
          AND table_name = 'leave_requests'
    ) THEN
        ALTER TABLE public.leave_requests
        ADD CONSTRAINT leave_requests_assigned_class_teacher_id_fkey
        FOREIGN KEY (assigned_class_teacher_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
        RAISE NOTICE '✅ Added FK: leave_requests.assigned_class_teacher_id -> profiles.id';
    END IF;
END $$;

-- Step 5: Verify the fix
-- ============================================================================
SELECT 
    lr.id,
    s.name as student_name,
    s.class_name,
    s.section,
    lr.assigned_class_teacher_id,
    p.full_name as assigned_teacher,
    lr.status
FROM public.leave_requests lr
JOIN public.students s ON s.id = lr.student_id
LEFT JOIN public.profiles p ON p.id = lr.assigned_class_teacher_id
ORDER BY lr.created_at DESC
LIMIT 10;

-- Step 6: Check foreign keys
-- ============================================================================
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'leave_requests'
ORDER BY kcu.column_name;
