-- ============================================================
-- Migration: RBAC Seed Data
-- Purpose: Populate permissions and role_permissions tables
--          to match the approved permission matrix exactly.
--
-- Strategy:
--   1. Insert all 33 modules × 8 actions = 264 permissions
--   2. Grant 'manage' for roles with full module control
--   3. Grant specific actions for roles with partial access
--   'manage' implies ALL actions in has_permission()
-- ============================================================

-- ============================================================
-- 1. Seed ALL module×action combinations
-- ============================================================

WITH modules(m) AS (
    VALUES
        ('dashboard'), ('institutions'), ('students'), ('staff'),
        ('departments'), ('classes'), ('subjects'), ('timetable'),
        ('exams'), ('attendance'), ('assignments'), ('leaves'),
        ('events'), ('communication'), ('fees'), ('reports'),
        ('analytics'), ('settings'), ('canteen'), ('transport'),
        ('materials'), ('certificates'), ('org'), ('rbac'),
        ('audit_logs'), ('ads'), ('ads_finance'), ('ads_media'),
        ('ads_analytics'), ('onboarding'), ('promotions'), ('revenue'),
        ('stakeholder_links')
),
actions(a) AS (
    VALUES
        ('view'), ('create'), ('edit'), ('delete'),
        ('approve'), ('reject'), ('export'), ('manage')
)
INSERT INTO permissions (module, action)
SELECT m, a FROM modules CROSS JOIN actions
ON CONFLICT (module, action) DO NOTHING;

-- ============================================================
-- 2. SUPER ADMIN (admin) — manage on ALL modules
-- ============================================================

INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'admin', p.id, true, 'all'
FROM permissions p
WHERE p.action = 'manage'
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 3. SUPER ADMIN (superadmin) — same as admin
-- ============================================================

INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'superadmin', p.id, true, 'all'
FROM permissions p
WHERE p.action = 'manage'
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 4. INSTITUTION ADMIN (institution)
-- Full control within own institution for most modules
-- ============================================================

-- manage on institution-level modules
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'institution', p.id, true, 'own_institution'
FROM permissions p
WHERE p.action = 'manage'
  AND p.module IN (
    'dashboard', 'students', 'staff', 'departments', 'classes', 'subjects',
    'timetable', 'exams', 'attendance', 'assignments', 'leaves', 'events',
    'communication', 'fees', 'reports', 'analytics', 'settings', 'canteen',
    'materials', 'certificates', 'org', 'promotions', 'stakeholder_links'
  )
ON CONFLICT (role, permission_id) DO NOTHING;

-- transport: manage but feature-flagged (the has_permission function handles the flag check)
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'institution', p.id, true, 'own_institution'
FROM permissions p
WHERE p.action = 'manage' AND p.module = 'transport'
ON CONFLICT (role, permission_id) DO NOTHING;

