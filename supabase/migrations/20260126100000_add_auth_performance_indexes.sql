-- Migration: Add indexes to improve authentication performance
-- This migration adds database indexes to speed up login and session restoration queries

-- Add index on students.email for faster student lookup during auth
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- Add index on students.institution_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_students_institution_id ON students(institution_id);

-- Add index on parents.email for faster parent lookup during auth
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);

-- Add index on parents.institution_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_parents_institution_id ON parents(institution_id);

-- Add index on staff_details.profile_id for faster staff lookup during auth
CREATE INDEX IF NOT EXISTS idx_staff_details_profile_id ON staff_details(profile_id);

-- Add index on staff_details.institution_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_staff_details_institution_id ON staff_details(institution_id);

-- Add index on institutions.admin_email for faster institution admin lookup
CREATE INDEX IF NOT EXISTS idx_institutions_admin_email ON institutions(admin_email);

-- Add index on institutions.institution_id for faster institution status checks
CREATE INDEX IF NOT EXISTS idx_institutions_institution_id ON institutions(institution_id);

-- Add index on profiles.is_active for faster active user filtering
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active) WHERE is_active IS NOT NULL;

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_students_email_institution ON students(email, institution_id);
CREATE INDEX IF NOT EXISTS idx_parents_email_institution ON parents(email, institution_id);

COMMENT ON INDEX idx_students_email IS 'Speeds up student authentication by email';
COMMENT ON INDEX idx_parents_email IS 'Speeds up parent authentication by email';
COMMENT ON INDEX idx_staff_details_profile_id IS 'Speeds up staff authentication by profile_id';
COMMENT ON INDEX idx_institutions_admin_email IS 'Speeds up institution admin authentication';
COMMENT ON INDEX idx_institutions_institution_id IS 'Speeds up institution status checks during auth';
