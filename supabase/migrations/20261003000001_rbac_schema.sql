-- ============================================================
-- Migration: RBAC Schema
-- Purpose: Extend user_role enum and create RBAC infrastructure tables
-- NON-DESTRUCTIVE: Only adds new enum values and new tables
-- ============================================================

-- ============================================================
-- 1. Enum Extensions (idempotent)
-- ============================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid WHERE typname = 'user_role' AND enumlabel = 'superadmin') THEN
        ALTER TYPE user_role ADD VALUE 'superadmin';
    END IF;
END$$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid WHERE typname = 'user_role' AND enumlabel = 'stakeholder') THEN
        ALTER TYPE user_role ADD VALUE 'stakeholder';
    END IF;
END$$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid WHERE typname = 'user_role' AND enumlabel = 'transport_manager') THEN
        ALTER TYPE user_role ADD VALUE 'transport_manager';
    END IF;
END$$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid WHERE typname = 'user_role' AND enumlabel = 'media') THEN
        ALTER TYPE user_role ADD VALUE 'media';
    END IF;
END$$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid WHERE typname = 'user_role' AND enumlabel = 'analytics') THEN
        ALTER TYPE user_role ADD VALUE 'analytics';
    END IF;
END$$;

-- ============================================================
-- 2. Permissions Table
-- Stores every module×action combination as a grantable permission
-- ============================================================

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'manage')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module, action)
);

COMMENT ON TABLE public.permissions IS 'Central permission registry: every module×action pair that can be granted to a role.';

-- ============================================================
-- 3. Role Permissions Table
-- Maps roles to their granted permissions with scope
-- ============================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role user_role NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    is_granted BOOLEAN NOT NULL DEFAULT true,
    -- scope: 'all' = full access, 'own' = own data, 'own_institution' = own institution, 'aggregated' = summaries only
    scope TEXT NOT NULL DEFAULT 'all' CHECK (scope IN ('all', 'own', 'own_institution', 'aggregated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

COMMENT ON TABLE public.role_permissions IS 'Grants a permission to a role. If no row exists for a role+permission, access is DENIED by default.';

-- ============================================================
-- 4. Institution Stakeholder Links
-- Maps stakeholder users to the institutions they can view
-- ============================================================

CREATE TABLE IF NOT EXISTS public.institution_stakeholder_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES public.institutions(institution_id) ON DELETE CASCADE,
    granted_by UUID REFERENCES public.profiles(id),
    can_export BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    UNIQUE(user_id, institution_id)
);

COMMENT ON TABLE public.institution_stakeholder_links IS 'Links a stakeholder user to one or more institutions. Only active links (revoked_at IS NULL) are valid.';

-- ============================================================
-- 5. Feature Flags
-- Global feature toggles for gating unreleased modules
-- ============================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flag_key TEXT UNIQUE NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.feature_flags IS 'Global feature flags to gate unreleased features (e.g., transport module).';

-- ============================================================
-- 6. RBAC Audit Log
-- Records all role assignment and permission changes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rbac_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    target_user_id UUID,
    target_role TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.rbac_audit_log IS 'Audit trail for RBAC changes: role assignments, permission grants, stakeholder link changes.';

-- ============================================================
-- 7. Enable RLS on all new tables
-- ============================================================

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_stakeholder_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. RLS Policies
-- ============================================================

-- permissions: readable by all authenticated users
DROP POLICY IF EXISTS "auth_read_permissions" ON public.permissions;
CREATE POLICY "auth_read_permissions" ON public.permissions
    FOR SELECT TO authenticated USING (true);

-- permissions: only platform admins can modify
DROP POLICY IF EXISTS "admin_manage_permissions" ON public.permissions;
CREATE POLICY "admin_manage_permissions" ON public.permissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

-- role_permissions: readable by all authenticated users
DROP POLICY IF EXISTS "auth_read_role_permissions" ON public.role_permissions;
CREATE POLICY "auth_read_role_permissions" ON public.role_permissions
    FOR SELECT TO authenticated USING (true);

-- role_permissions: only platform admins can modify
DROP POLICY IF EXISTS "admin_manage_role_permissions" ON public.role_permissions;
CREATE POLICY "admin_manage_role_permissions" ON public.role_permissions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

-- institution_stakeholder_links: stakeholders can read own links
DROP POLICY IF EXISTS "stakeholder_read_own_links" ON public.institution_stakeholder_links;
CREATE POLICY "stakeholder_read_own_links" ON public.institution_stakeholder_links
    FOR SELECT USING (user_id = auth.uid());

-- institution_stakeholder_links: admins + institution admins can manage
DROP POLICY IF EXISTS "admin_manage_stakeholder_links" ON public.institution_stakeholder_links;
CREATE POLICY "admin_manage_stakeholder_links" ON public.institution_stakeholder_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('admin', 'superadmin', 'institution')
        )
    );

-- feature_flags: readable by all authenticated
DROP POLICY IF EXISTS "auth_read_feature_flags" ON public.feature_flags;
CREATE POLICY "auth_read_feature_flags" ON public.feature_flags
    FOR SELECT TO authenticated USING (true);

-- feature_flags: only platform admins can modify
DROP POLICY IF EXISTS "admin_manage_feature_flags" ON public.feature_flags;
CREATE POLICY "admin_manage_feature_flags" ON public.feature_flags
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

-- rbac_audit_log: admins can read
DROP POLICY IF EXISTS "admin_read_audit_log" ON public.rbac_audit_log;
CREATE POLICY "admin_read_audit_log" ON public.rbac_audit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
    );

-- rbac_audit_log: any authenticated user can insert (for the logging trigger/function)
DROP POLICY IF EXISTS "auth_insert_audit_log" ON public.rbac_audit_log;
CREATE POLICY "auth_insert_audit_log" ON public.rbac_audit_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 9. Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_permissions_module_action ON public.permissions(module, action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON public.role_permissions(role, permission_id) WHERE is_granted = true;
CREATE INDEX IF NOT EXISTS idx_stakeholder_links_user ON public.institution_stakeholder_links(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stakeholder_links_institution ON public.institution_stakeholder_links(institution_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_actor ON public.rbac_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_log_created ON public.rbac_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.feature_flags(flag_key);

-- ============================================================
-- 10. Seed initial feature flags
-- ============================================================

INSERT INTO public.feature_flags (flag_key, enabled, description) VALUES
    ('transport_module_enabled', false, 'Gates the Transport module (transport_manager and driver roles). Enable when Prompt 16 is implemented.'),
    ('stakeholder_export_enabled', false, 'Global fallback: if true, all stakeholders can export. Per-stakeholder override is in institution_stakeholder_links.can_export.')
ON CONFLICT (flag_key) DO NOTHING;
