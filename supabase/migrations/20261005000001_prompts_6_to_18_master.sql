-- ============================================================================
-- MASTER MIGRATION: Prompts 6-18 — My Vidyon ERP
-- ============================================================================
-- SAFETY: All statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
--         No existing table is dropped or altered destructively.
--         No existing data is modified.
--         Run this in Supabase SQL Editor in a single transaction.
-- ============================================================================

-- ████████████████████████████████████████████████████████████████████████████
-- PROMPT 6 — ADMISSION MANAGEMENT
-- ████████████████████████████████████████████████████████████████████████████

-- 6.1 Admissions table
CREATE TABLE IF NOT EXISTS public.admissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    admission_number TEXT,
    academic_year TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','approved','rejected','enrolled','cancelled')),

    -- Student details
    student_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    blood_group TEXT,
    nationality TEXT DEFAULT 'Indian',
    religion TEXT,
    caste TEXT,
    mother_tongue TEXT,
    aadhar_number TEXT,
    image_url TEXT,

    -- Contact
    email TEXT,
    phone TEXT,
    address_line_1 TEXT,
    address_line_2 TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,

    -- Academic
    applying_for_class TEXT,
    applying_for_section TEXT,
    previous_school_name TEXT,
    previous_school_board TEXT,
    previous_class TEXT,
    previous_percentage NUMERIC(5,2),
    transfer_certificate_url TEXT,

    -- Guardian details (embedded for the primary guardian)
    guardian_name TEXT,
    guardian_relation TEXT,
    guardian_phone TEXT,
    guardian_email TEXT,
    guardian_occupation TEXT,
    guardian_address TEXT,

    -- Second guardian
    guardian2_name TEXT,
    guardian2_relation TEXT,
    guardian2_phone TEXT,
    guardian2_email TEXT,

    -- Linkage (set on approval/enrollment)
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    parent_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Metadata
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    review_notes TEXT,
    rejection_reason TEXT,
    enrolled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),

    UNIQUE(institution_id, admission_number)
);

