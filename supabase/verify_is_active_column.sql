-- Quick Verification: Check if is_active column exists

-- Check students table
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'students' 
  AND column_name = 'is_active';

-- Check parents table
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'parents' 
  AND column_name = 'is_active';

-- Check profiles table
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'is_active';

-- If all three queries return a row, the migration was successful!
-- Expected result for each:
-- column_name | data_type | column_default | is_nullable
-- is_active   | boolean   | true           | YES