-- institutions: view + edit own only
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'institution', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'institutions' AND p.action IN ('view', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- revenue: view + export
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'institution', p.id, true, 'own_institution'
FROM permissions p
WHERE p.module = 'revenue' AND p.action IN ('view', 'export')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 5. INSTITUTION STAKEHOLDER (stakeholder)
-- View-only on aggregated data for linked institutions
-- ============================================================

-- dashboard, fees, analytics, revenue: view only (aggregated)
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'stakeholder', p.id, true, 'aggregated'
FROM permissions p
WHERE p.action = 'view'
  AND p.module IN ('dashboard', 'fees', 'analytics', 'revenue')
ON CONFLICT (role, permission_id) DO NOTHING;

-- settings: view + edit own profile only
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'stakeholder', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'settings' AND p.action IN ('view', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 6. FACULTY (faculty)
-- ============================================================

-- dashboard: view
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'faculty', p.id, true, 'own_institution'
FROM permissions p
WHERE p.module = 'dashboard' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- students: view own classes
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'faculty', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'students' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- timetable: view own
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'faculty', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'timetable' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- exams: view + create + edit
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'faculty', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'exams' AND p.action IN ('view', 'create', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- attendance: view + create + edit
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'faculty', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'attendance' AND p.action IN ('view', 'create', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- assignments: view + create + edit + delete
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'faculty', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'assignments' AND p.action IN ('view', 'create', 'edit', 'delete')
ON CONFLICT (role, permission_id) DO NOTHING;

-- leaves: view + create + approve + reject
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'faculty', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'leaves' AND p.action IN ('view', 'create', 'approve', 'reject')
ON CONFLICT (role, permission_id) DO NOTHING;

-- communication: view
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'faculty', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'communication' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- materials: view + create + edit + delete
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'faculty', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'materials' AND p.action IN ('view', 'create', 'edit', 'delete')
ON CONFLICT (role, permission_id) DO NOTHING;

-- certificates: view + create + edit + delete
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'faculty', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'certificates' AND p.action IN ('view', 'create', 'edit', 'delete')
ON CONFLICT (role, permission_id) DO NOTHING;

-- courses: view + create + edit + delete
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'faculty', p.id, true, 'own'
FROM permissions p
WHERE p.module IN ('courses') AND p.action IN ('view', 'create', 'edit', 'delete')
ON CONFLICT (role, permission_id) DO NOTHING;

-- settings: view + edit own
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'faculty', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'settings' AND p.action IN ('view', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 7. STUDENT (student)
-- ============================================================

-- dashboard: view
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'student', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'dashboard' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- view-only modules
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'student', p.id, true, 'own'
FROM permissions p
WHERE p.action = 'view'
  AND p.module IN ('timetable', 'exams', 'attendance', 'events', 'fees', 'materials', 'certificates', 'courses', 'communication')
ON CONFLICT (role, permission_id) DO NOTHING;

-- assignments: view + create (submit) + edit
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'student', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'assignments' AND p.action IN ('view', 'create', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- leaves: view + create
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'student', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'leaves' AND p.action IN ('view', 'create')
ON CONFLICT (role, permission_id) DO NOTHING;

-- settings: view + edit own
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'student', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'settings' AND p.action IN ('view', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 8. PARENT (parent)
-- ============================================================

-- dashboard: view
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'parent', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'dashboard' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- view-only modules (child-scoped)
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'parent', p.id, true, 'own'
FROM permissions p
WHERE p.action = 'view'
  AND p.module IN ('attendance', 'exams', 'communication')
ON CONFLICT (role, permission_id) DO NOTHING;

-- fees: view + create (pay)
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'parent', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'fees' AND p.action IN ('view', 'create')
ON CONFLICT (role, permission_id) DO NOTHING;

-- leaves: view + create
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'parent', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'leaves' AND p.action IN ('view', 'create')
ON CONFLICT (role, permission_id) DO NOTHING;

-- settings: view + edit own
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'parent', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'settings' AND p.action IN ('view', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 9. ACCOUNTANT (accountant)
-- ============================================================

-- dashboard: view
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'accountant', p.id, true, 'own_institution'
FROM permissions p
WHERE p.module = 'dashboard' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- fees: full manage
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'accountant', p.id, true, 'own_institution'
FROM permissions p
WHERE p.module = 'fees' AND p.action = 'manage'
ON CONFLICT (role, permission_id) DO NOTHING;

-- reports: view + create + export
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'accountant', p.id, true, 'own_institution'
FROM permissions p
WHERE p.module = 'reports' AND p.action IN ('view', 'create', 'export')
ON CONFLICT (role, permission_id) DO NOTHING;

-- revenue: view + export
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'accountant', p.id, true, 'own_institution'
FROM permissions p
WHERE p.module = 'revenue' AND p.action IN ('view', 'export')
ON CONFLICT (role, permission_id) DO NOTHING;

-- students: view (for fee assignment, no PII)
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'accountant', p.id, true, 'own_institution'
FROM permissions p
WHERE p.module = 'students' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- settings: view + edit own
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'accountant', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'settings' AND p.action IN ('view', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 10. CANTEEN MANAGER (canteen_manager)
-- ============================================================

-- dashboard: view
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'canteen_manager', p.id, true, 'own_institution'
FROM permissions p
WHERE p.module = 'dashboard' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- canteen: full manage
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'canteen_manager', p.id, true, 'own_institution'
FROM permissions p
WHERE p.module = 'canteen' AND p.action = 'manage'
ON CONFLICT (role, permission_id) DO NOTHING;

-- settings: view + edit own
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'canteen_manager', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'settings' AND p.action IN ('view', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 11. DRIVER (driver) — feature-flagged
-- ============================================================

-- dashboard: view
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'driver', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'dashboard' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- transport: view + edit own
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'driver', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'transport' AND p.action IN ('view', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- settings: view + edit own
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'driver', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'settings' AND p.action IN ('view', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 12. TRANSPORT MANAGER (transport_manager) — feature-flagged
-- ============================================================

-- dashboard: view
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'transport_manager', p.id, true, 'own_institution'
FROM permissions p
WHERE p.module = 'dashboard' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- transport: full manage
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'transport_manager', p.id, true, 'own_institution'
FROM permissions p
WHERE p.module = 'transport' AND p.action = 'manage'
ON CONFLICT (role, permission_id) DO NOTHING;

-- settings: view + edit own
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'transport_manager', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'settings' AND p.action IN ('view', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 13. AD STAKEHOLDER — MEDIA (media)
-- ============================================================

-- dashboard: view
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'media', p.id, true, 'all'
FROM permissions p
WHERE p.module = 'dashboard' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- ads_media: view + create + edit + delete + export
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'media', p.id, true, 'all'
FROM permissions p
WHERE p.module = 'ads_media' AND p.action IN ('view', 'create', 'edit', 'delete', 'export')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ads_analytics: view only
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'media', p.id, true, 'all'
FROM permissions p
WHERE p.module = 'ads_analytics' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- settings: view + edit own
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'media', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'settings' AND p.action IN ('view', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================
-- 14. AD STAKEHOLDER — ANALYTICS (analytics)
-- ============================================================

-- dashboard: view
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'analytics', p.id, true, 'all'
FROM permissions p
WHERE p.module = 'dashboard' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- ads_analytics: view + export
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'analytics', p.id, true, 'all'
FROM permissions p
WHERE p.module = 'ads_analytics' AND p.action IN ('view', 'export')
ON CONFLICT (role, permission_id) DO NOTHING;

-- ads_finance: view only
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'analytics', p.id, true, 'all'
FROM permissions p
WHERE p.module = 'ads_finance' AND p.action = 'view'
ON CONFLICT (role, permission_id) DO NOTHING;

-- settings: view + edit own
INSERT INTO role_permissions (role, permission_id, is_granted, scope)
SELECT 'analytics', p.id, true, 'own'
FROM permissions p
WHERE p.module = 'settings' AND p.action IN ('view', 'edit')
ON CONFLICT (role, permission_id) DO NOTHING;
