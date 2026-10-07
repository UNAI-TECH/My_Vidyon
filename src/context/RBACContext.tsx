// ============================================================
// File: src/context/RBACContext.tsx
// Purpose: RBAC Context Provider & hook for client-side permission checks
// ============================================================

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Role, Action, ERPModule, RBACResource, PermissionCheckContext } from '../types/rbac';
import { can as rbacCan, normalizeRole } from '../lib/rbac';

export interface LinkedInstitution {
  id: string;
  institution_id: string;
  name: string;
  logo_url?: string | null;
  code?: string;
}

export interface RBACContextType {
  role: Role | string | null;
  permissions: Set<string>;
  can: (module: ERPModule, action: Action, resource?: RBACResource | null) => boolean;
  isStakeholder: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  linkedInstitutions: LinkedInstitution[];
  currentInstitutionId: string | null;
  currentInstitution: LinkedInstitution | null;
  setCurrentInstitutionId: (instId: string | null) => void;
  featureFlags: Record<string, boolean>;
  isFeatureEnabled: (flagKey: string) => boolean;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
}

const defaultContext: RBACContextType = {
  role: null,
  permissions: new Set(),
  can: () => false,
  isStakeholder: false,
  isSuperAdmin: false,
  isAdmin: false,
  linkedInstitutions: [],
  currentInstitutionId: null,
  currentInstitution: null,
  setCurrentInstitutionId: () => {},
  featureFlags: { transport_roles_enabled: false },
  isFeatureEnabled: () => false,
  loading: true,
  refreshPermissions: async () => {},
};

export const RBACContext = createContext<RBACContextType>(defaultContext);

export const RBACProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, role, institutionId, institutionUuid, institutionName } = useAuth();
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({
    transport_roles_enabled: false,
  });
  const [linkedInstitutions, setLinkedInstitutions] = useState<LinkedInstitution[]>([]);
  const [currentInstitutionId, setCurrentInstitutionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const normRole = useMemo(() => normalizeRole(role), [role]);
  const isStakeholder = normRole === 'institution_stakeholder';
  const isSuperAdmin = normRole === 'super_admin';
  const isAdmin = normRole === 'admin';

  // 1. Fetch feature flags (e.g. transport_roles_enabled)
  const fetchFeatureFlags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('key, is_enabled');

      if (!error && data) {
        const flags: Record<string, boolean> = {};
        data.forEach((row: any) => {
          flags[row.key] = Boolean(row.is_enabled);
        });
        setFeatureFlags(prev => ({ ...prev, ...flags }));
      }
    } catch (e) {
      // feature_flags table might not exist yet or offline; fallback to defaults
    }
  }, []);

  // 2. Fetch linked institutions for stakeholder
  const fetchStakeholderLinks = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('institution_stakeholder_links')
        .select(`
          institution_id,
          institutions:institution_id (
            id,
            institution_id,
            name,
            logo_url
          )
        `)
        .eq('user_id', userId);

      if (!error && data && data.length > 0) {
        const links: LinkedInstitution[] = data.map((item: any) => {
          const inst = item.institutions || {};
          return {
            id: inst.id || item.institution_id,
            institution_id: inst.institution_id || item.institution_id,
            name: inst.name || 'Institution',
            logo_url: inst.logo_url,
          };
        });
        setLinkedInstitutions(links);
        // Default to first institution or null (meaning all)
        if (links.length > 0 && !currentInstitutionId) {
          setCurrentInstitutionId(links[0].institution_id);
        }
      } else {
        // Fallback: use user profile institution
        if (institutionId) {
          const fallback = [{
            id: institutionUuid || institutionId,
            institution_id: institutionId,
            name: institutionName || 'Current Institution',
          }];
          setLinkedInstitutions(fallback);
          if (!currentInstitutionId) {
            setCurrentInstitutionId(institutionId);
          }
        }
      }
    } catch (e) {
      console.warn('[RBAC] Error loading stakeholder links:', e);
    }
  }, [institutionId, institutionUuid, institutionName, currentInstitutionId]);

  // 3. Fetch permissions from DB (via RPC get_user_permissions if available)
  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    try {
      // Call RPC get_user_permissions(user.id)
      const { data, error } = await (supabase.rpc as any)('get_user_permissions', {
        target_user_id: user.id,
      });

      if (!error && Array.isArray(data)) {
        const permSet = new Set<string>();
        (data as any[]).forEach((p: any) => {
          if (p.module && p.action) {
            permSet.add(`${p.module}:${p.action}`);
          }
        });
        setPermissions(permSet);
      }
    } catch (e) {
      // Fallback: rely on static BASELINE_ROLE_PERMISSIONS
      console.warn('[RBAC] Using baseline static permissions matrix');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await Promise.all([
        fetchFeatureFlags(),
        fetchPermissions(),
        user && isStakeholder ? fetchStakeholderLinks(user.id) : Promise.resolve(),
      ]);
      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [user, isStakeholder, fetchFeatureFlags, fetchPermissions, fetchStakeholderLinks]);

  // Permission check context
  const permissionContext: PermissionCheckContext = useMemo(() => {
    return {
      role,
      userId: user?.id || null,
      institutionId: currentInstitutionId || institutionId || null,
      linkedInstitutions: linkedInstitutions.map(l => l.institution_id),
      featureFlags,
      userPermissions: permissions,
    };
  }, [role, user, currentInstitutionId, institutionId, linkedInstitutions, featureFlags, permissions]);

  // can() function bound to current context
  const can = useCallback(
    (module: ERPModule, action: Action, resource?: RBACResource | null): boolean => {
      // If no explicit resource institution is provided, use the currently selected stakeholder institution
      const targetResource = resource || (currentInstitutionId ? { institution_id: currentInstitutionId } : null);
      return rbacCan(permissionContext, module, action, targetResource);
    },
    [permissionContext, currentInstitutionId]
  );

  const isFeatureEnabled = useCallback(
    (flagKey: string): boolean => {
      return Boolean(featureFlags[flagKey]);
    },
    [featureFlags]
  );

  const currentInstitution = useMemo(() => {
    if (!currentInstitutionId) return null;
    return linkedInstitutions.find(l => l.institution_id === currentInstitutionId || l.id === currentInstitutionId) || null;
  }, [linkedInstitutions, currentInstitutionId]);

  return (
    <RBACContext.Provider
      value={{
        role: role as Role,
        permissions,
        can,
        isStakeholder,
        isSuperAdmin,
        isAdmin,
        linkedInstitutions,
        currentInstitutionId,
        currentInstitution,
        setCurrentInstitutionId,
        featureFlags,
        isFeatureEnabled,
        loading,
        refreshPermissions: fetchPermissions,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
};

export const useRBAC = () => useContext(RBACContext);
