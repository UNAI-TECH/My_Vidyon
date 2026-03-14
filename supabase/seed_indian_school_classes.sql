-- Seed standard Indian school classes (LKG to Class 12) with sections A, B, C, D
-- Run this after complete_database_setup.sql to populate default classes

-- Note: Replace 'YOUR_INSTITUTION_ID' with your actual institution UUID before running

DO $$
DECLARE
    inst_id UUID := 'YOUR_INSTITUTION_ID'; -- CHANGE THIS TO YOUR INSTITUTION ID
    class_name TEXT;
    section_name TEXT;
BEGIN
    -- LKG and UKG
    FOREACH class_name IN ARRAY ARRAY['LKG', 'UKG']
    LOOP
        FOREACH section_name IN ARRAY ARRAY['A', 'B', 'C', 'D']
        LOOP
            INSERT INTO public.classes (institution_id, name, section, academic_year)
            VALUES (inst_id, class_name, section_name, '2024-2025')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    -- Class 1 to Class 12
    FOR i IN 1..12
    LOOP
        class_name := 'Class ' || i;
        FOREACH section_name IN ARRAY ARRAY['A', 'B', 'C', 'D']
        LOOP
            INSERT INTO public.classes (institution_id, name, section, academic_year)
            VALUES (inst_id, class_name, section_name, '2024-2025')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- Verify the classes were created
SELECT name, section, academic_year 
FROM public.classes 
ORDER BY 
    CASE 
        WHEN name = 'LKG' THEN 0
        WHEN name = 'UKG' THEN 1
        WHEN name LIKE 'Class %' THEN CAST(SUBSTRING(name FROM 'Class ([0-9]+)') AS INTEGER) + 1
        ELSE 999
    END,
    section;