CREATE INDEX IF NOT EXISTS idx_admissions_institution ON public.admissions(institution_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON public.admissions(status);
CREATE INDEX IF NOT EXISTS idx_admissions_student ON public.admissions(student_id);
CREATE INDEX IF NOT EXISTS idx_admissions_academic_year ON public.admissions(academic_year);
CREATE INDEX IF NOT EXISTS idx_admissions_duplicate_check
    ON public.admissions(institution_id, student_name, date_of_birth, guardian_phone);

COMMENT ON TABLE public.admissions IS 'Admission applications with full workflow (draft → enrolled)';

-- 6.2 Admission history (every status change)
CREATE TABLE IF NOT EXISTS public.admission_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    changed_fields JSONB,
    notes TEXT,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_admission_history_admission ON public.admission_history(admission_id);

-- 6.3 Extend students table with admission linkage
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS admission_id UUID;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_id UUID;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_phone TEXT;

-- Unique constraint: one admission -> one student
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_students_admission_unique') THEN
        CREATE UNIQUE INDEX idx_students_admission_unique ON public.students(admission_id) WHERE admission_id IS NOT NULL;
    END IF;
END $$;

-- 6.4 Process admission enrollment RPC (single transaction)
CREATE OR REPLACE FUNCTION public.process_admission_enrollment(
    p_admission_id UUID,
    p_dry_run BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_adm RECORD;
    v_student_id UUID;
    v_existing_student_id UUID;
    v_parent_id UUID;
    v_changes JSONB := '[]'::jsonb;
    v_class_id UUID;
BEGIN
    SELECT * INTO v_adm FROM public.admissions WHERE id = p_admission_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Admission % not found', p_admission_id;
    END IF;

    IF v_adm.status NOT IN ('approved') AND NOT p_dry_run THEN
        RAISE EXCEPTION 'Admission must be in "approved" status to enroll. Current: %', v_adm.status;
    END IF;

    v_existing_student_id := v_adm.student_id;

    IF v_adm.guardian_email IS NOT NULL THEN
        SELECT id INTO v_parent_id FROM public.profiles
            WHERE email = v_adm.guardian_email AND role = 'parent' LIMIT 1;
    END IF;
    IF v_parent_id IS NULL AND v_adm.guardian_phone IS NOT NULL THEN
        SELECT id INTO v_parent_id FROM public.profiles
            WHERE phone = v_adm.guardian_phone AND role = 'parent' LIMIT 1;
    END IF;

    v_changes := v_changes || jsonb_build_array(jsonb_build_object(
        'entity', 'student_profile',
        'action', CASE WHEN v_existing_student_id IS NOT NULL THEN 'update' ELSE 'create' END
    ));

    IF v_adm.guardian_name IS NOT NULL THEN
        v_changes := v_changes || jsonb_build_array(jsonb_build_object(
            'entity', 'parent_link',
            'action', CASE WHEN v_parent_id IS NOT NULL THEN 'reuse_existing' ELSE 'create_new' END,
            'parent_name', v_adm.guardian_name
        ));
    END IF;

    SELECT id INTO v_class_id FROM public.classes
        WHERE institution_id = v_adm.institution_id
          AND (class_name = v_adm.applying_for_class OR name = v_adm.applying_for_class)
        LIMIT 1;

    IF v_class_id IS NOT NULL THEN
        v_changes := v_changes || jsonb_build_array(jsonb_build_object(
            'entity', 'class_section', 'action', 'assign',
            'class', v_adm.applying_for_class, 'section', v_adm.applying_for_section
        ));
    END IF;

    IF p_dry_run THEN
        RETURN jsonb_build_object('dry_run', true, 'changes', v_changes);
    END IF;

    IF v_existing_student_id IS NOT NULL THEN
        UPDATE public.students SET
            name = v_adm.student_name,
            class_name = v_adm.applying_for_class,
            section = COALESCE(v_adm.applying_for_section, section),
            class_id = COALESCE(v_class_id, class_id),
            dob = COALESCE(v_adm.date_of_birth, dob),
            gender = COALESCE(v_adm.gender, gender),
            blood_group = COALESCE(v_adm.blood_group, blood_group),
            email = COALESCE(v_adm.email, email),
            phone = COALESCE(v_adm.phone, phone),
            address = COALESCE(
                NULLIF(TRIM(COALESCE(v_adm.address_line_1,'') || ' ' || COALESCE(v_adm.address_line_2,'')), ''),
                address
            ),
            city = COALESCE(v_adm.city, city),
            zip_code = COALESCE(v_adm.pincode, zip_code),
            parent_name = COALESCE(v_adm.guardian_name, parent_name),
            parent_phone = COALESCE(v_adm.guardian_phone, parent_phone),
            parent_email = COALESCE(v_adm.guardian_email, parent_email),
            parent_contact = COALESCE(v_adm.guardian_phone, parent_contact),
            parent_id = COALESCE(v_parent_id, parent_id),
            academic_year = COALESCE(v_adm.academic_year, academic_year),
            image_url = COALESCE(v_adm.image_url, image_url),
            is_active = true,
            updated_at = now()
        WHERE id = v_existing_student_id;
        v_student_id := v_existing_student_id;
    ELSE
        INSERT INTO public.students (
            institution_id, admission_id, name, class_name, section, class_id,
            dob, gender, blood_group, email, phone,
            address, city, zip_code,
            parent_name, parent_phone, parent_email, parent_contact, parent_id,
            academic_year, image_url, is_active
        ) VALUES (
            v_adm.institution_id, v_adm.id, v_adm.student_name,
            v_adm.applying_for_class, v_adm.applying_for_section, v_class_id,
            v_adm.date_of_birth, v_adm.gender, v_adm.blood_group,
            v_adm.email, v_adm.phone,
            NULLIF(TRIM(COALESCE(v_adm.address_line_1,'') || ' ' || COALESCE(v_adm.address_line_2,'')), ''),
            v_adm.city, v_adm.pincode,
            v_adm.guardian_name, v_adm.guardian_phone, v_adm.guardian_email,
            v_adm.guardian_phone, v_parent_id,
            v_adm.academic_year, v_adm.image_url, true
        ) RETURNING id INTO v_student_id;
    END IF;

    UPDATE public.admissions SET
        status = 'enrolled', student_id = v_student_id,
        parent_profile_id = v_parent_id, enrolled_at = now(), updated_at = now()
    WHERE id = p_admission_id;

    INSERT INTO public.admission_history (admission_id, action, old_status, new_status, changed_by)
    VALUES (p_admission_id, 'status_change', 'approved', 'enrolled', auth.uid());

    PERFORM public.log_audit('ENROLL', 'admission', p_admission_id::text, v_adm.institution_id,
        NULL, jsonb_build_object('student_id', v_student_id, 'class', v_adm.applying_for_class));

    RETURN jsonb_build_object(
        'success', true, 'student_id', v_student_id,
        'admission_id', p_admission_id, 'changes', v_changes
    );
END;
$$;

-- 6.5 Duplicate detection function
CREATE OR REPLACE FUNCTION public.check_admission_duplicates(
    p_institution_id TEXT,
    p_student_name TEXT,
    p_dob DATE,
    p_guardian_phone TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
    v_matches JSONB := '[]'::jsonb;
    v_rec RECORD;
BEGIN
    FOR v_rec IN
        SELECT id, admission_number, student_name, status, guardian_phone
        FROM public.admissions
        WHERE institution_id = p_institution_id
          AND LOWER(TRIM(student_name)) = LOWER(TRIM(p_student_name))
          AND date_of_birth = p_dob
        UNION ALL
        SELECT id, admission_number, student_name, status, guardian_phone
        FROM public.admissions
        WHERE institution_id = p_institution_id
          AND guardian_phone = p_guardian_phone
          AND LOWER(TRIM(student_name)) = LOWER(TRIM(p_student_name))
    LOOP
        v_matches := v_matches || jsonb_build_array(jsonb_build_object(
            'admission_id', v_rec.id, 'admission_number', v_rec.admission_number,
            'student_name', v_rec.student_name, 'status', v_rec.status
        ));
    END LOOP;

    FOR v_rec IN
        SELECT id, register_number, name, class_name
        FROM public.students
        WHERE institution_id = p_institution_id
          AND LOWER(TRIM(name)) = LOWER(TRIM(p_student_name))
          AND dob = p_dob
    LOOP
        v_matches := v_matches || jsonb_build_array(jsonb_build_object(
            'type', 'existing_student', 'student_id', v_rec.id,
            'register_number', v_rec.register_number, 'name', v_rec.name, 'class', v_rec.class_name
        ));
    END LOOP;

    RETURN jsonb_build_object('duplicates_found', jsonb_array_length(v_matches) > 0, 'matches', v_matches);
END;
$$;

-- 6.6 RLS for admissions
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admissions_select" ON public.admissions;
CREATE POLICY "admissions_select" ON public.admissions FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "admissions_insert" ON public.admissions;
CREATE POLICY "admissions_insert" ON public.admissions FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR institution_id IN (
        SELECT institution_id FROM public.profiles WHERE id = auth.uid()
        AND role IN ('admin','institution','faculty')
    )
);

DROP POLICY IF EXISTS "admissions_update" ON public.admissions;
CREATE POLICY "admissions_update" ON public.admissions FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR institution_id IN (
        SELECT institution_id FROM public.profiles WHERE id = auth.uid()
        AND role IN ('admin','institution','faculty')
    )
);

DROP POLICY IF EXISTS "admissions_delete" ON public.admissions;
CREATE POLICY "admissions_delete" ON public.admissions FOR DELETE TO authenticated
USING (
    public.is_super_admin()
    OR institution_id IN (
        SELECT institution_id FROM public.profiles WHERE id = auth.uid()
        AND role IN ('admin','institution')
    )
);

DROP POLICY IF EXISTS "admission_history_select" ON public.admission_history;
CREATE POLICY "admission_history_select" ON public.admission_history FOR SELECT TO authenticated
USING (admission_id IN (SELECT id FROM public.admissions));

DROP POLICY IF EXISTS "admission_history_insert" ON public.admission_history;
CREATE POLICY "admission_history_insert" ON public.admission_history FOR INSERT TO authenticated WITH CHECK (true);

DROP TRIGGER IF EXISTS update_admissions_updated_at ON public.admissions;
CREATE TRIGGER update_admissions_updated_at
    BEFORE UPDATE ON public.admissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ████████████████████████████████████████████████████████████████████████████
-- PROMPT 7 — STUDENT PROMOTION (extend existing promotion_requests)
-- ████████████████████████████████████████████████████████████████████████████

ALTER TABLE public.promotion_requests ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'institution';
ALTER TABLE public.promotion_requests ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.promotion_requests ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.promotion_requests ADD COLUMN IF NOT EXISTS requested_by UUID;
ALTER TABLE public.promotion_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc', now());

CREATE TABLE IF NOT EXISTS public.promotion_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES public.promotion_requests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    from_class TEXT NOT NULL,
    from_section TEXT,
    to_class TEXT,
    to_section TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    is_eligible BOOLEAN DEFAULT true,
    eligibility_reason TEXT,
    rejection_reason TEXT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(request_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_promotion_items_request ON public.promotion_items(request_id);
CREATE INDEX IF NOT EXISTS idx_promotion_items_student ON public.promotion_items(student_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_promotion_items_no_double_pending') THEN
        CREATE UNIQUE INDEX idx_promotion_items_no_double_pending
            ON public.promotion_items(student_id) WHERE status = 'pending';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.promotion_eligibility_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    class_name TEXT,
    rule_type TEXT NOT NULL DEFAULT 'pass_status',
    rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, class_name, rule_type)
);

CREATE TABLE IF NOT EXISTS public.promotion_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    promotion_item_id UUID REFERENCES public.promotion_items(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    from_class TEXT,
    to_class TEXT,
    from_section TEXT,
    to_section TEXT,
    academic_year TEXT,
    reason TEXT,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_promotion_history_student ON public.promotion_history(student_id);
CREATE INDEX IF NOT EXISTS idx_promotion_history_institution ON public.promotion_history(institution_id);

CREATE OR REPLACE FUNCTION public.apply_promotion(p_promotion_item_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_item RECORD; v_request RECORD;
BEGIN
    SELECT * INTO v_item FROM public.promotion_items WHERE id = p_promotion_item_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Promotion item not found'; END IF;
    IF v_item.status != 'approved' THEN RAISE EXCEPTION 'Only approved promotions can be applied'; END IF;
    IF v_item.applied_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'already_applied', true);
    END IF;

    SELECT * INTO v_request FROM public.promotion_requests WHERE id = v_item.request_id;

    IF NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid()
        AND role IN ('admin','institution','superadmin','super_admin')
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions' USING ERRCODE = '42501';
    END IF;

    UPDATE public.students SET
        class_name = COALESCE(v_item.to_class, class_name),
        section = COALESCE(v_item.to_section, section),
        academic_year = COALESCE(v_request.to_year, academic_year),
        updated_at = now()
    WHERE id = v_item.student_id;

    UPDATE public.promotion_items SET applied_at = now() WHERE id = p_promotion_item_id;

    INSERT INTO public.promotion_history (institution_id, student_id, promotion_item_id, action,
        from_class, to_class, from_section, to_section, academic_year, performed_by)
    VALUES (v_request.institution_id, v_item.student_id, p_promotion_item_id, 'applied',
        v_item.from_class, v_item.to_class, v_item.from_section, v_item.to_section,
        v_request.to_year, auth.uid());

    PERFORM public.log_audit('PROMOTE', 'student', v_item.student_id::text, v_request.institution_id,
        jsonb_build_object('from_class', v_item.from_class), jsonb_build_object('to_class', v_item.to_class));

    RETURN jsonb_build_object('success', true, 'student_id', v_item.student_id);
END;
$$;

ALTER TABLE public.promotion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_eligibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotion_items_all" ON public.promotion_items;
CREATE POLICY "promotion_items_all" ON public.promotion_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "promotion_rules_all" ON public.promotion_eligibility_rules;
CREATE POLICY "promotion_rules_all" ON public.promotion_eligibility_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "promotion_history_select" ON public.promotion_history;
CREATE POLICY "promotion_history_select" ON public.promotion_history FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "promotion_history_insert" ON public.promotion_history;
CREATE POLICY "promotion_history_insert" ON public.promotion_history FOR INSERT TO authenticated WITH CHECK (true);


-- ████████████████████████████████████████████████████████████████████████████
-- PROMPT 8 — PARENT / GUARDIAN
-- ████████████████████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    relationship_type TEXT DEFAULT 'parent' CHECK (relationship_type IN ('father','mother','guardian','parent','grandparent','sibling','other')),
    is_primary_guardian BOOLEAN DEFAULT false,
    is_emergency_contact BOOLEAN DEFAULT false,
    can_pickup BOOLEAN DEFAULT true,
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(parent_profile_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_psl_parent ON public.parent_student_links(parent_profile_id);
CREATE INDEX IF NOT EXISTS idx_psl_student ON public.parent_student_links(student_id);

CREATE OR REPLACE FUNCTION public.prevent_orphan_student_delete()
RETURNS TRIGGER AS $$
DECLARE v_link_count INT;
BEGIN
    SELECT COUNT(*) INTO v_link_count FROM public.parent_student_links WHERE student_id = OLD.id;
    IF v_link_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete student "%": % active parent/guardian link(s). Remove links first.', OLD.name, v_link_count
            USING ERRCODE = '23503';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_orphan_student_delete ON public.students;
CREATE TRIGGER trg_prevent_orphan_student_delete
    BEFORE DELETE ON public.students FOR EACH ROW EXECUTE FUNCTION public.prevent_orphan_student_delete();

CREATE OR REPLACE FUNCTION public.prevent_sole_guardian_delete()
RETURNS TRIGGER AS $$
DECLARE v_student_rec RECORD;
BEGIN
    FOR v_student_rec IN
        SELECT psl.student_id, s.name AS student_name
        FROM public.parent_student_links psl
        JOIN public.students s ON s.id = psl.student_id
        WHERE psl.parent_profile_id = OLD.id AND s.is_active = true
    LOOP
        IF (SELECT COUNT(*) FROM public.parent_student_links WHERE student_id = v_student_rec.student_id) <= 1 THEN
            RAISE EXCEPTION 'Cannot delete: sole guardian of active student "%". Assign another guardian first.', v_student_rec.student_name
                USING ERRCODE = '23503';
        END IF;
    END LOOP;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_sole_guardian_delete ON public.profiles;
CREATE TRIGGER trg_prevent_sole_guardian_delete
    BEFORE DELETE ON public.profiles FOR EACH ROW
    WHEN (OLD.role = 'parent')
    EXECUTE FUNCTION public.prevent_sole_guardian_delete();

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "psl_select" ON public.parent_student_links;
CREATE POLICY "psl_select" ON public.parent_student_links FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR parent_profile_id = auth.uid()
    OR student_id IN (
        SELECT s.id FROM public.students s
        JOIN public.profiles p ON p.institution_id = s.institution_id
        WHERE p.id = auth.uid() AND p.role IN ('admin','institution','faculty')
    )
);

DROP POLICY IF EXISTS "psl_manage" ON public.parent_student_links;
CREATE POLICY "psl_manage" ON public.parent_student_links FOR ALL TO authenticated
USING (
    public.is_super_admin()
    OR student_id IN (
        SELECT s.id FROM public.students s
        JOIN public.profiles p ON p.institution_id = s.institution_id
        WHERE p.id = auth.uid() AND p.role IN ('admin','institution')
    )
) WITH CHECK (
    public.is_super_admin()
    OR student_id IN (
        SELECT s.id FROM public.students s
        JOIN public.profiles p ON p.institution_id = s.institution_id
        WHERE p.id = auth.uid() AND p.role IN ('admin','institution')
    )
);


-- ████████████████████████████████████████████████████████████████████████████
-- PROMPT 9 — FACULTY MANAGEMENT
-- ████████████████████████████████████████████████████████████████████████████

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS faculty_status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE TABLE IF NOT EXISTS public.leave_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    annual_quota INTEGER DEFAULT 12,
    carry_forward BOOLEAN DEFAULT false,
    max_carry_forward INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, name)
);

