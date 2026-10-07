-- ============================================================
-- Migration: Extend Institution Management
-- Purpose:
--   1. Nullable columns for exact structured address and map info
--   2. Academic structure: stages, standards (KG to 10th+), departments & sections
--   3. Deletion guards on standards, sections, and departments
--   4. RLS & Audit logging via log_audit
-- ============================================================

-- ============================================================
-- 1. Extend institutions with structured address & map columns
-- ============================================================
ALTER TABLE public.institutions 
    ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
    ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
    ADD COLUMN IF NOT EXISTS pincode TEXT,
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS map_link TEXT,
    ADD COLUMN IF NOT EXISTS has_kg BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS academic_stages JSONB DEFAULT '["primary", "middle", "secondary"]'::jsonb;

COMMENT ON COLUMN public.institutions.address_line_1 IS 'Street address line 1';
COMMENT ON COLUMN public.institutions.address_line_2 IS 'Street address line 2 / Area / Landmark';
COMMENT ON COLUMN public.institutions.pincode IS 'Postal code / PIN code';
COMMENT ON COLUMN public.institutions.latitude IS 'Geographical latitude coordinate';
COMMENT ON COLUMN public.institutions.longitude IS 'Geographical longitude coordinate';
COMMENT ON COLUMN public.institutions.map_link IS 'Optional Google Maps / OpenStreetMap URL';
COMMENT ON COLUMN public.institutions.has_kg IS 'Whether the institution offers Kindergarten (Pre-KG, LKG, UKG)';
COMMENT ON COLUMN public.institutions.academic_stages IS 'Array of configured stages: pre_primary, primary, middle, secondary, higher_secondary';

-- ============================================================
-- 2. Extend classes table with stage, standard, and ordering
-- ============================================================
ALTER TABLE public.classes
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS class_name TEXT,
    ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'primary',
    ADD COLUMN IF NOT EXISTS standard TEXT,
    ADD COLUMN IF NOT EXISTS sections TEXT[] DEFAULT '{A}'::text[],
    ADD COLUMN IF NOT EXISTS class_order INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_final_class BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS group_id UUID;

