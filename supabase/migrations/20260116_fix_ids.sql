-- Change institution_id from UUID to TEXT in attendance tables to match application logic
ALTER TABLE public.student_attendance ALTER COLUMN institution_id TYPE TEXT;
ALTER TABLE public.staff_attendance ALTER COLUMN institution_id TYPE TEXT;

-- Update RLS policies to handle text comparisons (if any used UUID specific logic, though usually they don't)
-- The existing policies were just USING (true) or simple equality, which works fine with TEXT.