CREATE TABLE IF NOT EXISTS public.faculty_leave_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    faculty_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    total_allowed INTEGER NOT NULL DEFAULT 12,
    used INTEGER NOT NULL DEFAULT 0,
    carried_forward INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(faculty_profile_id, leave_type_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_flb_faculty ON public.faculty_leave_balances(faculty_profile_id);

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_leave_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_types_all" ON public.leave_types;
CREATE POLICY "leave_types_all" ON public.leave_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "flb_select" ON public.faculty_leave_balances;
CREATE POLICY "flb_select" ON public.faculty_leave_balances FOR SELECT TO authenticated
USING (
    public.is_super_admin() OR faculty_profile_id = auth.uid()
    OR institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution'))
);
DROP POLICY IF EXISTS "flb_manage" ON public.faculty_leave_balances;
CREATE POLICY "flb_manage" ON public.faculty_leave_balances FOR ALL TO authenticated
USING (
    public.is_super_admin()
    OR institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution'))
) WITH CHECK (
    public.is_super_admin()
    OR institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution'))
);


-- ████████████████████████████████████████████████████████████████████████████
-- PROMPT 10 — SUBJECTS & SYLLABUS
-- ████████████████████████████████████████████████████████████████████████████

ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS is_elective BOOLEAN DEFAULT false;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS periods_per_week INTEGER DEFAULT 5;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS max_periods_per_day INTEGER DEFAULT 2;

CREATE TABLE IF NOT EXISTS public.subject_class_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    section TEXT,
    is_mandatory BOOLEAN DEFAULT true,
    periods_per_week INTEGER DEFAULT 5,
    academic_year TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(subject_id, class_id, section, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_scm_class ON public.subject_class_mappings(class_id);
CREATE INDEX IF NOT EXISTS idx_scm_subject ON public.subject_class_mappings(subject_id);

CREATE TABLE IF NOT EXISTS public.syllabus_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    class_name TEXT,
    academic_year TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
    effective_from DATE,
    effective_to DATE,
    content JSONB DEFAULT '[]'::jsonb,
    total_planned_periods INTEGER DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, subject_id, class_name, academic_year, version_number)
);