-- Keep name and class_name in sync
CREATE OR REPLACE FUNCTION public.sync_class_name_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.name IS NOT NULL AND (NEW.class_name IS NULL OR NEW.class_name = '') THEN
        NEW.class_name := NEW.name;
    ELSIF NEW.class_name IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN
        NEW.name := NEW.class_name;
    END IF;
    IF NEW.standard IS NULL OR NEW.standard = '' THEN
        NEW.standard := COALESCE(NEW.name, NEW.class_name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_class_name ON public.classes;
CREATE TRIGGER trg_sync_class_name
BEFORE INSERT OR UPDATE ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.sync_class_name_columns();

-- ============================================================
-- 3. Departments Configuration Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    head_of_department_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(institution_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_institution ON public.departments(institution_id);
COMMENT ON TABLE public.departments IS 'Configured academic departments per institution';

-- ============================================================
-- 4. Sections Configuration Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    standard TEXT NOT NULL,
    name TEXT NOT NULL,
    room_number TEXT,
    capacity INTEGER DEFAULT 40,
    order_index INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(institution_id, standard, name)
);

CREATE INDEX IF NOT EXISTS idx_sections_institution ON public.sections(institution_id);
CREATE INDEX IF NOT EXISTS idx_sections_standard ON public.sections(institution_id, standard);
COMMENT ON TABLE public.sections IS 'Configured sections (A, B, C...) per standard with ordering and capacity';

-- ============================================================
-- 5. Audit Logging Infrastructure (log_audit)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.institution_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id TEXT,
    actor_id UUID,
    actor_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_inst_audit_institution ON public.institution_audit_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_inst_audit_entity ON public.institution_audit_logs(entity_type, entity_id);

CREATE OR REPLACE FUNCTION public.log_audit(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_institution_id TEXT,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_actor_id UUID := auth.uid();
    v_actor_email TEXT;
BEGIN
    IF v_actor_id IS NOT NULL THEN
        SELECT email INTO v_actor_email FROM public.profiles WHERE id = v_actor_id;
    END IF;

    INSERT INTO public.institution_audit_logs (
        institution_id, actor_id, actor_email, action, entity_type, entity_id, old_data, new_data
    ) VALUES (
        p_institution_id, v_actor_id, v_actor_email, p_action, p_entity_type, p_entity_id, p_old_data, p_new_data
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. Deletion Guards (Students, Faculty, Timetable integrity)
-- ============================================================

-- Guard 1: Prevent deleting a standard/class with active dependents
CREATE OR REPLACE FUNCTION public.prevent_class_delete_with_dependents()
RETURNS TRIGGER AS $$
DECLARE
    v_student_count INT := 0;
    v_faculty_count INT := 0;
    v_timetable_count INT := 0;
    v_class_name TEXT := COALESCE(OLD.name, OLD.class_name, OLD.standard);
BEGIN
    -- Check students table
    SELECT COUNT(*) INTO v_student_count
    FROM public.students
    WHERE institution_id = OLD.institution_id 
      AND (class_name = v_class_name OR class_id = OLD.id);

    IF v_student_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete standard/class "%": % enrolled student(s) exist. Reassign or remove students first.', v_class_name, v_student_count
            USING ERRCODE = '23503';
    END IF;

    -- Check faculty_subjects assignments if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'faculty_subjects') THEN
        SELECT COUNT(*) INTO v_faculty_count
        FROM public.faculty_subjects
        WHERE institution_id = OLD.institution_id AND class_id = OLD.id;
        
        IF v_faculty_count > 0 THEN
            RAISE EXCEPTION 'Cannot delete standard/class "%": % faculty assignment(s) exist. Unassign faculty first.', v_class_name, v_faculty_count
                USING ERRCODE = '23503';
        END IF;
    END IF;

    -- Check timetable_configs if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timetable_configs') THEN
        SELECT COUNT(*) INTO v_timetable_count
        FROM public.timetable_configs
        WHERE institution_id = OLD.institution_id AND class_id = OLD.id;
        
        IF v_timetable_count > 0 THEN
            RAISE EXCEPTION 'Cannot delete standard/class "%": active timetable schedule configuration exists.', v_class_name
                USING ERRCODE = '23503';
        END IF;
    END IF;

    -- Audit log deletion
    PERFORM public.log_audit('DELETE', 'standard', OLD.id::text, OLD.institution_id, to_jsonb(OLD), NULL);

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_class_delete ON public.classes;
CREATE TRIGGER trg_prevent_class_delete
BEFORE DELETE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.prevent_class_delete_with_dependents();

-- Guard 2: Prevent deleting a section with active dependents
CREATE OR REPLACE FUNCTION public.prevent_section_delete_with_dependents()
RETURNS TRIGGER AS $$
DECLARE
    v_student_count INT := 0;
    v_faculty_count INT := 0;
    v_timetable_count INT := 0;
BEGIN
    -- Check students
    SELECT COUNT(*) INTO v_student_count
    FROM public.students
    WHERE institution_id = OLD.institution_id 
      AND (class_name = OLD.standard OR class_id = OLD.class_id)
      AND section = OLD.name;

    IF v_student_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete section "%" of standard "%": % active student(s) assigned.', OLD.name, OLD.standard, v_student_count
            USING ERRCODE = '23503';
    END IF;

    -- Check faculty_subjects
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'faculty_subjects') THEN
        SELECT COUNT(*) INTO v_faculty_count
        FROM public.faculty_subjects
        WHERE institution_id = OLD.institution_id 
          AND (class_id = OLD.class_id OR OLD.class_id IS NULL)
          AND section = OLD.name;

        IF v_faculty_count > 0 THEN
            RAISE EXCEPTION 'Cannot delete section "%" of standard "%": % faculty assignment(s) linked.', OLD.name, OLD.standard, v_faculty_count
                USING ERRCODE = '23503';
        END IF;
    END IF;

    -- Check timetable_configs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timetable_configs') THEN
        SELECT COUNT(*) INTO v_timetable_count
        FROM public.timetable_configs
        WHERE institution_id = OLD.institution_id 
          AND (class_id = OLD.class_id OR OLD.class_id IS NULL)
          AND section = OLD.name;

        IF v_timetable_count > 0 THEN
            RAISE EXCEPTION 'Cannot delete section "%" of standard "%": active timetable schedule linked.', OLD.name, OLD.standard
                USING ERRCODE = '23503';
        END IF;
    END IF;

    -- Audit log deletion
    PERFORM public.log_audit('DELETE', 'section', OLD.id::text, OLD.institution_id, to_jsonb(OLD), NULL);

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_section_delete ON public.sections;
CREATE TRIGGER trg_prevent_section_delete
BEFORE DELETE ON public.sections
FOR EACH ROW
EXECUTE FUNCTION public.prevent_section_delete_with_dependents();

-- Guard 3: Prevent deleting a department with active faculty/staff
CREATE OR REPLACE FUNCTION public.prevent_department_delete_with_dependents()
RETURNS TRIGGER AS $$
DECLARE
    v_profile_count INT := 0;
BEGIN
    SELECT COUNT(*) INTO v_profile_count
    FROM public.profiles
    WHERE institution_id = OLD.institution_id AND TRIM(department) = TRIM(OLD.name);

    IF v_profile_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete department "%": % staff/faculty member(s) are assigned to it. Reassign members first.', OLD.name, v_profile_count
            USING ERRCODE = '23503';
    END IF;

    -- Audit log deletion
    PERFORM public.log_audit('DELETE', 'department', OLD.id::text, OLD.institution_id, to_jsonb(OLD), NULL);

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_department_delete ON public.departments;
CREATE TRIGGER trg_prevent_department_delete
BEFORE DELETE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_department_delete_with_dependents();

-- ============================================================
-- 7. Audit Triggers for Configuration Changes
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_institution_config_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_audit('CREATE', TG_TABLE_NAME, NEW.id::text, NEW.institution_id, NULL, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_audit('UPDATE', TG_TABLE_NAME, NEW.id::text, NEW.institution_id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_departments ON public.departments;
CREATE TRIGGER trg_audit_departments
AFTER INSERT OR UPDATE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.audit_institution_config_changes();

DROP TRIGGER IF EXISTS trg_audit_sections ON public.sections;
CREATE TRIGGER trg_audit_sections
AFTER INSERT OR UPDATE ON public.sections
FOR EACH ROW EXECUTE FUNCTION public.audit_institution_config_changes();

-- ============================================================
-- 8. Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND role IN ('superadmin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Departments RLS
DROP POLICY IF EXISTS "Departments: select policy" ON public.departments;
CREATE POLICY "Departments: select policy" ON public.departments
FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR institution_id IN (
        SELECT institution_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT institution_id FROM public.institution_stakeholder_links WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Departments: admin insert" ON public.departments;
CREATE POLICY "Departments: admin insert" ON public.departments
FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR (
        institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'institution'))
        AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'stakeholder')
    )
);

DROP POLICY IF EXISTS "Departments: admin update" ON public.departments;
CREATE POLICY "Departments: admin update" ON public.departments
FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR (
        institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'institution'))
        AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'stakeholder')
    )
);

