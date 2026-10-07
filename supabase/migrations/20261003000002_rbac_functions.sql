-- ============================================================
-- Migration: RBAC Functions
-- Purpose: has_permission(), get_user_permissions(), audit trigger,
--          and stakeholder aggregation RPCs
-- ============================================================

-- ============================================================
-- 1. has_permission(user_id, module, action) → boolean
-- Core authorization function used in RLS policies and RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_permission(
    p_user_id UUID,
    p_module TEXT,
    p_action TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_has_perm BOOLEAN := false;
    v_flag_enabled BOOLEAN;
BEGIN
    -- 1. Get user role
    SELECT role INTO v_role FROM profiles WHERE id = p_user_id;
    IF v_role IS NULL THEN RETURN false; END IF;

    -- 2. Super admin short-circuit: full access to everything
    IF v_role IN ('admin', 'superadmin') THEN RETURN true; END IF;

    -- 3. Feature flag check: transport module is gated
    IF p_module IN ('transport') THEN
        SELECT enabled INTO v_flag_enabled
        FROM feature_flags WHERE flag_key = 'transport_module_enabled';
        IF v_flag_enabled IS NOT TRUE THEN RETURN false; END IF;
    END IF;

    -- 4. Check role_permissions: match specific action OR 'manage' (which implies all)
    SELECT EXISTS(
        SELECT 1
        FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role = v_role
          AND rp.is_granted = true
          AND p.module = p_module
          AND (p.action = p_action OR p.action = 'manage')
    ) INTO v_has_perm;

    RETURN v_has_perm;
END;
$$;

COMMENT ON FUNCTION public.has_permission IS 'Core RBAC check. Returns true if the user''s role has the specified permission on the module. manage implies all actions.';

-- ============================================================
-- 2. get_permission_scope(user_id, module, action) → text
-- Returns the scope for a granted permission: all, own, own_institution, aggregated
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_permission_scope(
    p_user_id UUID,
    p_module TEXT,
    p_action TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_scope TEXT;
BEGIN
    SELECT role INTO v_role FROM profiles WHERE id = p_user_id;
    IF v_role IS NULL THEN RETURN NULL; END IF;
    IF v_role IN ('admin', 'superadmin') THEN RETURN 'all'; END IF;

    SELECT rp.scope INTO v_scope
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role = v_role
      AND rp.is_granted = true
      AND p.module = p_module
      AND (p.action = p_action OR p.action = 'manage')
    ORDER BY
        CASE p.action WHEN p_action THEN 0 ELSE 1 END -- prefer exact match over 'manage'
    LIMIT 1;

    RETURN v_scope;
END;
$$;

-- ============================================================
-- 3. get_user_permissions(user_id) → JSONB
-- Returns the full permission set for a user, used by the frontend
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_perms JSONB;
    v_linked JSONB;
    v_institution_id TEXT;
BEGIN
    -- Get user role and institution
    SELECT role, institution_id INTO v_role, v_institution_id
    FROM profiles WHERE id = p_user_id;

    IF v_role IS NULL THEN
        RETURN jsonb_build_object('role', NULL, 'is_super', false, 'permissions', '[]'::JSONB);
    END IF;

    -- Super admin: return special flag (frontend short-circuits all checks)
    IF v_role IN ('admin', 'superadmin') THEN
        RETURN jsonb_build_object(
            'role', v_role::TEXT,
            'is_super', true,
            'permissions', '[]'::JSONB,
            'institution_id', v_institution_id
        );
    END IF;

    -- Build permissions array
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'module', p.module,
        'action', p.action,
        'scope', rp.scope
    )), '[]'::JSONB)
    INTO v_perms
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role = v_role AND rp.is_granted = true;

    -- For stakeholders, include linked institution IDs
    IF v_role = 'stakeholder' THEN
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'institution_id', isl.institution_id,
            'can_export', isl.can_export
        )), '[]'::JSONB)
        INTO v_linked
        FROM institution_stakeholder_links isl
        WHERE isl.user_id = p_user_id AND isl.revoked_at IS NULL;

        RETURN jsonb_build_object(
            'role', v_role::TEXT,
            'is_super', false,
            'permissions', v_perms,
            'institution_id', v_institution_id,
            'linked_institutions', v_linked
        );
    END IF;

    RETURN jsonb_build_object(
        'role', v_role::TEXT,
        'is_super', false,
        'permissions', v_perms,
        'institution_id', v_institution_id
    );
