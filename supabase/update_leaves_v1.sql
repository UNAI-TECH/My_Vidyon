-- Update leave_requests table to support faculty/staff leaves
ALTER TABLE public.leave_requests ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.leave_requests ALTER COLUMN parent_id DROP NOT NULL;

-- Add new columns if they don't exist
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS requester_role TEXT DEFAULT 'student';
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS leave_type TEXT DEFAULT 'Leave';

-- Update RLS policies to allow faculty to insert their own leaves
DROP POLICY IF EXISTS "Staff can insert own leave requests" ON public.leave_requests;
CREATE POLICY "Staff can insert own leave requests" ON public.leave_requests 
FOR INSERT TO authenticated 
WITH CHECK (staff_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view own leave requests" ON public.leave_requests;
CREATE POLICY "Staff can view own leave requests" ON public.leave_requests 
FOR SELECT TO authenticated 
USING (staff_id = auth.uid());

-- Ensure institution admins can manage all leaves for their institution
DROP POLICY IF EXISTS "Institution managers can handle all leaves" ON public.leave_requests;
CREATE POLICY "Institution managers can handle all leaves" ON public.leave_requests 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.role = 'staff')
    AND profiles.institution_id = leave_requests.institution_id
  )
);