DROP POLICY IF EXISTS "Departments: admin delete" ON public.departments;
CREATE POLICY "Departments: admin delete" ON public.departments
FOR DELETE TO authenticated
USING (
    public.is_super_admin()
    OR (
        institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'institution'))
        AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'stakeholder')
    )
);

-- Sections RLS
DROP POLICY IF EXISTS "Sections: select policy" ON public.sections;
CREATE POLICY "Sections: select policy" ON public.sections
FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR institution_id IN (
        SELECT institution_id FROM public.profiles WHERE id = auth.uid()
        UNION
        SELECT institution_id FROM public.institution_stakeholder_links WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Sections: admin insert" ON public.sections;
CREATE POLICY "Sections: admin insert" ON public.sections
FOR INSERT TO authenticated
WITH CHECK (
    public.is_super_admin()
    OR (
        institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'institution'))
        AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'stakeholder')
    )
);

DROP POLICY IF EXISTS "Sections: admin update" ON public.sections;
CREATE POLICY "Sections: admin update" ON public.sections
FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR (
        institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'institution'))
        AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'stakeholder')
    )
);

DROP POLICY IF EXISTS "Sections: admin delete" ON public.sections;
CREATE POLICY "Sections: admin delete" ON public.sections
FOR DELETE TO authenticated
USING (
    public.is_super_admin()
    OR (
        institution_id IN (SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'institution'))
        AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'stakeholder')
    )
);

-- Audit logs RLS (Super Admin sees all, Inst Admin sees own, Stakeholder read-only summaries)
DROP POLICY IF EXISTS "Audit logs: select policy" ON public.institution_audit_logs;
CREATE POLICY "Audit logs: select policy" ON public.institution_audit_logs
FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR institution_id IN (
        SELECT institution_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'institution')
        UNION
        SELECT institution_id FROM public.institution_stakeholder_links WHERE user_id = auth.uid()
    )
);

-- Deny stakeholder writes on new tables via trigger
DROP TRIGGER IF EXISTS trg_stakeholder_deny_departments ON public.departments;
CREATE TRIGGER trg_stakeholder_deny_departments
BEFORE INSERT OR UPDATE OR DELETE ON public.departments
FOR EACH ROW EXECUTE FUNCTION public.deny_stakeholder_writes();

DROP TRIGGER IF EXISTS trg_stakeholder_deny_sections ON public.sections;
CREATE TRIGGER trg_stakeholder_deny_sections
BEFORE INSERT OR UPDATE OR DELETE ON public.sections
FOR EACH ROW EXECUTE FUNCTION public.deny_stakeholder_writes();
