-- 1. FIX DUPLICATION FOR GROUPS
DO $$ 
DECLARE
    r RECORD;
BEGIN
    CREATE TEMP TABLE group_mapping AS
    WITH ranked_groups AS (
        SELECT id, institution_id, name,
               ROW_NUMBER() OVER (PARTITION BY institution_id, name ORDER BY created_at DESC, id DESC) as rank
        FROM public.groups
    )
    SELECT r1.id as old_id, r2.id as master_id
    FROM ranked_groups r1
    JOIN ranked_groups r2 ON r1.institution_id = r2.institution_id AND r1.name = r2.name
    WHERE r1.rank > 1 AND r2.rank = 1;

    FOR r IN (
        SELECT tc.table_schema, tc.table_name, kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'groups' AND ccu.column_name = 'id'
    ) LOOP
        EXECUTE format('UPDATE %I.%I t SET %I = m.master_id FROM group_mapping m WHERE t.%I = m.old_id', 
                       r.table_schema, r.table_name, r.column_name, r.column_name);
    END LOOP;

    DELETE FROM public.groups WHERE id IN (SELECT old_id FROM group_mapping);
    DROP TABLE group_mapping;
END $$;


-- 2. FIX DUPLICATION FOR CLASSES
DO $$ 
DECLARE
    r RECORD;
BEGIN
    CREATE TEMP TABLE class_mapping AS
    WITH ranked_classes AS (
        SELECT id, institution_id, group_id, name, academic_year,
               ROW_NUMBER() OVER (PARTITION BY institution_id, COALESCE(group_id, '00000000-0000-0000-0000-000000000000'), name, academic_year ORDER BY created_at DESC, id DESC) as rank
        FROM public.classes
    )
    SELECT r1.id as old_id, r2.id as master_id
    FROM ranked_classes r1
    JOIN ranked_classes r2 ON r1.institution_id = r2.institution_id 
                         AND COALESCE(r1.group_id, '00000000-0000-0000-0000-000000000000') = COALESCE(r2.group_id, '00000000-0000-0000-0000-000000000000')
                         AND r1.name = r2.name 
                         AND COALESCE(r1.academic_year, '') = COALESCE(r2.academic_year, '')
    WHERE r1.rank > 1 AND r2.rank = 1;

    FOR r IN (
        SELECT tc.table_schema, tc.table_name, kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'classes' AND ccu.column_name = 'id'
    ) LOOP
        EXECUTE format('UPDATE %I.%I t SET %I = m.master_id FROM class_mapping m WHERE t.%I = m.old_id', 
                       r.table_schema, r.table_name, r.column_name, r.column_name);
    END LOOP;

    DELETE FROM public.classes WHERE id IN (SELECT old_id FROM class_mapping);
    DROP TABLE class_mapping;
END $$;


-- 3. FIX DUPLICATION FOR SUBJECTS
DO $$ 
DECLARE
    r RECORD;
BEGIN
    CREATE TEMP TABLE subject_mapping AS
    WITH ranked_subjects AS (
        SELECT id, institution_id, name, class_name,
               ROW_NUMBER() OVER (PARTITION BY institution_id, name, COALESCE(class_name, '') ORDER BY created_at DESC, id DESC) as rank
        FROM public.subjects
    )
    SELECT r1.id as old_id, r2.id as master_id
    FROM ranked_subjects r1
    JOIN ranked_subjects r2 ON r1.institution_id = r2.institution_id 
                         AND r1.name = r2.name 
                         AND COALESCE(r1.class_name, '') = COALESCE(r2.class_name, '')
    WHERE r1.rank > 1 AND r2.rank = 1;

    -- DYNAMICALLY REDIRECT ALL SUBJECT REFERENCES (Handles exam_results, etc.)
    FOR r IN (
        SELECT tc.table_schema, tc.table_name, kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'subjects' AND ccu.column_name = 'id'
    ) LOOP
        EXECUTE format('UPDATE %I.%I t SET %I = m.master_id FROM subject_mapping m WHERE t.%I = m.old_id', 
                       r.table_schema, r.table_name, r.column_name, r.column_name);
    END LOOP;

    DELETE FROM public.subjects WHERE id IN (SELECT old_id FROM subject_mapping);
    DROP TABLE subject_mapping;
END $$;


-- 4. ADD UNIQUE CONSTRAINTS
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_name_institution_unique;
ALTER TABLE public.groups ADD CONSTRAINT groups_name_institution_unique UNIQUE (institution_id, name);

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_name_group_institution_unique;
ALTER TABLE public.classes ADD CONSTRAINT classes_name_group_institution_unique UNIQUE (institution_id, group_id, name, academic_year);

ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_name_class_institution_unique;
ALTER TABLE public.subjects ADD CONSTRAINT subjects_name_class_institution_unique UNIQUE (institution_id, name, class_name);

NOTIFY pgrst, 'reload schema';
