-- Migration: Add soft delete functionality for users
-- This adds an 'is_active' column and disables user authentication without deleting data
-- Date: 2026-01-25

-- Add is_active column to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add is_active column to parents table
ALTER TABLE public.parents 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add is_active column to profiles table (for staff)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_students_is_active ON public.students(is_active);
CREATE INDEX IF NOT EXISTS idx_parents_is_active ON public.parents(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Create a function to disable user (soft delete)
CREATE OR REPLACE FUNCTION public.disable_user_access(
    user_id UUID,
    user_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user_id UUID;
    result JSON;
BEGIN
    -- Verify the caller has permission (must be institution admin or admin)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('institution', 'admin')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions. Only institution admins can disable users.';
    END IF;

    -- Disable user based on type and get auth user ID
    IF user_type = 'student' THEN
        SELECT id INTO auth_user_id
        FROM public.students
        WHERE id = user_id;
        
        IF auth_user_id IS NULL THEN
            RAISE EXCEPTION 'Student not found';
        END IF;
        
        -- Mark student as inactive
        UPDATE public.students 
        SET is_active = false 
        WHERE id = user_id;
        
    ELSIF user_type = 'parent' THEN
        SELECT profile_id INTO auth_user_id
        FROM public.parents
        WHERE id = user_id;
        
        IF auth_user_id IS NULL THEN
            RAISE EXCEPTION 'Parent not found';
        END IF;
        
        -- Mark parent as inactive
        UPDATE public.parents 
        SET is_active = false 
        WHERE id = user_id;
        
        -- Also mark the profile as inactive
        UPDATE public.profiles 
        SET is_active = false 
        WHERE id = auth_user_id;
        
    ELSIF user_type = 'staff' THEN
        auth_user_id := user_id;
        
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
            RAISE EXCEPTION 'Staff member not found';
        END IF;
        
        -- Mark staff profile as inactive
        UPDATE public.profiles 
        SET is_active = false 
        WHERE id = user_id;
        
    ELSE
        RAISE EXCEPTION 'Invalid user_type. Must be student, parent, or staff.';
    END IF;

    -- Disable the auth user (prevents login) but don't delete
    -- This updates the user's metadata to mark them as disabled
    UPDATE auth.users 
    SET 
        banned_until = 'infinity'::timestamptz,
        updated_at = now()
    WHERE id = auth_user_id;

    result := json_build_object(
        'success', true,
        'message', user_type || ' access disabled successfully',
        'disabled_user_id', user_id,
        'disabled_auth_user_id', auth_user_id
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object(
            'success', false,
            'error', SQLERRM
        );
        RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.disable_user_access(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.disable_user_access IS 'Disables a user''s access by marking them as inactive and banning their auth account. Data is preserved. Only institution admins can execute this.';

-- Create a function to re-enable user access (for recovery)
CREATE OR REPLACE FUNCTION public.enable_user_access(
    user_id UUID,
    user_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_user_id UUID;
    result JSON;
BEGIN
    -- Verify the caller has permission
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('institution', 'admin')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions. Only institution admins can enable users.';
    END IF;

    -- Enable user based on type
    IF user_type = 'student' THEN
        SELECT id INTO auth_user_id FROM public.students WHERE id = user_id;
        IF auth_user_id IS NULL THEN RAISE EXCEPTION 'Student not found'; END IF;
        UPDATE public.students SET is_active = true WHERE id = user_id;
        
    ELSIF user_type = 'parent' THEN
        SELECT profile_id INTO auth_user_id FROM public.parents WHERE id = user_id;
        IF auth_user_id IS NULL THEN RAISE EXCEPTION 'Parent not found'; END IF;
        UPDATE public.parents SET is_active = true WHERE id = user_id;
        UPDATE public.profiles SET is_active = true WHERE id = auth_user_id;
        
    ELSIF user_type = 'staff' THEN
        auth_user_id := user_id;
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
            RAISE EXCEPTION 'Staff member not found';
        END IF;
        UPDATE public.profiles SET is_active = true WHERE id = user_id;
        
    ELSE
        RAISE EXCEPTION 'Invalid user_type';
    END IF;

    -- Re-enable auth user
    UPDATE auth.users 
    SET 
        banned_until = NULL,
        updated_at = now()
    WHERE id = auth_user_id;

    result := json_build_object(
        'success', true,
        'message', user_type || ' access enabled successfully'
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object('success', false, 'error', SQLERRM);
        RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enable_user_access(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.enable_user_access IS 'Re-enables a disabled user''s access. Only institution admins can execute this.';