END;
$$;

COMMENT ON FUNCTION public.get_user_permissions IS 'Returns the complete permission set for a user as JSONB. Frontend caches this on login.';

-- ============================================================
-- 4. log_rbac_change() — audit trigger function
-- Auto-logs changes to role_permissions, institution_stakeholder_links, profiles.role
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_rbac_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_TABLE_NAME = 'role_permissions' THEN
        INSERT INTO rbac_audit_log (actor_id, action, target_role, details)
        VALUES (
            auth.uid(),
            TG_OP,
            COALESCE(NEW.role::TEXT, OLD.role::TEXT),
            jsonb_build_object(
                'table', TG_TABLE_NAME,
                'permission_id', COALESCE(NEW.permission_id, OLD.permission_id),
                'is_granted', NEW.is_granted,
                'scope', NEW.scope
            )
        );
    ELSIF TG_TABLE_NAME = 'institution_stakeholder_links' THEN
        INSERT INTO rbac_audit_log (actor_id, action, target_user_id, details)
        VALUES (
            auth.uid(),
            TG_OP,
            COALESCE(NEW.user_id, OLD.user_id),
            jsonb_build_object(
                'table', TG_TABLE_NAME,
                'institution_id', COALESCE(NEW.institution_id, OLD.institution_id),
                'can_export', NEW.can_export,
                'revoked_at', NEW.revoked_at::TEXT
            )
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach audit triggers
DROP TRIGGER IF EXISTS trg_audit_role_permissions ON public.role_permissions;
CREATE TRIGGER trg_audit_role_permissions
    AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
    FOR EACH ROW EXECUTE FUNCTION public.log_rbac_change();

DROP TRIGGER IF EXISTS trg_audit_stakeholder_links ON public.institution_stakeholder_links;
CREATE TRIGGER trg_audit_stakeholder_links
    AFTER INSERT OR UPDATE OR DELETE ON public.institution_stakeholder_links
    FOR EACH ROW EXECUTE FUNCTION public.log_rbac_change();

-- ============================================================
-- 5. Stakeholder aggregation RPCs
-- Return only summary data — no personal/PII rows
-- ============================================================

-- 5a. Revenue summary for stakeholder
CREATE OR REPLACE FUNCTION public.get_stakeholder_revenue_summary(p_institution_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_linked BOOLEAN;
    v_result JSONB;
BEGIN
    -- Verify stakeholder is linked to this institution
    SELECT EXISTS(
        SELECT 1 FROM institution_stakeholder_links
        WHERE user_id = v_user_id
          AND institution_id = p_institution_id
          AND revoked_at IS NULL
    ) INTO v_is_linked;

    -- Also allow admin/superadmin/institution admin
    IF NOT v_is_linked THEN
        IF NOT EXISTS(
            SELECT 1 FROM profiles
            WHERE id = v_user_id AND role IN ('admin', 'superadmin', 'institution')
        ) THEN
            RETURN jsonb_build_object('error', 'Access denied');
        END IF;
    END IF;

    SELECT jsonb_build_object(
        'total_collected', COALESCE(SUM(CASE WHEN fp.status = 'completed' THEN fp.amount_paid ELSE 0 END), 0),
        'total_pending', COALESCE(SUM(CASE WHEN fp.status = 'pending' THEN fp.amount_paid ELSE 0 END), 0),
        'payment_count', COUNT(CASE WHEN fp.status = 'completed' THEN 1 END),
        'pending_count', COUNT(CASE WHEN fp.status = 'pending' THEN 1 END),
        'total_fee_structures', (SELECT COUNT(*) FROM fee_structures WHERE institution_id = p_institution_id),
        'institution_id', p_institution_id
    ) INTO v_result
    FROM fee_payments fp
    WHERE fp.institution_id = p_institution_id;

    RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$;

-- 5b. Analytics summary for stakeholder (enrollment, attendance, academic)
CREATE OR REPLACE FUNCTION public.get_stakeholder_analytics_summary(p_institution_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_linked BOOLEAN;
    v_result JSONB;
    v_total_students BIGINT;
    v_total_staff BIGINT;
    v_attendance_rate NUMERIC;
    v_total_classes BIGINT;
BEGIN
    -- Verify access
    SELECT EXISTS(
        SELECT 1 FROM institution_stakeholder_links
        WHERE user_id = v_user_id
          AND institution_id = p_institution_id
          AND revoked_at IS NULL
    ) INTO v_is_linked;

    IF NOT v_is_linked THEN
        IF NOT EXISTS(
            SELECT 1 FROM profiles
            WHERE id = v_user_id AND role IN ('admin', 'superadmin', 'institution')
        ) THEN
            RETURN jsonb_build_object('error', 'Access denied');
        END IF;
    END IF;

    -- Enrollment count
    SELECT COUNT(*) INTO v_total_students
    FROM students WHERE institution_id = p_institution_id;

    -- Staff count
    SELECT COUNT(*) INTO v_total_staff
    FROM staff WHERE institution_id = p_institution_id;

    -- Classes count
    SELECT COUNT(*) INTO v_total_classes
    FROM classes WHERE institution_id = p_institution_id;

    -- Attendance rate (last 30 days)
    SELECT COALESCE(
        ROUND(
            100.0 * COUNT(CASE WHEN a.status = 'present' THEN 1 END) /
            NULLIF(COUNT(*), 0),
            1
        ), 0
    ) INTO v_attendance_rate
    FROM attendance a
    WHERE a.institution_id = p_institution_id
      AND a.date >= CURRENT_DATE - INTERVAL '30 days';

    v_result := jsonb_build_object(
        'total_students', v_total_students,
        'total_staff', v_total_staff,
        'total_classes', v_total_classes,
        'attendance_rate_30d', v_attendance_rate,
        'institution_id', p_institution_id
    );

    RETURN v_result;
END;
$$;

-- ============================================================
-- 6. Stakeholder management RPCs
-- ============================================================

-- 6a. Link a stakeholder to an institution
CREATE OR REPLACE FUNCTION public.link_stakeholder(
    p_stakeholder_id UUID,
    p_institution_id TEXT,
    p_can_export BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
BEGIN
    -- Only admins and institution admins can link stakeholders
    SELECT role INTO v_actor_role FROM profiles WHERE id = v_actor_id;
    IF v_actor_role NOT IN ('admin', 'superadmin', 'institution') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient permissions');
    END IF;

    -- Verify target user is a stakeholder
    IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = p_stakeholder_id AND role = 'stakeholder') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target user is not a stakeholder');
    END IF;

    -- Insert or reactivate link
    INSERT INTO institution_stakeholder_links (user_id, institution_id, granted_by, can_export)
    VALUES (p_stakeholder_id, p_institution_id, v_actor_id, p_can_export)
    ON CONFLICT (user_id, institution_id) DO UPDATE SET
        revoked_at = NULL,
        granted_by = v_actor_id,
        can_export = p_can_export;

    -- Audit log
    INSERT INTO rbac_audit_log (actor_id, action, target_user_id, details)
    VALUES (v_actor_id, 'LINK_STAKEHOLDER', p_stakeholder_id,
        jsonb_build_object('institution_id', p_institution_id, 'can_export', p_can_export));

    RETURN jsonb_build_object('success', true, 'message', 'Stakeholder linked');
END;
$$;

-- 6b. Unlink (revoke) a stakeholder from an institution
CREATE OR REPLACE FUNCTION public.unlink_stakeholder(
    p_stakeholder_id UUID,
    p_institution_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role TEXT;
BEGIN
    SELECT role INTO v_actor_role FROM profiles WHERE id = v_actor_id;
    IF v_actor_role NOT IN ('admin', 'superadmin', 'institution') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient permissions');
    END IF;

    UPDATE institution_stakeholder_links
    SET revoked_at = NOW()
    WHERE user_id = p_stakeholder_id AND institution_id = p_institution_id;

    INSERT INTO rbac_audit_log (actor_id, action, target_user_id, details)
    VALUES (v_actor_id, 'UNLINK_STAKEHOLDER', p_stakeholder_id,
        jsonb_build_object('institution_id', p_institution_id));

    RETURN jsonb_build_object('success', true, 'message', 'Stakeholder unlinked');
END;
$$;