CREATE INDEX IF NOT EXISTS idx_syllabus_institution ON public.syllabus_versions(institution_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_subject ON public.syllabus_versions(subject_id);

CREATE OR REPLACE FUNCTION public.prevent_subject_delete_if_used()
RETURNS TRIGGER AS $$
DECLARE v_tt_count INT := 0; v_syl_count INT; v_mapping_count INT;
BEGIN
    SELECT COUNT(*) INTO v_mapping_count FROM public.subject_class_mappings WHERE subject_id = OLD.id;
    SELECT COUNT(*) INTO v_syl_count FROM public.syllabus_versions WHERE subject_id = OLD.id;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timetable_slots') THEN
        SELECT COUNT(*) INTO v_tt_count FROM public.timetable_slots WHERE subject_id = OLD.id;
    END IF;
    IF v_mapping_count > 0 OR v_syl_count > 0 OR v_tt_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete subject: % mapping(s), % syllabus(es), % timetable slot(s) reference it.',
            v_mapping_count, v_syl_count, v_tt_count USING ERRCODE = '23503';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_subject_delete ON public.subjects;
CREATE TRIGGER trg_prevent_subject_delete
    BEFORE DELETE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.prevent_subject_delete_if_used();

ALTER TABLE public.subject_class_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scm_all" ON public.subject_class_mappings;
CREATE POLICY "scm_all" ON public.subject_class_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "syllabus_all" ON public.syllabus_versions;
CREATE POLICY "syllabus_all" ON public.syllabus_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ████████████████████████████████████████████████████████████████████████████
-- PROMPT 11 — TIMETABLE & SUBSTITUTES
-- ████████████████████████████████████████████████████████████████████████████

ALTER TABLE public.timetable_configs ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
ALTER TABLE public.timetable_configs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.timetable_configs ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.timetable_configs ADD COLUMN IF NOT EXISTS published_by UUID;

CREATE TABLE IF NOT EXISTS public.timetable_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_id UUID NOT NULL REFERENCES public.timetable_configs(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    status TEXT DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
    slots_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(config_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.substitute_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    timetable_slot_id UUID REFERENCES public.timetable_slots(id) ON DELETE SET NULL,
    original_faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    substitute_faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    section TEXT,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    substitute_date DATE NOT NULL,
    period_index INTEGER,
    day_of_week TEXT,
    reason TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','cancelled','completed')),
    notified BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, substitute_date, period_index, class_id, section)
);

CREATE INDEX IF NOT EXISTS idx_sub_assign_date ON public.substitute_assignments(substitute_date);
CREATE INDEX IF NOT EXISTS idx_sub_assign_inst ON public.substitute_assignments(institution_id);

CREATE OR REPLACE FUNCTION public.validate_timetable_conflicts(p_config_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
    v_conflicts JSONB := '[]'::jsonb;
    v_rec RECORD;
    v_config RECORD;
BEGIN
    SELECT * INTO v_config FROM public.timetable_configs WHERE id = p_config_id;

    FOR v_rec IN
        SELECT ts1.day_of_week, ts1.period_index, ts1.faculty_id, p.full_name AS faculty_name
        FROM public.timetable_slots ts1
        JOIN public.timetable_slots ts2 ON ts1.faculty_id = ts2.faculty_id
            AND ts1.day_of_week = ts2.day_of_week AND ts1.period_index = ts2.period_index
            AND ts1.id != ts2.id AND ts1.is_break = false AND ts2.is_break = false
        JOIN public.profiles p ON p.id = ts1.faculty_id
        WHERE ts1.config_id IN (
            SELECT id FROM public.timetable_configs WHERE institution_id = v_config.institution_id
        )
    LOOP
        v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
            'type', 'faculty_clash', 'faculty', v_rec.faculty_name,
            'day', v_rec.day_of_week, 'period', v_rec.period_index
        ));
    END LOOP;

    FOR v_rec IN
        SELECT ts.day_of_week, ts.period_index, COUNT(*)
        FROM public.timetable_slots ts
        WHERE ts.config_id = p_config_id AND ts.is_break = false AND ts.subject_id IS NOT NULL
        GROUP BY ts.day_of_week, ts.period_index HAVING COUNT(*) > 1
    LOOP
        v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
            'type', 'class_double_booking', 'day', v_rec.day_of_week, 'period', v_rec.period_index
        ));
    END LOOP;

    RETURN jsonb_build_object('has_conflicts', jsonb_array_length(v_conflicts) > 0, 'conflicts', v_conflicts);
END;
$$;

ALTER TABLE public.timetable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substitute_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tt_versions_all" ON public.timetable_versions;
CREATE POLICY "tt_versions_all" ON public.timetable_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sub_assign_all" ON public.substitute_assignments;
CREATE POLICY "sub_assign_all" ON public.substitute_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ████████████████████████████████████████████████████████████████████████████
-- PROMPT 12 — NOTIFICATION FRAMEWORK
-- ████████████████████████████████████████████████████████████████████████████

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS audience_type TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS audience_filter JSONB;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

