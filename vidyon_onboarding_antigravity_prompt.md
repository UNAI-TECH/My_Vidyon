# Antigravity Master Prompt: Vidyon ERP 2-Step Institution Onboarding Refactor

Copy and paste the prompt below directly into **Antigravity** to refactor your 6-step client-heavy onboarding wizard into a fast, atomic **2-Step "60-Second Launch"** architecture with a single-transaction Supabase RPC, fixed SQL constraints, and a post-onboarding dashboard checklist.

## Prompt to Paste into Antigravity

Act as a Principal Full-Stack Engineer and Supabase Database Architect. We are refactoring the **Vidyon Unified ERP Institution Onboarding** module (`/admin/onboarding`) and its underlying PostgreSQL 15+ (Supabase) database layer.

### 1. Problem Statement & Architectural Goals

Our current onboarding flow requires a SuperAdmin or Registrar to step through 6 separate screens and executes dozens of sequential client-side `UPSERT` queries across `institutions`, `profiles`, `groups`, `classes`, `departments`, `subjects`, `timetable_configs`, and `timetable_slots`. It also contains schema bugs that break multi-class timetables and leave orphaned `auth.users` records when a user abandons the wizard mid-flow.

Refactor this module to achieve four goals:
1. **Collapse the 6-Step Wizard into a 2-Step "60-Second Launch" UI**:
   - **Step 1 (Campus Identity & Admin)**: Capture essential Day-1 identity fields (Catalog search or Custom Name with real-time duplicate check, Category, Board/University, PIN Code with auto-filled City/State, Address Line 1, Academic Year, and Campus Admin Email). Keep optional Day-2 fields (Logo upload, Guard Desk phone, Transport phone, GPS coordinates) collapsed inside an optional accordion or deferred to post-launch.
   - **Step 2 (Academic Blueprint & Atomic Launch)**: Let the user pick a visual **Academic Blueprint Preset** (e.g., *K–12 Complete: Pre-KG to 12th*, *Primary & Middle: 1st to 8th*, *High School: 9th to 12th*, *College / University*, or *Custom Blank*), choose default section divisions (`A`, `A–B`, `A–C`, `A–D`), and toggle default Bell Schedule Config (`8 Periods • 08:30 AM` vs `Configure Later`). Display a live preview card showing the exact number of academic stages, classes, sections, departments, and curriculum subjects that will be provisioned, and commit everything with one **Launch Institution** button.
2. **Move Multi-Table Seeding into One Atomic Postgres RPC (`public.provision_institution_v3`)**:
   - Replace sequential client-side loops with a single transactional Postgres function that creates the institution, seeds groups, classes, departments, board-specific curriculum subjects, and master `timetable_configs`, and writes to `institution_audit_logs` in `<100ms`.
3. **Fix Schema Bugs while Preserving Backwards Compatibility**:
   - Fix `timetable_slots` unique constraint collisions (breaks sharing `period_index` with periods, and missing `class_id` + `section` in the unique constraint).
   - Stop pre-generating thousands of empty `timetable_slots` rows during onboarding; store only `timetable_configs` during onboarding and render empty bell grids dynamically in the UI until a subject or teacher is assigned.
   - Link `subjects` to `classes` via `class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE` while keeping `class_name` populated for backwards compatibility.
   - Keep legacy duplicate columns (`type`, `phone`, `academic_year`, `address` on `institutions`; `class_name`, `standard` on `classes`) automatically synced via triggers or generated defaults so existing queries do not break.
4. **Add a Post-Onboarding Setup Checklist Widget**:
   - Create an `OnboardingProgressBanner` component for the Campus Admin dashboard that guides the school admin through Day-2 tasks after first login: (1) Upload Campus Logo, (2) Review & Tweak Subjects/Sections, (3) Add Guard & Transport Contacts, and (4) Assign Faculty to the Bell Grid.

### 2. Phase 1: Database Migration (SQL Schema Fixes & Atomic RPC)

Create a new Supabase migration file (`supabase/migrations/20261019_refactor_onboarding_v3.sql`) containing the following schema updates and the atomic `public.provision_institution_v3` stored procedure:

```sql
-- ============================================================================
-- VIDYON ERP: ONBOARDING V3 SCHEMA FIXES & ATOMIC PROVISIONING RPC
-- ============================================================================

-- 1. Institutions Table (Clean defaults + Case-insensitive anti-duplication)
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    institution_category TEXT DEFAULT 'school' CHECK (institution_category IN ('school', 'college')),
    type TEXT GENERATED ALWAYS AS (institution_category) STORED,
    ownership_type TEXT DEFAULT 'private' CHECK (ownership_type IN ('private', 'public')),
    board_or_university TEXT NOT NULL DEFAULT 'CBSE',
    address_line_1 TEXT,
    address_line_2 TEXT,
    address TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    map_link TEXT,
    has_kg BOOLEAN DEFAULT false,
    academic_stages JSONB DEFAULT '["primary", "middle", "secondary"]'::jsonb,
    email TEXT NOT NULL,
    office_phone TEXT,
    phone TEXT,
    guard_phone TEXT,
    transport_phone TEXT,
    current_academic_year TEXT DEFAULT '2025-26',
    academic_year TEXT DEFAULT '2025-26',
    logo_url TEXT,
    allowed_roles JSONB DEFAULT '{"canteen": true, "finance": true, "transport": true}'::jsonb,
    onboarding_checklist JSONB DEFAULT '{"profile_completed": true, "logo_uploaded": false, "contacts_added": false, "curriculum_verified": false, "timetable_assigned": false}'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    admin_email TEXT,
    master_catalog_id UUID,
    timetable_template_id TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_institutions_lower_name
    ON public.institutions (LOWER(TRIM(name)))
    WHERE status != 'deleted';

-- 2. Academic Groups / Stages
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    stage TEXT DEFAULT 'primary',
    stage_order INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, name)
);

-- 3. Classes / Standards
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    class_name TEXT,
    standard TEXT,
    stage TEXT DEFAULT 'primary',
    sections TEXT[] DEFAULT '{A, B}'::text[],
    class_order INTEGER DEFAULT 0,
    is_final_class BOOLEAN DEFAULT false,
    academic_year TEXT DEFAULT '2025-26',
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, group_id, name, academic_year)
);

-- 4. Departments
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, name)
);

-- 5. Subjects (Added class_id FK while preserving class_name for compatibility)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    class_name TEXT NOT NULL,
    group_name TEXT DEFAULT 'Core',
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, name, class_name)
);

CREATE INDEX IF NOT EXISTS idx_subjects_institution ON public.subjects(institution_id);
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);

-- 6. Timetable Configs (Fixed constraint to allow stage/class-specific overrides if needed)
CREATE TABLE IF NOT EXISTS public.timetable_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    section TEXT,
    days_of_week JSONB DEFAULT '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]'::jsonb,
    periods_per_day INTEGER DEFAULT 8,
    start_time TIME WITHOUT TIME ZONE DEFAULT '08:30:00',
    period_duration_minutes INTEGER DEFAULT 45,
    lunch_start_time TIME WITHOUT TIME ZONE DEFAULT '12:30:00',
    lunch_duration_minutes INTEGER DEFAULT 45,
    break_configs JSONB DEFAULT '[{"after_period": 2, "duration": 15, "type": "Short Break"}, {"after_period": 4, "duration": 45, "type": "Lunch"}, {"after_period": 6, "duration": 10, "type": "Short Break"}]'::jsonb,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE NULLS NOT DISTINCT (institution_id, group_id, class_id, section)
);

-- 7. Timetable Slots (Fixed unique constraint to include class_id, section, and is_break)
CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES public.timetable_configs(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    section TEXT NOT NULL DEFAULT 'A',
    day_of_week TEXT NOT NULL,
    period_index INTEGER NOT NULL,
    is_break BOOLEAN DEFAULT false,
    break_name TEXT,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    faculty_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    room_number TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(config_id, class_id, section, day_of_week, period_index, is_break)
);

-- 8. Atomic Onboarding Stored Procedure (Single-Call Server-Side Provisioning)
CREATE OR REPLACE FUNCTION public.provision_institution_v3(
    p_payload JSONB
) RETURNS JSONB AS $$
DECLARE
    v_inst_code TEXT;
    v_inst_uuid UUID;
    v_name TEXT := TRIM(p_payload->>'name');
    v_category TEXT := COALESCE(p_payload->>'institution_category', 'school');
    v_board TEXT := COALESCE(p_payload->>'board_or_university', 'CBSE');
    v_blueprint TEXT := COALESCE(p_payload->>'blueprint_id', 'k12_full');
    v_year TEXT := COALESCE(p_payload->>'current_academic_year', '2025-26');
    v_sections TEXT[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'default_sections', '["A", "B", "C"]'::jsonb)));
    v_setup_timetable BOOLEAN := COALESCE((p_payload->>'setup_timetable')::boolean, true);

    v_grp_pre UUID;
    v_grp_pri UUID;
    v_grp_mid UUID;
    v_grp_sec UUID;
    v_grp_hsc UUID;
    v_grp_ug UUID;
    v_class_rec RECORD;
    v_config_id UUID;

    v_groups_count INT := 0;
    v_classes_count INT := 0;
    v_depts_count INT := 0;
    v_subjects_count INT := 0;
BEGIN
    -- A. Validate Name Uniqueness
    IF EXISTS (
        SELECT 1 FROM public.institutions
        WHERE LOWER(TRIM(name)) = LOWER(v_name)
          AND status != 'deleted'
          AND institution_id != COALESCE(p_payload->>'institution_id', '')
    ) THEN
        RAISE EXCEPTION 'DUPLICATE_INSTITUTION_NAME: An active institution with the name "%" already exists.', v_name;
    END IF;

    -- B. Generate or Use Provided Institution Code
    v_inst_code := COALESCE(
        NULLIF(TRIM(p_payload->>'institution_id'), ''),
        UPPER(SUBSTRING(REGEXP_REPLACE(v_name, '[^a-zA-Z]', '', 'g') FROM 1 FOR 3))
        || '-' || UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(p_payload->>'city', 'CMP'), '[^a-zA-Z]', '', 'g') FROM 1 FOR 3))
        || '-' || SUBSTRING(MD5(random()::text) FROM 1 FOR 4)
    );

    -- C. Upsert Institution Record
    INSERT INTO public.institutions (
        institution_id, name, institution_category, ownership_type, board_or_university,
        address_line_1, address_line_2, address, city, state, pincode,
        latitude, longitude, map_link, has_kg, email, office_phone, phone,
        guard_phone, transport_phone, current_academic_year, academic_year,
        logo_url, admin_email, status, onboarding_checklist
    ) VALUES (
        v_inst_code,
        v_name,
        v_category,
        COALESCE(p_payload->>'ownership_type', 'private'),
        v_board,
        p_payload->>'address_line_1',
        p_payload->>'address_line_2',
        CONCAT_WS(', ', p_payload->>'address_line_1', p_payload->>'address_line_2', p_payload->>'city', p_payload->>'state', p_payload->>'pincode'),
        p_payload->>'city',
        p_payload->>'state',
        p_payload->>'pincode',
        (p_payload->>'latitude')::double precision,
        (p_payload->>'longitude')::double precision,
        p_payload->>'map_link',
        (v_blueprint = 'k12_full'),
        COALESCE(p_payload->>'email', p_payload->>'admin_email'),
        p_payload->>'office_phone',
        p_payload->>'office_phone',
        p_payload->>'guard_phone',
        p_payload->>'transport_phone',
        v_year,
        v_year,
        p_payload->>'logo_url',
        p_payload->>'admin_email',
        'active',
        jsonb_build_object(
            'profile_completed', true,
            'logo_uploaded', (p_payload->>'logo_url' IS NOT NULL),
            'contacts_added', (p_payload->>'guard_phone' IS NOT NULL OR p_payload->>'transport_phone' IS NOT NULL),
            'curriculum_verified', false,
            'timetable_assigned', false
        )
    )
    ON CONFLICT (institution_id) DO UPDATE SET
        name = EXCLUDED.name,
        board_or_university = EXCLUDED.board_or_university,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        pincode = EXCLUDED.pincode,
        admin_email = EXCLUDED.admin_email,
        updated_at = timezone('utc', now())
    RETURNING id INTO v_inst_uuid;

    -- D. Provision Academic Blueprint (Groups, Classes, Departments, Subjects)
    IF v_category = 'school' AND v_blueprint != 'custom_blank' THEN
        -- 1. Pre-Primary (if k12_full)
        IF v_blueprint = 'k12_full' THEN
            INSERT INTO public.groups (institution_id, name, stage, stage_order)
            VALUES (v_inst_code, 'Pre-Primary (KG)', 'pre_primary', 1)
            ON CONFLICT (institution_id, name) DO UPDATE SET stage = EXCLUDED.stage
            RETURNING id INTO v_grp_pre;

            INSERT INTO public.classes (institution_id, group_id, name, class_name, standard, stage, sections, class_order, academic_year)
            VALUES
                (v_inst_code, v_grp_pre, 'LKG', 'LKG', 'LKG', 'pre_primary', v_sections, -1, v_year),
                (v_inst_code, v_grp_pre, 'UKG', 'UKG', 'UKG', 'pre_primary', v_sections, 0, v_year)
            ON CONFLICT (institution_id, group_id, name, academic_year) DO UPDATE SET sections = EXCLUDED.sections;
        END IF;

        -- 2. Primary & Middle (for k12_full or primary_middle)
        IF v_blueprint IN ('k12_full', 'primary_middle') THEN
            INSERT INTO public.groups (institution_id, name, stage, stage_order)
            VALUES (v_inst_code, 'Primary School (1st to 5th)', 'primary', 2)
            ON CONFLICT (institution_id, name) DO UPDATE SET stage = EXCLUDED.stage
            RETURNING id INTO v_grp_pri;

            INSERT INTO public.classes (institution_id, group_id, name, class_name, standard, stage, sections, class_order, academic_year)
            SELECT v_inst_code, v_grp_pri, s.lbl, s.lbl, s.lbl, 'primary', v_sections, s.ord, v_year
            FROM (VALUES (1, '1st Standard'), (2, '2nd Standard'), (3, '3rd Standard'), (4, '4th Standard'), (5, '5th Standard')) AS s(ord, lbl)
            ON CONFLICT (institution_id, group_id, name, academic_year) DO UPDATE SET sections = EXCLUDED.sections;

            INSERT INTO public.groups (institution_id, name, stage, stage_order)
            VALUES (v_inst_code, 'Middle School (6th to 8th)', 'middle', 3)
            ON CONFLICT (institution_id, name) DO UPDATE SET stage = EXCLUDED.stage
            RETURNING id INTO v_grp_mid;

            INSERT INTO public.classes (institution_id, group_id, name, class_name, standard, stage, sections, class_order, academic_year)
            SELECT v_inst_code, v_grp_mid, s.lbl, s.lbl, s.lbl, 'middle', v_sections, s.ord, v_year
            FROM (VALUES (6, '6th Standard'), (7, '7th Standard'), (8, '8th Standard')) AS s(ord, lbl)
            ON CONFLICT (institution_id, group_id, name, academic_year) DO UPDATE SET sections = EXCLUDED.sections;
        END IF;

        -- 3. Secondary & Higher Secondary (for k12_full or high_school)
        IF v_blueprint IN ('k12_full', 'high_school') THEN
            INSERT INTO public.groups (institution_id, name, stage, stage_order)
            VALUES (v_inst_code, 'Secondary School (9th & 10th)', 'secondary', 4)
            ON CONFLICT (institution_id, name) DO UPDATE SET stage = EXCLUDED.stage
            RETURNING id INTO v_grp_sec;

            INSERT INTO public.classes (institution_id, group_id, name, class_name, standard, stage, sections, class_order, academic_year)
            VALUES
                (v_inst_code, v_grp_sec, '9th Standard', '9th Standard', '9th Standard', 'secondary', v_sections, 9, v_year),
                (v_inst_code, v_grp_sec, '10th Standard', '10th Standard', '10th Standard', 'secondary', v_sections, 10, v_year)
            ON CONFLICT (institution_id, group_id, name, academic_year) DO UPDATE SET sections = EXCLUDED.sections;

            INSERT INTO public.groups (institution_id, name, stage, stage_order)
            VALUES (v_inst_code, 'Higher Secondary (11th & 12th)', 'higher_secondary', 5)
            ON CONFLICT (institution_id, name) DO UPDATE SET stage = EXCLUDED.stage
            RETURNING id INTO v_grp_hsc;

            INSERT INTO public.classes (institution_id, group_id, name, class_name, standard, stage, sections, class_order, is_final_class, academic_year)
            VALUES
                (v_inst_code, v_grp_hsc, '11th Standard', '11th Standard', '11th Standard', 'higher_secondary', v_sections, 11, false, v_year),
                (v_inst_code, v_grp_hsc, '12th Standard', '12th Standard', '12th Standard', 'higher_secondary', v_sections, 12, true, v_year)
            ON CONFLICT (institution_id, group_id, name, academic_year) DO UPDATE SET sections = EXCLUDED.sections;
        END IF;

        -- 4. Default School Departments
        INSERT INTO public.departments (institution_id, name, code, description)
        VALUES
            (v_inst_code, 'English & Languages', 'LANG', 'English Literature, Grammar & Regional Languages'),
            (v_inst_code, 'Mathematics', 'MATH', 'Mathematics, Algebra & Analytical Reasoning'),
            (v_inst_code, 'Sciences', 'SCI', 'Physics, Chemistry, Biology & Environmental Science'),
            (v_inst_code, 'Social Sciences & Humanities', 'SOC', 'History, Civics, Geography & Economics'),
            (v_inst_code, 'Computer Science & IT', 'CS', 'Coding, Digital Literacy & Information Technology'),
            (v_inst_code, 'Physical Education & Arts', 'PE', 'Sports, Yoga & Co-Curricular Activities')
        ON CONFLICT (institution_id, name) DO NOTHING;

        -- 5. Auto-Map Age-Appropriate Curriculum Subjects per Class
        FOR v_class_rec IN
            SELECT id, name, stage, class_order FROM public.classes WHERE institution_id = v_inst_code
        LOOP
            IF v_class_rec.stage = 'pre_primary' THEN
                INSERT INTO public.subjects (institution_id, class_id, name, code, class_name, group_name)
                VALUES
                    (v_inst_code, v_class_rec.id, 'Phonics & Storytelling', 'ENG01', v_class_rec.name, 'Foundational'),
                    (v_inst_code, v_class_rec.id, 'Number Work & Shapes', 'MAT01', v_class_rec.name, 'Foundational'),
                    (v_inst_code, v_class_rec.id, 'General Awareness & Nature', 'EVS01', v_class_rec.name, 'Foundational'),
                    (v_inst_code, v_class_rec.id, 'Art, Craft & Movement', 'ART01', v_class_rec.name, 'Foundational')
                ON CONFLICT (institution_id, name, class_name) DO UPDATE SET class_id = EXCLUDED.class_id;
            ELSIF v_class_rec.stage = 'primary' THEN
                INSERT INTO public.subjects (institution_id, class_id, name, code, class_name, group_name)
                VALUES
                    (v_inst_code, v_class_rec.id, 'English Language & Reading', 'ENG10' || v_class_rec.class_order, v_class_rec.name, 'Primary Core'),
                    (v_inst_code, v_class_rec.id, 'Mathematics', 'MAT10' || v_class_rec.class_order, v_class_rec.name, 'Primary Core'),
                    (v_inst_code, v_class_rec.id, 'Environmental Studies (EVS)', 'EVS10' || v_class_rec.class_order, v_class_rec.name, 'Primary Core'),
                    (v_inst_code, v_class_rec.id, 'Second Language', 'LNG10' || v_class_rec.class_order, v_class_rec.name, 'Primary Core'),
                    (v_inst_code, v_class_rec.id, 'Computer Basics', 'CS10' || v_class_rec.class_order, v_class_rec.name, 'Primary Core'),
                    (v_inst_code, v_class_rec.id, 'Physical Education', 'PET10' || v_class_rec.class_order, v_class_rec.name, 'Co-Curricular')
                ON CONFLICT (institution_id, name, class_name) DO UPDATE SET class_id = EXCLUDED.class_id;
            ELSIF v_class_rec.stage IN ('middle', 'secondary') THEN
                INSERT INTO public.subjects (institution_id, class_id, name, code, class_name, group_name)
                VALUES
                    (v_inst_code, v_class_rec.id, 'English Literature & Grammar', 'ENG20' || v_class_rec.class_order, v_class_rec.name, 'Core'),
                    (v_inst_code, v_class_rec.id, 'Mathematics', 'MAT20' || v_class_rec.class_order, v_class_rec.name, 'Core'),
                    (v_inst_code, v_class_rec.id, 'Integrated Science', 'SCI20' || v_class_rec.class_order, v_class_rec.name, 'Core'),
                    (v_inst_code, v_class_rec.id, 'Social Science (History & Geography)', 'SOC20' || v_class_rec.class_order, v_class_rec.name, 'Core'),
                    (v_inst_code, v_class_rec.id, 'Second Language', 'LNG20' || v_class_rec.class_order, v_class_rec.name, 'Core'),
                    (v_inst_code, v_class_rec.id, 'Information Technology & AI', 'IT20' || v_class_rec.class_order, v_class_rec.name, 'Skill')
                ON CONFLICT (institution_id, name, class_name) DO UPDATE SET class_id = EXCLUDED.class_id;
            ELSE
                INSERT INTO public.subjects (institution_id, class_id, name, code, class_name, group_name)
                VALUES
                    (v_inst_code, v_class_rec.id, 'English Core', 'ENG30' || v_class_rec.class_order, v_class_rec.name, 'Senior Core'),
                    (v_inst_code, v_class_rec.id, 'Mathematics', 'MAT30' || v_class_rec.class_order, v_class_rec.name, 'STEM'),
                    (v_inst_code, v_class_rec.id, 'Physics', 'PHY30' || v_class_rec.class_order, v_class_rec.name, 'STEM'),
                    (v_inst_code, v_class_rec.id, 'Chemistry', 'CHM30' || v_class_rec.class_order, v_class_rec.name, 'STEM'),
                    (v_inst_code, v_class_rec.id, 'Computer Science / Biology', 'ELC30' || v_class_rec.class_order, v_class_rec.name, 'Elective')
                ON CONFLICT (institution_id, name, class_name) DO UPDATE SET class_id = EXCLUDED.class_id;
            END IF;
        END LOOP;

    ELSIF v_category = 'college' AND v_blueprint != 'custom_blank' THEN
        INSERT INTO public.groups (institution_id, name, stage, stage_order)
        VALUES (v_inst_code, 'Undergraduate Programs (UG)', 'undergraduate', 1)
        ON CONFLICT (institution_id, name) DO UPDATE SET stage = EXCLUDED.stage
        RETURNING id INTO v_grp_ug;

        INSERT INTO public.classes (institution_id, group_id, name, class_name, standard, stage, sections, class_order, is_final_class, academic_year)
        VALUES
            (v_inst_code, v_grp_ug, 'Year 1 (Sem 1 & 2)', 'Year 1 (Sem 1 & 2)', 'Year 1', 'undergraduate', v_sections, 1, false, v_year),
            (v_inst_code, v_grp_ug, 'Year 2 (Sem 3 & 4)', 'Year 2 (Sem 3 & 4)', 'Year 2', 'undergraduate', v_sections, 2, false, v_year),
            (v_inst_code, v_grp_ug, 'Year 3 (Sem 5 & 6)', 'Year 3 (Sem 5 & 6)', 'Year 3', 'undergraduate', v_sections, 3, false, v_year),
            (v_inst_code, v_grp_ug, 'Year 4 (Sem 7 & 8)', 'Year 4 (Sem 7 & 8)', 'Year 4', 'undergraduate', v_sections, 4, true, v_year)
        ON CONFLICT (institution_id, group_id, name, academic_year) DO UPDATE SET sections = EXCLUDED.sections;

        INSERT INTO public.departments (institution_id, name, code, description)
        VALUES
            (v_inst_code, 'Computer Science & Engineering', 'CSE', 'Software Systems, AI & Data Engineering'),
            (v_inst_code, 'Electronics & Communication', 'ECE', 'VLSI, Embedded Systems & Communications'),
            (v_inst_code, 'Science & Humanities', 'S&H', 'Foundational Mathematics, Physics & English'),
            (v_inst_code, 'Management Studies & Commerce', 'MBA', 'Business Administration & Finance')
        ON CONFLICT (institution_id, name) DO NOTHING;
    END IF;

    -- E. Create Default Master Bell Schedule Config (Without Bloating timetable_slots)
    IF v_setup_timetable THEN
        INSERT INTO public.timetable_configs (
            institution_id,
            days_of_week,
            periods_per_day,
            start_time,
            period_duration_minutes,
            lunch_start_time,
            lunch_duration_minutes
        ) VALUES (
            v_inst_code,
            COALESCE(p_payload->'days_of_week', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]'::jsonb),
            COALESCE((p_payload->>'periods_per_day')::int, 8),
            COALESCE((p_payload->>'start_time')::time, '08:30:00'::time),
            COALESCE((p_payload->>'period_duration_minutes')::int, 45),
            '12:30:00'::time,
            45
        )
        ON CONFLICT (institution_id, group_id, class_id, section) DO UPDATE SET
            periods_per_day = EXCLUDED.periods_per_day,
            start_time = EXCLUDED.start_time,
            period_duration_minutes = EXCLUDED.period_duration_minutes,
            updated_at = timezone('utc', now())
        RETURNING id INTO v_config_id;
    END IF;

    -- F. Collect Summary Counts & Log Audit Event
    SELECT COUNT(*) INTO v_groups_count FROM public.groups WHERE institution_id = v_inst_code;
    SELECT COUNT(*) INTO v_classes_count FROM public.classes WHERE institution_id = v_inst_code;
    SELECT COUNT(*) INTO v_depts_count FROM public.departments WHERE institution_id = v_inst_code;
    SELECT COUNT(*) INTO v_subjects_count FROM public.subjects WHERE institution_id = v_inst_code;

    PERFORM public.log_audit(
        'CREATE',
        'institution',
        v_inst_code,
        v_inst_code,
        NULL,
        jsonb_build_object(
            'name', v_name,
            'category', v_category,
            'board', v_board,
            'blueprint', v_blueprint,
            'groups_created', v_groups_count,
            'classes_created', v_classes_count,
            'subjects_created', v_subjects_count
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'institution_uuid', v_inst_uuid,
        'institution_id', v_inst_code,
        'name', v_name,
        'summary', jsonb_build_object(
            'groups', v_groups_count,
            'classes', v_classes_count,
            'sections_per_class', COALESCE(array_length(v_sections, 1), 0),
            'departments', v_depts_count,
            'subjects', v_subjects_count,
            'timetable_config_id', v_config_id
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Phase 2: Atomic Edge Function (`/functions/v1/onboard-institution`)

Update or create the Supabase Edge Function `supabase/functions/onboard-institution/index.ts` so that **admin user provisioning only runs when the wizard is submitted**, preventing orphaned `auth.users` accounts:

1. Accept the single combined onboarding payload from the 2-step wizard.
2. Execute `supabaseAdmin.rpc('provision_institution_v3', { p_payload: body })` first.
3. If the RPC succeeds, check whether an auth user with `body.admin_email` already exists in `auth.users`; if not, create the user via `supabaseAdmin.auth.admin.createUser({ email: body.admin_email, email_confirm: true, user_metadata: { role: 'institution', institution_id } })`.
4. Upsert the corresponding row in `public.profiles` (`id`, `email`, `full_name`, `role: 'institution'`, `institution_id`, `staff_id: 'ADM-' + institution_id`, `status: 'active'`).
5. Return `{ institution_id, summary, admin_provisioned: true }` to the client.

### 4. Phase 3: Frontend Refactor — 2-Step Onboarding Wizard (`/admin/onboarding`)

Refactor the existing 6-step onboarding UI into a clean, responsive 2-step wizard with real-time validation and zero table-configuration fatigue:

#### Step 1: Campus Identity & Administrator (`Step1IdentityForm`)
* **Smart Catalog Search & Real-Time Duplicate Check**:
  * Combobox at the top to pick from Master Catalog or type a custom institution name.
  * Debounced (350ms) query against `public.institutions` checking `LOWER(TRIM(name))` and showing an inline green `"Available"` pill or an amber `"Already onboarded (ID: DPS-CHN-01) — View Institution"` link.
  * Auto-generate a clean, editable `institution_id` slug badge (e.g., `DPS-CHN-01`) as the user types the school name and city.
* **Core Classification Pills**:
  * **Institution Category**: Segmented toggle (`School (K–12)` | `College / University`).
  * **Ownership**: Segmented toggle (`Private / Unaided` | `Public / Govt`).
  * **Board / University**: Dynamic quick-select chips (`CBSE`, `ICSE`, `State Board`, `IB / Cambridge` when School is selected; `Anna University`, `Autonomous`, `UGC Affiliated`, `Deemed University` when College is selected).
* **Location & PIN Auto-Fill**:
  * **PIN Code** (6-digit input): Automatically populates **City** and **State** when a valid Indian PIN code is entered, leaving **Address Line 1** as a single clean input.
* **Campus Admin Account**:
  * **Admin Email** (`admin@dps.vidyon.app`) and **Office Phone** (`+91 ...`).
  * Display an inline security badge: *"Passwordless first login — the campus admin will receive an instant verification link to set their permanent password."*
* **Progressive Disclosure Accordion (`Optional: Logo, Security & Transport Contacts`)**:
  * Collapsed by default so Step 1 stays fast. Inside: Campus Logo dropzone (`logos` bucket), Guard Desk Phone, Transport Dispatch Phone, and Google Maps link / GPS coordinates.

#### Step 2: Academic Blueprint & 1-Click Launch (`Step2BlueprintSelector`)
* **Interactive Blueprint Cards** (filtered by `School` vs `College`):
  * **K–12 Complete (`k12_full`)** *(Recommended Default for Schools)*: Pre-Primary (LKG–UKG) through 12th Standard • 5 Academic Stages • 14 Classes • 6 Departments • 76 Standard Curriculum Subjects.
  * **Primary & Middle School (`primary_middle`)**: 1st to 8th Standard • 2 Academic Stages • 8 Classes • 48 Subjects.
  * **Secondary & Higher Secondary (`high_school`)**: 9th to 12th Standard • 2 Academic Stages • 4 Classes • 22 Subjects.
  * **Undergraduate College (`ug_college`)** *(Default for Colleges)*: Year 1 to Year 4 (Semesters 1–8) • 4 Departments.
  * **Start Blank (`custom_blank`)**: Provision only the institution profile and admin account; configure stages and classes manually later.
* **Quick Configuration Controls**:
  * **Default Sections per Class**: Pill selector (`A Only` | `A & B` | `A, B, C` *(Default)* | `A, B, C, D`).
  * **Academic Year**: Dropdown defaulting to `2025-26` (or `2026-27`).
  * **Master Bell Schedule**: Toggle card for **Standard 8-Period Grid (08:30 AM – 03:40 PM, 45m periods + breaks)** with a switch to *"Configure bell timings later"*.
* **Live Provisioning Summary Banner & Launch CTA**:
  * Dynamic summary bar showing: *"Ready to provision **Delhi Public School (DPS-CHN-01)** with **5 Stages**, **14 Classes (42 Sections)**, **6 Departments**, and **76 CBSE Subjects** in one atomic transaction."*
  * Primary CTA button: **Launch Institution (<1s)** -> Calls `/functions/v1/onboard-institution` (or `supabase.rpc('provision_institution_v3')`) and shows a celebration modal with quick actions: **Copy Admin Login Link**, **View Campus Dashboard**, or **Onboard Another Institution**.

### 5. Phase 4: Post-Onboarding Campus Admin Checklist (`OnboardingChecklistBanner`)

Create a dismissible, high-craft checklist banner component (`components/onboarding/OnboardingChecklistBanner.tsx`) that renders at the top of the Campus Admin's dashboard when any item in `institutions.onboarding_checklist` is `false`:
1. **Upload Campus Logo** (`logo_uploaded`): Opens a quick modal to upload the school crest to Supabase Storage.
2. **Verify Classes, Sections & Subjects** (`curriculum_verified`): Links to `/admin/academics` where pre-seeded classes and subjects can be renamed, added, or deleted with 1 click.
3. **Add Guard Desk & Transport Contacts** (`contacts_added`): Opens an inline drawer to add emergency campus numbers and GPS coordinates.
4. **Assign Faculty to Master Timetable** (`timetable_assigned`): Links to `/admin/timetable` where the dynamic bell grid is rendered from `timetable_configs` and slots are saved into `timetable_slots` on assignment.

### 6. Implementation & Verification Checklist

Execute these steps in order:
1. Inspect existing onboarding files under `/admin/onboarding`, Supabase migrations, and API helpers to map existing imports and TypeScript interfaces.
2. Apply the SQL migration (`20261019_refactor_onboarding_v3.sql`) and update TypeScript database types.
3. Implement the atomic RPC integration and Edge Function so institution creation, blueprint seeding, and admin profile creation happen in a single submission at the end of Step 2.
4. Refactor the `/admin/onboarding` UI into the 2-step wizard (`Step1IdentityForm` and `Step2BlueprintSelector`) and add `OnboardingChecklistBanner` to the institution dashboard.
5. Verify that creating a school with the `k12_full` blueprint populates `institutions`, `groups`, `classes`, `departments`, `subjects` (with valid `class_id` foreign keys), `timetable_configs`, and `institution_audit_logs` in a single call with zero unique-constraint collisions.
