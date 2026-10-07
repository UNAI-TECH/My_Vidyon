import { supabase } from '../lib/supabase';

export interface AuditEventPayload {
  action: string;
  entityType: string;
  entityId?: string | null;
  institutionId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  details?: Record<string, any> | null;
  oldData?: Record<string, any> | null;
}

/**
 * Universal Audit Logging Helper
 * Persists user and system activities to `institution_audit_logs`
 */
export async function logAuditEvent(payload: AuditEventPayload): Promise<boolean> {
  try {
    const {
      action,
      entityType,
      entityId = null,
      institutionId = 'global',
      actorId = null,
      actorEmail = null,
      details = null,
      oldData = null,
    } = payload;

    // 1. Try secure RPC function log_audit
    try {
      const { data: rpcRes, error: rpcError } = await (supabase.rpc as any)('log_audit', {
        p_action: action.toUpperCase(),
        p_entity_type: entityType.toLowerCase(),
        p_entity_id: entityId ? String(entityId) : null,
        p_institution_id: institutionId || 'global',
        p_old_data: oldData || null,
        p_new_data: details || null,
      });

      if (!rpcError && rpcRes) {
        return true;
      }
    } catch (rpcErr) {
      // RPC might not exist or failed, fallback to table insert below
    }

    // 2. Direct insert to institution_audit_logs
    const { error } = await (supabase.from('institution_audit_logs') as any).insert({
      action: action.toUpperCase(),
      entity_type: entityType.toLowerCase(),
      entity_id: entityId ? String(entityId) : null,
      institution_id: institutionId || 'global',
      actor_id: actorId || null,
      actor_email: actorEmail || null,
      old_data: oldData || null,
      new_data: details || null,
    });

    if (error) {
      console.warn('[Audit Log Insert Warning]:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Audit Log Failed Exception]:', err?.message || err);
    return false;
  }
}