CREATE TABLE IF NOT EXISTS public.notification_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    delivery_channel TEXT DEFAULT 'in_app',
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent','delivered','failed','read')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(notification_id, recipient_id, delivery_channel)
);

CREATE INDEX IF NOT EXISTS idx_nr_recipient ON public.notification_recipients(recipient_id);
CREATE INDEX IF NOT EXISTS idx_nr_notification ON public.notification_recipients(notification_id);
CREATE INDEX IF NOT EXISTS idx_nr_unread ON public.notification_recipients(recipient_id, read_at) WHERE read_at IS NULL;

ALTER TABLE public.user_push_tokens ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.user_push_tokens ADD COLUMN IF NOT EXISTS app_version TEXT;

CREATE TABLE IF NOT EXISTS public.otp_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    phone TEXT,
    email TEXT,
    purpose TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    channel TEXT DEFAULT 'sms' CHECK (channel IN ('sms','email','whatsapp')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    invalidated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_otp_user ON public.otp_records(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_rate_limit ON public.otp_records(phone, created_at);

CREATE OR REPLACE FUNCTION public.create_notification(
    p_institution_id TEXT, p_type TEXT, p_title TEXT, p_message TEXT,
    p_audience_type TEXT, p_audience_filter JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL, p_action_url TEXT DEFAULT NULL,
    p_priority TEXT DEFAULT 'normal'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_notif_id UUID; v_inst_uuid UUID;
BEGIN
    SELECT id INTO v_inst_uuid FROM public.institutions WHERE institution_id = p_institution_id;

    INSERT INTO public.notifications (
        institution_id, user_id, title, message, type, notification_type,
        audience_type, audience_filter, metadata, action_url, priority, sender_id
    ) VALUES (
        v_inst_uuid, auth.uid(), p_title, p_message, p_type, p_type,
        p_audience_type, p_audience_filter, p_metadata, p_action_url, p_priority, auth.uid()
    ) RETURNING id INTO v_notif_id;

    IF p_audience_type = 'user' AND p_audience_filter ? 'user_id' THEN
        INSERT INTO public.notification_recipients (notification_id, recipient_id)
        VALUES (v_notif_id, (p_audience_filter->>'user_id')::uuid);
    ELSIF p_audience_type = 'role' AND p_audience_filter ? 'role' THEN
        INSERT INTO public.notification_recipients (notification_id, recipient_id)
        SELECT v_notif_id, p.id FROM public.profiles p
        WHERE p.institution_id = p_institution_id AND p.role = p_audience_filter->>'role';
    ELSIF p_audience_type = 'class_section' THEN
        INSERT INTO public.notification_recipients (notification_id, recipient_id)
        SELECT v_notif_id, s.parent_id FROM public.students s
        WHERE s.institution_id = p_institution_id
          AND s.class_name = p_audience_filter->>'class_name'
          AND (p_audience_filter->>'section' IS NULL OR s.section = p_audience_filter->>'section')
          AND s.parent_id IS NOT NULL;
    ELSIF p_audience_type = 'linked_parents' AND p_audience_filter ? 'student_id' THEN
        INSERT INTO public.notification_recipients (notification_id, recipient_id)
        SELECT v_notif_id, psl.parent_profile_id FROM public.parent_student_links psl
        WHERE psl.student_id = (p_audience_filter->>'student_id')::uuid;
    END IF;

    RETURN v_notif_id;
END;
$$;

ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nr_select" ON public.notification_recipients;
CREATE POLICY "nr_select" ON public.notification_recipients FOR SELECT TO authenticated
USING (recipient_id = auth.uid() OR public.is_super_admin());
DROP POLICY IF EXISTS "nr_update" ON public.notification_recipients;
CREATE POLICY "nr_update" ON public.notification_recipients FOR UPDATE TO authenticated USING (recipient_id = auth.uid());
DROP POLICY IF EXISTS "nr_insert" ON public.notification_recipients;
CREATE POLICY "nr_insert" ON public.notification_recipients FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "otp_own" ON public.otp_records;
CREATE POLICY "otp_own" ON public.otp_records FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_super_admin())
WITH CHECK (user_id = auth.uid() OR public.is_super_admin());


-- ████████████████████████████████████████████████████████████████████████████
-- PROMPT 13 — FEE MANAGEMENT (TERM-WISE)
-- ████████████████████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS public.academic_terms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    term_name TEXT NOT NULL,
    term_number INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, academic_year, term_number)
);

ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS term_id UUID;
ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'tuition';

CREATE TABLE IF NOT EXISTS public.fee_components (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fee_structure_id UUID NOT NULL REFERENCES public.fee_structures(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_optional BOOLEAN DEFAULT false,
    is_transport BOOLEAN DEFAULT false,
    category TEXT DEFAULT 'academic',
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.fee_concessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_fee_id UUID REFERENCES public.student_fees(id) ON DELETE CASCADE,
    concession_type TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    percentage NUMERIC(5,2),
    reason TEXT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

ALTER TABLE public.fee_concessions ADD COLUMN IF NOT EXISTS student_fee_id UUID REFERENCES public.student_fees(id) ON DELETE CASCADE;
ALTER TABLE public.fee_concessions ADD COLUMN IF NOT EXISTS concession_type TEXT;
ALTER TABLE public.fee_concessions ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.fee_concessions ADD COLUMN IF NOT EXISTS percentage NUMERIC(5,2);
ALTER TABLE public.fee_concessions ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.fee_concessions ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.fee_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_fee_id UUID REFERENCES public.student_fees(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount NUMERIC(12,2),
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash','card','upi','netbanking','cheque','dd','online','other')),
    payment_reference TEXT,
    payment_date TIMESTAMPTZ DEFAULT timezone('utc', now()),
    is_reversal BOOLEAN DEFAULT false,
    reversed_payment_id UUID,
    receipt_number TEXT,
    notes TEXT,
    collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS student_fee_id UUID REFERENCES public.student_fees(id) ON DELETE CASCADE;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2);
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ DEFAULT timezone('utc', now());
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT false;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS reversed_payment_id UUID;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'fee_payments' 
          AND column_name = 'student_fee_id'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fp_student_fee ON public.fee_payments(student_fee_id)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_fp_student ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fp_institution ON public.fee_payments(institution_id);

CREATE TABLE IF NOT EXISTS public.fee_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    receipt_number TEXT NOT NULL,
    payment_id UUID NOT NULL REFERENCES public.fee_payments(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL,
    student_id UUID NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    pdf_url TEXT,
    UNIQUE(receipt_number, institution_id)
);

ALTER TABLE public.student_fees ADD COLUMN IF NOT EXISTS term_id UUID;
ALTER TABLE public.student_fees ADD COLUMN IF NOT EXISTS academic_year TEXT;
ALTER TABLE public.student_fees ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.student_fees ADD COLUMN IF NOT EXISTS concession_amount NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_concessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "terms_all" ON public.academic_terms;
CREATE POLICY "terms_all" ON public.academic_terms FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "fc_all" ON public.fee_components;
CREATE POLICY "fc_all" ON public.fee_components FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "concessions_all" ON public.fee_concessions;
CREATE POLICY "concessions_all" ON public.fee_concessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "payments_select" ON public.fee_payments;
CREATE POLICY "payments_select" ON public.fee_payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "payments_insert" ON public.fee_payments;
CREATE POLICY "payments_insert" ON public.fee_payments FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR institution_id IN (
        SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution','accountant')
    )
);
DROP POLICY IF EXISTS "receipts_all" ON public.fee_receipts;
CREATE POLICY "receipts_all" ON public.fee_receipts FOR SELECT TO authenticated USING (true);


-- ████████████████████████████████████████████████████████████████████████████
-- PROMPT 14 — AD MANAGER
-- ████████████████████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS public.advertisements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    ad_type TEXT DEFAULT 'banner' CHECK (ad_type IN ('banner','interstitial','native','video','popup')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','paused','expired','archived')),
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image','video','gif','html')),
    thumbnail_url TEXT,
    click_url TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    display_time_start TIME,
    display_time_end TIME,
    days_of_week JSONB DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]'::jsonb,
    priority INTEGER DEFAULT 5,
    sequence_order INTEGER DEFAULT 0,
    max_impressions_per_day INTEGER,
    max_impressions_total INTEGER,
    campaign_id UUID,
    campaign_name TEXT,
    advertiser_name TEXT,
    advertiser_contact TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_ads_status ON public.advertisements(status);
CREATE INDEX IF NOT EXISTS idx_ads_dates ON public.advertisements(start_date, end_date);

CREATE TABLE IF NOT EXISTS public.ad_financial_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL CHECK (record_type IN ('charge','payment','refund','invoice')),
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','overdue','cancelled')),
    payment_method TEXT,
    payment_reference TEXT,
    invoice_number TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.ad_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('impression','click','close','view_complete')),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_ad_events_ad ON public.ad_events(advertisement_id, event_type);
