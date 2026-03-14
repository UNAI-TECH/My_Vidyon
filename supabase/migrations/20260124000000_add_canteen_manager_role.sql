
-- Add 'canteen_manager' to user_role enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid WHERE typname = 'user_role' AND enumlabel = 'canteen_manager') THEN
        ALTER TYPE user_role ADD VALUE 'canteen_manager';
    END IF;
END$$;
