-- ====================================================================
-- MINIMALIST VISIBILITY FIX: Parent Fee & Notification Accessibility
-- ====================================================================
-- Resolves visibility issues using type casting (::text) instead of schema alterations.

-- 1. Student Fees Policies (Minimalist)
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institution admins can manage student fees" ON public.student_fees;
CREATE POLICY "Institution admins can manage student fees" ON public.student_fees FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.institutions i ON i.institution_id = p.institution_id
        WHERE p.id = auth.uid()
        -- Handle both UUID and TEXT institution_id via explicit casting
        AND (i.id::text = student_fees.institution_id::text OR i.institution_id = student_fees.institution_id::text)
        AND p.role IN ('admin', 'accountant', 'institution')
    )
);

DROP POLICY IF EXISTS "Parents/Students can view their fees" ON public.student_fees;
CREATE POLICY "Parents/Students can view their fees" ON public.student_fees FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_fees.student_id
        AND (
            s.parent_id = auth.uid() -- Link via parent_id (Auth UID)
            OR s.parent_email ILIKE (auth.jwt() ->> 'email') -- Link via case-insensitive email
            OR s.email ILIKE (auth.jwt() ->> 'email') -- Self link for students
        )
    )
    OR
    EXISTS (
        -- Support link via student_parents join table
        SELECT 1 FROM public.student_parents sp
        JOIN public.parents p ON p.id = sp.parent_id
        WHERE sp.student_id = student_fees.student_id
        AND p.profile_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Parents can update their children fees" ON public.student_fees;
CREATE POLICY "Parents can update their children fees" ON public.student_fees FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_fees.student_id
        AND (
            s.parent_id = auth.uid() -- Link via parent_id (Auth UID)
            OR s.parent_email ILIKE (auth.jwt() ->> 'email') -- Link via case-insensitive email
        )
    )
    OR
    EXISTS (
        -- Support link via student_parents join table
        SELECT 1 FROM public.student_parents sp
        JOIN public.parents p ON p.id = sp.parent_id
        WHERE sp.student_id = student_fees.student_id
        AND p.profile_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = student_fees.student_id
        AND (
            s.parent_id = auth.uid()
            OR s.parent_email ILIKE (auth.jwt() ->> 'email')
        )
    )
    OR
    EXISTS (
        SELECT 1 FROM public.student_parents sp
        JOIN public.parents p ON p.id = sp.parent_id
        WHERE sp.student_id = student_fees.student_id
        AND p.profile_id = auth.uid()
    )
);

-- 2. Notifications Policies (Minimalist)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR 
    -- Allow parents to see notifications for their children (fallback)
    EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.user_id = notifications.user_id
        AND (s.parent_id = auth.uid() OR s.parent_email ILIKE (auth.jwt() ->> 'email'))
    )
);

-- 3. Leave Requests Policies (Minimalist)
-- Covers both leave_requests and student_leave_requests tables if they exist
DO $$ 
BEGIN
    -- For leave_requests
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'leave_requests') THEN
        ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Parents can view children leaves" ON public.leave_requests;
        EXECUTE 'CREATE POLICY "Parents can view children leaves" ON public.leave_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = leave_requests.student_id AND (s.parent_id = auth.uid() OR s.parent_email ILIKE (auth.jwt() ->> ''email''))))';
    END IF;

    -- For student_leave_requests
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'student_leave_requests') THEN
        ALTER TABLE public.student_leave_requests ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Parents can view children student leaves" ON public.student_leave_requests;
        EXECUTE 'CREATE POLICY "Parents can view children student leaves" ON public.student_leave_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_leave_requests.student_id AND (s.parent_id = auth.uid() OR s.parent_email ILIKE (auth.jwt() ->> ''email''))))';
    END IF;
END $$;

-- 4. Enabling Realtime (Replica Identity)
-- Set to FULL to ensure all columns are available in change events
ALTER TABLE public.student_fees REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.students REPLICA IDENTITY FULL;

-- Also try to enable for leave tables if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'leave_requests') THEN
        ALTER TABLE public.leave_requests REPLICA IDENTITY FULL;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'student_leave_requests') THEN
        ALTER TABLE public.student_leave_requests REPLICA IDENTITY FULL;
    END IF;
END $$;