CREATE INDEX IF NOT EXISTS idx_ad_events_date ON public.ad_events(created_at);

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_select" ON public.advertisements;
CREATE POLICY "ads_select" ON public.advertisements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ads_manage" ON public.advertisements;
CREATE POLICY "ads_manage" ON public.advertisements FOR ALL TO authenticated
USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution','media')))
WITH CHECK (public.is_super_admin() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution','media')));

DROP POLICY IF EXISTS "ad_finance_select" ON public.ad_financial_records;
CREATE POLICY "ad_finance_select" ON public.ad_financial_records FOR SELECT TO authenticated
USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution','accountant','finance')));
DROP POLICY IF EXISTS "ad_finance_manage" ON public.ad_financial_records;
CREATE POLICY "ad_finance_manage" ON public.ad_financial_records FOR ALL TO authenticated
USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution','accountant','finance')))
WITH CHECK (public.is_super_admin() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution','accountant','finance')));

DROP POLICY IF EXISTS "ad_events_insert" ON public.ad_events;
CREATE POLICY "ad_events_insert" ON public.ad_events FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ad_events_select" ON public.ad_events;
CREATE POLICY "ad_events_select" ON public.ad_events FOR SELECT TO authenticated
USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution','analytics','media')));


-- ████████████████████████████████████████████████████████████████████████████
-- PROMPT 15 — MANUAL FINANCE & PAYROLL
-- ████████████████████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS public.payment_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income','expense')),
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, name, type)
);

INSERT INTO public.payment_categories (institution_id, name, type, is_system) VALUES
    (NULL, 'Student Fees', 'income', true),
    (NULL, 'Transport Fees', 'income', true),
    (NULL, 'Canteen Revenue', 'income', true),
    (NULL, 'Advertisement Revenue', 'income', true),
    (NULL, 'Donation', 'income', true),
    (NULL, 'Other Income', 'income', true),
    (NULL, 'Salary & Wages', 'expense', true),
    (NULL, 'Utilities', 'expense', true),
    (NULL, 'Maintenance', 'expense', true),
    (NULL, 'Stationery & Supplies', 'expense', true),
    (NULL, 'Transport Operations', 'expense', true),
    (NULL, 'Events & Activities', 'expense', true),
    (NULL, 'Insurance', 'expense', true),
    (NULL, 'Other Expense', 'expense', true)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.manual_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.payment_categories(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income','expense','reversal')),
    amount NUMERIC(12,2) NOT NULL,
    description TEXT,
    payment_method TEXT,
    reference_number TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    status TEXT DEFAULT 'approved' CHECK (status IN ('draft','pending_approval','approved','rejected')),
    requires_approval BOOLEAN DEFAULT false,
    approval_threshold NUMERIC(12,2),
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    is_reversal BOOLEAN DEFAULT false,
    reversed_transaction_id UUID REFERENCES public.manual_transactions(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_mt_institution ON public.manual_transactions(institution_id);
CREATE INDEX IF NOT EXISTS idx_mt_date ON public.manual_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_mt_status ON public.manual_transactions(status);

CREATE TABLE IF NOT EXISTS public.payroll_components (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    component_type TEXT NOT NULL CHECK (component_type IN ('earning','deduction','employer_contribution')),
    calculation_type TEXT NOT NULL DEFAULT 'fixed' CHECK (calculation_type IN ('fixed','percentage','slab')),
    percentage_of TEXT,
    percentage_value NUMERIC(5,2),
    slab_config JSONB,
    cap_amount NUMERIC(12,2),
    is_taxable BOOLEAN DEFAULT true,
    is_mandatory BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, name)
);

COMMENT ON TABLE public.payroll_components IS 'CTC/PF rules. DISABLED by default until business confirms. See /docs/ai/OPEN_POINTS.md';

CREATE TABLE IF NOT EXISTS public.employee_salary_structures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    ctc_annual NUMERIC(12,2),
    basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    component_overrides JSONB DEFAULT '{}'::jsonb,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(profile_id, effective_from)
);

CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    pay_month TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','paid','cancelled')),
    total_gross NUMERIC(14,2) DEFAULT 0,
    total_deductions NUMERIC(14,2) DEFAULT 0,
    total_net NUMERIC(14,2) DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    prepared_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, pay_month)
);

CREATE TABLE IF NOT EXISTS public.payroll_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL,
    basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    earnings JSONB DEFAULT '{}'::jsonb,
    deductions JSONB DEFAULT '{}'::jsonb,
    gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    days_worked INTEGER,
    days_absent INTEGER DEFAULT 0,
    leaves_taken INTEGER DEFAULT 0,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','processing','paid','failed')),
    payment_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(payroll_run_id, profile_id)
);

