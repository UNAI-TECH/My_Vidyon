-- Migration: Add Fee Structure System Tables and Columns
-- Created: 2026-01-26
-- Purpose: Support multi-step fee structure creation with student-level customization

-- ========================================
-- 1. ALTER fee_structures table to add missing columns
-- ========================================

-- Add description column to store fee breakdown components as JSON
ALTER TABLE fee_structures 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add due_date column for fee payment deadlines
ALTER TABLE fee_structures 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Make academic_year nullable if it exists (to allow fee structures without specific academic year)
ALTER TABLE fee_structures 
ALTER COLUMN academic_year DROP NOT NULL;

COMMENT ON COLUMN fee_structures.description IS 'JSON array of fee components with title and amount';
COMMENT ON COLUMN fee_structures.due_date IS 'Payment due date for this fee structure';

-- ========================================
-- 2. Ensure student_fees table exists with all required columns
-- ========================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS student_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    institution_id UUID NOT NULL,
    amount_due DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if table already exists
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS fee_structure_id UUID;
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS description TEXT;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'student_fees_student_id_fkey'
    ) THEN
        ALTER TABLE student_fees 
        ADD CONSTRAINT student_fees_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'student_fees_fee_structure_id_fkey'
    ) THEN
        ALTER TABLE student_fees 
        ADD CONSTRAINT student_fees_fee_structure_id_fkey 
        FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'student_fees_institution_id_fkey'
    ) THEN
        ALTER TABLE student_fees 
        ADD CONSTRAINT student_fees_institution_id_fkey 
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add check constraint for status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'student_fees' AND constraint_name = 'student_fees_status_check'
    ) THEN
        ALTER TABLE student_fees 
        ADD CONSTRAINT student_fees_status_check 
        CHECK (status IN ('pending', 'paid', 'partial', 'overdue'));
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_fees_student_id ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_fee_structure_id ON student_fees(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_institution_id ON student_fees(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_status ON student_fees(status);

-- Add unique constraint to prevent duplicate fee assignments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_student_fees_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_student_fees_unique 
        ON student_fees(student_id, fee_structure_id) 
        WHERE fee_structure_id IS NOT NULL;
    END IF;
END $$;

-- Add table and column comments
COMMENT ON TABLE student_fees IS 'Individual student fee records with customizable amounts per student';
COMMENT ON COLUMN student_fees.description IS 'JSON array of custom fee components for this student (optional override)';

-- ========================================
-- 3. Enable Row Level Security (RLS)
-- ========================================

ALTER TABLE student_fees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Institution admins can manage student fees" ON student_fees;
DROP POLICY IF EXISTS "Students can view their own fees" ON student_fees;
DROP POLICY IF EXISTS "Parents can view their children fees" ON student_fees;

-- Policy: Institution admins can manage their student fees
CREATE POLICY "Institution admins can manage student fees"
ON student_fees
FOR ALL
USING (
    institution_id IN (
        SELECT institution_id FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Note: Student and parent policies are commented out until student table structure is confirmed
-- If students table has user_id or parent_id columns, uncomment and adjust these policies:

-- CREATE POLICY "Students can view their own fees"
-- ON student_fees
-- FOR SELECT
-- USING (
--     student_id IN (
--         SELECT id FROM students WHERE user_id = auth.uid()
--     )
-- );

-- CREATE POLICY "Parents can view their children fees"
-- ON student_fees
-- FOR SELECT
-- USING (
--     student_id IN (
--         SELECT id FROM students WHERE parent_id = auth.uid()
--     )
-- );

-- ========================================
-- 4. Enable Realtime for student_fees (if not already enabled)
-- ========================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'student_fees'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE student_fees;
    END IF;
END $$;

-- ========================================
-- 5. Add updated_at trigger
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_student_fees_updated_at ON student_fees;

CREATE TRIGGER update_student_fees_updated_at
BEFORE UPDATE ON student_fees
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
