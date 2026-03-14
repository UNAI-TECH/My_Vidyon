-- Quick fix: Drop the updated_at trigger that's blocking fee updates
-- The trigger expects an updated_at column that doesn't exist in the table

DROP TRIGGER IF EXISTS update_student_fees_updated_at ON public.student_fees;