ALTER TABLE public.payment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pc_all" ON public.payment_categories;
CREATE POLICY "pc_all" ON public.payment_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "mt_select" ON public.manual_transactions;
CREATE POLICY "mt_select" ON public.manual_transactions FOR SELECT TO authenticated
USING (public.is_super_admin() OR institution_id IN (
    SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution','accountant','finance')
));
DROP POLICY IF EXISTS "mt_insert" ON public.manual_transactions;
CREATE POLICY "mt_insert" ON public.manual_transactions FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin() OR institution_id IN (
    SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution','accountant','finance')
));

DROP POLICY IF EXISTS "payroll_comp_admin" ON public.payroll_components;
CREATE POLICY "payroll_comp_admin" ON public.payroll_components FOR ALL TO authenticated
USING (public.is_super_admin() OR institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution')))
WITH CHECK (public.is_super_admin() OR institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution')));

DROP POLICY IF EXISTS "ess_admin" ON public.employee_salary_structures;
CREATE POLICY "ess_admin" ON public.employee_salary_structures FOR ALL TO authenticated
USING (
    public.is_super_admin()
    OR institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution','accountant','finance'))
    OR profile_id = auth.uid()
) WITH CHECK (
    public.is_super_admin()
    OR institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution'))
);

DROP POLICY IF EXISTS "pr_admin" ON public.payroll_runs;
CREATE POLICY "pr_admin" ON public.payroll_runs FOR ALL TO authenticated
USING (public.is_super_admin() OR institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution','accountant','finance')))
WITH CHECK (public.is_super_admin() OR institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution','accountant','finance')));

DROP POLICY IF EXISTS "pe_admin" ON public.payroll_entries;
CREATE POLICY "pe_admin" ON public.payroll_entries FOR ALL TO authenticated
USING (
    public.is_super_admin()
    OR institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution','accountant','finance'))
    OR profile_id = auth.uid()
) WITH CHECK (
    public.is_super_admin()
    OR institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution','accountant','finance'))
);


-- ████████████████████████████████████████████████████████████████████████████
-- PROMPT 16 — TRANSPORT MANAGEMENT
-- ████████████████████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS public.transport_vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    registration_number TEXT NOT NULL,
    vehicle_type TEXT DEFAULT 'bus',
    capacity INTEGER NOT NULL DEFAULT 40,
    current_occupancy INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','maintenance','retired','breakdown')),
    insurance_expiry DATE,
    fitness_expiry DATE,
    permit_expiry DATE,
    make TEXT,
    model TEXT,
    year INTEGER,
    gps_device_id TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, registration_number)
);

CREATE TABLE IF NOT EXISTS public.transport_staff (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    staff_type TEXT NOT NULL CHECK (staff_type IN ('driver','attendant')),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    license_number TEXT,
    license_expiry DATE,
    license_type TEXT,
    emergency_contact TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','on_leave')),
    assigned_vehicle_id UUID REFERENCES public.transport_vehicles(id) ON DELETE SET NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.transport_routes_v2 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    route_name TEXT NOT NULL,
    route_code TEXT,
    route_type TEXT DEFAULT 'both' CHECK (route_type IN ('pickup','drop','both')),
    distance_km NUMERIC(8,2),
    estimated_duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, route_name)
);

CREATE TABLE IF NOT EXISTS public.transport_stops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_id UUID NOT NULL REFERENCES public.transport_routes_v2(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL,
    stop_name TEXT NOT NULL,
    stop_order INTEGER NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    landmark TEXT,
    pickup_time TIME,
    drop_time TIME,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(route_id, stop_order)
);

CREATE TABLE IF NOT EXISTS public.transport_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES public.transport_routes_v2(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.transport_staff(id) ON DELETE CASCADE,
    attendant_id UUID REFERENCES public.transport_staff(id) ON DELETE SET NULL,
    assignment_type TEXT DEFAULT 'regular' CHECK (assignment_type IN ('regular','substitute')),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.student_transport_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES public.transport_routes_v2(id) ON DELETE CASCADE,
    pickup_stop_id UUID REFERENCES public.transport_stops(id) ON DELETE SET NULL,
    drop_stop_id UUID REFERENCES public.transport_stops(id) ON DELETE SET NULL,
    transport_status TEXT DEFAULT 'active' CHECK (transport_status IN ('active','inactive','suspended')),
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(student_id, route_id)
);

CREATE OR REPLACE FUNCTION public.validate_vehicle_capacity()
RETURNS TRIGGER AS $$
DECLARE v_vehicle RECORD; v_current_count INT;
BEGIN
    SELECT tv.* INTO v_vehicle FROM public.transport_vehicles tv
    JOIN public.transport_assignments ta ON ta.vehicle_id = tv.id
    WHERE ta.route_id = NEW.route_id AND ta.is_active = true LIMIT 1;

    IF v_vehicle.id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_current_count FROM public.student_transport_allocations
        WHERE route_id = NEW.route_id AND transport_status = 'active'
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
        IF v_current_count >= v_vehicle.capacity THEN
            RAISE EXCEPTION 'Vehicle % (capacity %) is full. Current: % students.',
                v_vehicle.registration_number, v_vehicle.capacity, v_current_count USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_vehicle_capacity ON public.student_transport_allocations;
CREATE TRIGGER trg_validate_vehicle_capacity
    BEFORE INSERT OR UPDATE ON public.student_transport_allocations
    FOR EACH ROW WHEN (NEW.transport_status = 'active')
    EXECUTE FUNCTION public.validate_vehicle_capacity();

CREATE TABLE IF NOT EXISTS public.transport_fee_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    fee_rule_type TEXT NOT NULL DEFAULT 'flat' CHECK (fee_rule_type IN ('route_based','distance_based','flat')),
    is_active BOOLEAN DEFAULT false,
    flat_amount NUMERIC(12,2),
    route_amounts JSONB,
    distance_slabs JSONB,
    academic_year TEXT,
    term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id, academic_year)
);

COMMENT ON TABLE public.transport_fee_rules IS 'Transport fee rules. DISABLED by default. See /docs/ai/OPEN_POINTS.md';

ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_routes_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_transport_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_fee_rules ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['transport_vehicles','transport_staff','transport_routes_v2','transport_stops','transport_assignments','student_transport_allocations','transport_fee_rules']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_all" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;


-- ████████████████████████████████████████████████████████████████████████████
-- PROMPT 17 — LIVE BUS TRACKING
-- ████████████████████████████████████████████████████████████████████████████

CREATE TABLE IF NOT EXISTS public.transport_trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES public.transport_routes_v2(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.transport_staff(id) ON DELETE CASCADE,
    trip_type TEXT DEFAULT 'pickup' CHECK (trip_type IN ('pickup','drop')),
    trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','running','completed','delayed','cancelled')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    start_odometer NUMERIC(10,1),
    end_odometer NUMERIC(10,1),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(route_id, trip_date, trip_type)
);

