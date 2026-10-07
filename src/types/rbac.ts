// ============================================================
// File: src/types/rbac.ts
// Purpose: Core TypeScript types and definitions for central RBAC
// ============================================================

export type Role =
  | 'super_admin'
  | 'superadmin'
  | 'admin'
  | 'institution'
  | 'institution_stakeholder'
  | 'faculty'
  | 'admission_officer'
  | 'admissions'
  | 'reports_manager'
  | 'ad_manager'
  | 'finance_manager'
  | 'student'
  | 'parent'
  | 'accountant'
  | 'finance'
  | 'canteen'
  | 'canteen_manager'
  | 'media'
  | 'analytics'
  | 'transport_manager'
  | 'driver';

export type Action =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'export'
  | 'manage';

export type ERPModule =
  | 'analytics'
  | 'attendance'
  | 'announcements'
  | 'assignments'
  | 'audit_logs'
  | 'calendar'
  | 'canteen'
  | 'classes'
  | 'documents'
  | 'enrollment'
  | 'events'
  | 'exams'
  | 'faculty'
  | 'fee_structure'
  | 'fees'
  | 'grades'
  | 'guardians'
  | 'health'
  | 'homework'
  | 'hostel'
  | 'institution_management'
  | 'institutions'
  | 'inventory'
  | 'leaves'
  | 'library'
  | 'notifications'
  | 'parents'
  | 'reports'
  | 'roles_permissions'
  | 'staff'
  | 'students'
  | 'timetable'
  | 'transport'
  // Prompts 6-18 ERP Modules
  | 'admissions'
  | 'promotions'
  | 'syllabus'
  | 'substitutes'
  | 'fee_payments'
  | 'concessions'
  | 'advertisements'
  | 'ad_finance'
  | 'ad_analytics'
  | 'finance'
  | 'payroll'
  | 'payroll_components'
  | 'transport_tracking'
  | 'transport_config';

export interface RBACResource {
  institution_id?: string | null;
  owner_id?: string | null;
  target_user_id?: string | null;
  [key: string]: any;
}

export interface PermissionCheckContext {
  role?: Role | string | null;
  userId?: string | null;
  institutionId?: string | null;
  linkedInstitutions?: string[];
  featureFlags?: Record<string, boolean>;
  userPermissions?: Set<string> | string[];
}

export interface InstitutionStakeholderLink {
  id: string;
  user_id: string;
  institution_id: string;
  institution_uuid?: string;
  institution_name?: string;
  institution_code?: string;
  created_at: string;
}

export interface StakeholderSummaryMetrics {
  totalStudents: number;
  totalFaculty: number;
  attendanceRate: number;
  totalFeeExpected: number;
  totalFeeCollected: number;
  totalFeePending: number;
  collectionRate: number;
  averageGrade: string;
  passPercentage: number;
}

export interface StakeholderInstitutionSummary {
  institution_id: string;
  institution_name: string;
  student_count: number;
  staff_count: number;
  attendance_percentage: number;
  fee_collection_rate: number;
  total_revenue_collected: number;
}