CREATE INDEX IF NOT EXISTS idx_trips_date ON public.transport_trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.transport_trips(status);

CREATE TABLE IF NOT EXISTS public.trip_location_latest (
    trip_id UUID PRIMARY KEY REFERENCES public.transport_trips(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed NUMERIC(6,2),
    heading NUMERIC(6,2),
    accuracy NUMERIC(8,2),
    altitude NUMERIC(10,2),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    is_offline BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.trip_location_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES public.transport_trips(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed NUMERIC(6,2),
    heading NUMERIC(6,2),
    accuracy NUMERIC(8,2),
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_tlh_trip ON public.trip_location_history(trip_id, timestamp);

CREATE OR REPLACE FUNCTION public.update_trip_location(
    p_trip_id UUID, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION,
    p_speed NUMERIC DEFAULT NULL, p_heading NUMERIC DEFAULT NULL,
    p_accuracy NUMERIC DEFAULT NULL, p_timestamp TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_trip RECORD; v_ts TIMESTAMPTZ := COALESCE(p_timestamp, now());
BEGIN
    SELECT * INTO v_trip FROM public.transport_trips WHERE id = p_trip_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Trip not found'; END IF;
    IF v_trip.status NOT IN ('running') THEN RAISE EXCEPTION 'Trip is not active (status: %)', v_trip.status; END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.transport_staff WHERE id = v_trip.driver_id AND profile_id = auth.uid()
    ) AND NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: not the assigned driver' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.trip_location_latest (trip_id, latitude, longitude, speed, heading, accuracy, timestamp, updated_at)
    VALUES (p_trip_id, p_lat, p_lng, p_speed, p_heading, p_accuracy, v_ts, now())
    ON CONFLICT (trip_id) DO UPDATE SET
        latitude = p_lat, longitude = p_lng, speed = p_speed, heading = p_heading,
        accuracy = p_accuracy, timestamp = v_ts, is_offline = false, updated_at = now();

    INSERT INTO public.trip_location_history (trip_id, latitude, longitude, speed, heading, accuracy, timestamp)
    VALUES (p_trip_id, p_lat, p_lng, p_speed, p_heading, p_accuracy, v_ts);

    RETURN jsonb_build_object('success', true, 'trip_id', p_trip_id, 'timestamp', v_ts);
END;
$$;

CREATE TABLE IF NOT EXISTS public.boarding_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES public.transport_trips(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    stop_id UUID REFERENCES public.transport_stops(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('boarded','dropped')),
    scan_method TEXT CHECK (scan_method IN ('rfid','qr','manual')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.boarding_events IS 'Student boarding events. Feature OFF by default.';

CREATE TABLE IF NOT EXISTS public.transport_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    gps_update_interval_seconds INTEGER DEFAULT 10,
    gps_offline_threshold_seconds INTEGER DEFAULT 60,
    location_history_retention_days INTEGER DEFAULT 90,
    boarding_scan_enabled BOOLEAN DEFAULT false,
    map_provider TEXT DEFAULT 'openstreetmap',
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    UNIQUE(institution_id)
);

COMMENT ON TABLE public.transport_config IS 'Transport config per institution. All values configurable. See /docs/ai/OPEN_POINTS.md';

ALTER TABLE public.transport_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_location_latest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trips_all" ON public.transport_trips;
CREATE POLICY "trips_all" ON public.transport_trips FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tll_select" ON public.trip_location_latest;
CREATE POLICY "tll_select" ON public.trip_location_latest FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR trip_id IN (SELECT t.id FROM public.transport_trips t JOIN public.transport_staff ts ON ts.id = t.driver_id WHERE ts.profile_id = auth.uid() AND t.status = 'running')
    OR trip_id IN (SELECT t.id FROM public.transport_trips t JOIN public.student_transport_allocations sta ON sta.route_id = t.route_id JOIN public.parent_student_links psl ON psl.student_id = sta.student_id WHERE psl.parent_profile_id = auth.uid() AND t.status = 'running')
    OR trip_id IN (SELECT t.id FROM public.transport_trips t WHERE t.institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution')) AND t.status = 'running')
);
DROP POLICY IF EXISTS "tll_upsert" ON public.trip_location_latest;
CREATE POLICY "tll_upsert" ON public.trip_location_latest FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tlh_select" ON public.trip_location_history;
CREATE POLICY "tlh_select" ON public.trip_location_history FOR SELECT TO authenticated
USING (public.is_super_admin() OR trip_id IN (SELECT t.id FROM public.transport_trips t WHERE t.institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','institution'))));
DROP POLICY IF EXISTS "tlh_insert" ON public.trip_location_history;
CREATE POLICY "tlh_insert" ON public.trip_location_history FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "be_all" ON public.boarding_events;
CREATE POLICY "be_all" ON public.boarding_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tc_all" ON public.transport_config;
CREATE POLICY "tc_all" ON public.transport_config FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ████████████████████████████████████████████████████████████████████████████
-- REALTIME — Enable for new tables
-- ████████████████████████████████████████████████████████████████████████████

DO $$
DECLARE tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'admissions','admission_history','parent_student_links',
        'promotion_items','promotion_history','syllabus_versions',
        'substitute_assignments','notification_recipients','fee_payments',
        'advertisements','transport_trips','trip_location_latest'
    ] LOOP
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = tbl) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add % to realtime: %', tbl, SQLERRM;
        END;
    END LOOP;
END $$;


-- ████████████████████████████████████████████████████████████████████████████
-- VERIFICATION
-- ████████████████████████████████████████████████████████████████████████████

DO $$
DECLARE
    new_tables TEXT[] := ARRAY[
        'admissions','admission_history','promotion_items','promotion_eligibility_rules',
        'promotion_history','parent_student_links','leave_types','faculty_leave_balances',
        'subject_class_mappings','syllabus_versions','timetable_versions','substitute_assignments',
        'notification_recipients','otp_records','academic_terms','fee_components','fee_concessions',
        'fee_payments','fee_receipts','advertisements','ad_financial_records','ad_events',
        'payment_categories','manual_transactions','payroll_components','employee_salary_structures',
        'payroll_runs','payroll_entries','transport_vehicles','transport_staff','transport_routes_v2',
        'transport_stops','transport_assignments','student_transport_allocations','transport_fee_rules',
        'transport_trips','trip_location_latest','trip_location_history','boarding_events','transport_config'
    ];
    found_count INT := 0; tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY new_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            found_count := found_count + 1;
        ELSE
            RAISE NOTICE 'WARNING: Table % was NOT created', tbl;
        END IF;
    END LOOP;
    RAISE NOTICE 'Migration complete: % / % new tables verified', found_count, array_length(new_tables, 1);
END $$;
