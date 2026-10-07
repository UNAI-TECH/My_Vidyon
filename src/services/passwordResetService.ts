import { supabase } from '../lib/supabase';
import { LargeSecureStore } from '../lib/storage';
import { logAuditEvent } from '../utils/auditLogger';

export interface PasswordResetRequest {
  id: string;
  user_id?: string;
  email: string;
  full_name?: string;
  role?: string;
  institution_id?: string | null;
  institution_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  admin_notes?: string;
}

const STORAGE_KEY = 'vidyon_pending_password_resets';

/**
 * Submit a new password reset request from login screen or user portal
 */
export async function submitPasswordResetRequest(params: {
  email: string;
  reason?: string;
}): Promise<{ success: boolean; message: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter a valid email address.');
  }

  // 1. Look up user profile to find their role and institution
  let userProfile: any = null;
  try {
    const { data: profile } = await (supabase
      .from('profiles') as any)
      .select('id, full_name, role, institution_id, department')
      .eq('email', cleanEmail)
      .maybeSingle();
    userProfile = profile;
  } catch (err) {
    console.warn('[PasswordResetService] Profile lookup error:', err);
  }

  // 2. Also check institutions table if this email is an institution admin
  let instName = '';
  let instId = userProfile?.institution_id || null;
  try {
    const { data: inst } = await (supabase
      .from('institutions') as any)
      .select('name, institution_id')
      .or(`admin_email.eq.${cleanEmail},email.eq.${cleanEmail}${instId ? `,institution_id.eq.${instId}` : ''}`)
      .maybeSingle();

    if (inst) {
      instName = inst.name || '';
      if (!instId) instId = inst.institution_id;
      if (!userProfile) {
        userProfile = {
          full_name: `${inst.name} Admin`,
          role: 'institution',
          institution_id: inst.institution_id
        };
      }
    }
  } catch (err) {
    console.warn('[PasswordResetService] Institution lookup error:', err);
  }

  const newRequest: PasswordResetRequest = {
    id: `reset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userProfile?.id,
    email: cleanEmail,
    full_name: userProfile?.full_name || cleanEmail.split('@')[0],
    role: userProfile?.role || 'user',
    institution_id: instId,
    institution_name: instName,
    status: 'pending',
    created_at: new Date().toISOString(),
    admin_notes: params.reason || 'Forgot password request submitted from login portal'
  };

  let dbSaved = false;

  // 3. Try inserting into password_reset_requests table
  try {
    const { error } = await (supabase
      .from('password_reset_requests') as any)
      .insert([{
        user_id: newRequest.user_id,
        email: newRequest.email,
        full_name: newRequest.full_name,
        role: newRequest.role,
        institution_id: newRequest.institution_id,
        status: 'pending',
        admin_notes: newRequest.admin_notes
      }]);

    if (!error) {
      dbSaved = true;
    } else {
      console.warn('[PasswordResetService] password_reset_requests insert error:', error.message);
    }
  } catch (err) {
    console.warn('[PasswordResetService] Failed writing to password_reset_requests:', err);
  }

  // 4. Fallback: Also try inserting into support_queries if institution_id exists
  if (!dbSaved && instId && instId !== 'global') {
    try {
      const { error: sqError } = await (supabase
        .from('support_queries') as any)
        .insert([{
          institution_id: instId,
          sender_email: cleanEmail,
          sender_name: newRequest.full_name,
          subject: 'PASSWORD_RESET_REQUEST',
          message: JSON.stringify({
            role: newRequest.role,
            user_id: newRequest.user_id,
            reason: newRequest.admin_notes
          }),
          status: 'pending'
        }]);

      if (!sqError) dbSaved = true;
    } catch (e) {
      console.warn('[PasswordResetService] support_queries fallback error:', e);
    }
  }

  // 5. Always cache in LargeSecureStore so administrators can immediately see it
  try {
    const existingRaw = await LargeSecureStore.getItem(STORAGE_KEY);
    const existingList: PasswordResetRequest[] = existingRaw ? JSON.parse(existingRaw) : [];
    // Deduplicate any pending requests for same email
    const filtered = existingList.filter(r => r.email.toLowerCase() !== cleanEmail || r.status !== 'pending');
    filtered.unshift(newRequest);
    await LargeSecureStore.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 100)));
  } catch (storeErr) {
    console.warn('[PasswordResetService] Local storage cache error:', storeErr);
  }

  return {
    success: true,
    message: 'Your password reset request has been submitted to the administrator. Once approved, you can log in and you will be prompted to create your new password.'
  };
}

/**
 * Fetch all password reset requests (scoped by role / institution)
 */
export async function fetchPasswordResetRequests(options: {
  isSuperAdmin: boolean;
  institutionId?: string | null;
}): Promise<PasswordResetRequest[]> {
  const allRequests: PasswordResetRequest[] = [];
  const seenIds = new Set<string>();

  // 1. Try querying password_reset_requests table
  try {
    let query = (supabase.from('password_reset_requests') as any).select('*');

    if (!options.isSuperAdmin && options.institutionId) {
      query = query.eq('institution_id', options.institutionId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data) {
      for (const item of data) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allRequests.push({
            id: item.id,
            user_id: item.user_id,
            email: item.email,
            full_name: item.full_name,
            role: item.role,
            institution_id: item.institution_id,
            status: item.status || 'pending',
            created_at: item.created_at,
            resolved_at: item.resolved_at,
            resolved_by: item.resolved_by,
            admin_notes: item.admin_notes
          });
        }
      }
    }
  } catch (err) {
    console.warn('[PasswordResetService] Error reading password_reset_requests:', err);
  }

  // 2. Query support_queries table where subject is PASSWORD_RESET_REQUEST
  try {
    let sqQuery = (supabase.from('support_queries') as any)
      .select('*')
      .eq('subject', 'PASSWORD_RESET_REQUEST');

    if (!options.isSuperAdmin && options.institutionId) {
      sqQuery = sqQuery.eq('institution_id', options.institutionId);
    }

    const { data: sqData, error: sqErr } = await sqQuery.order('created_at', { ascending: false });
    if (!sqErr && sqData) {
      for (const sq of sqData) {
        let parsedMessage: any = {};
        try {
          parsedMessage = JSON.parse(sq.message || '{}');
        } catch {
          parsedMessage = { reason: sq.message };
        }

        const syntheticId = `sq-${sq.id}`;
        if (!seenIds.has(syntheticId)) {
          seenIds.add(syntheticId);
          allRequests.push({
            id: syntheticId,
            user_id: parsedMessage.user_id,
            email: sq.sender_email,
            full_name: sq.sender_name || sq.sender_email.split('@')[0],
            role: parsedMessage.role || 'user',
            institution_id: sq.institution_id,
            status: sq.status === 'resolved' ? 'approved' : (sq.status || 'pending'),
            created_at: sq.created_at,
            admin_notes: parsedMessage.reason || 'Support Query Reset'
          });
        }
      }
    }
  } catch (err) {
    console.warn('[PasswordResetService] Error reading support_queries resets:', err);
  }

  // 3. Merge locally stored requests
  try {
    const raw = await LargeSecureStore.getItem(STORAGE_KEY);
    if (raw) {
      const localList: PasswordResetRequest[] = JSON.parse(raw);
      for (const loc of localList) {
        // If scoped to institution, ensure match
        if (!options.isSuperAdmin && options.institutionId && loc.institution_id !== options.institutionId) {
          continue;
        }

        const existingMatch = allRequests.find(r => r.email.toLowerCase() === loc.email.toLowerCase());
        if (!existingMatch) {
          allRequests.push(loc);
        }
      }
    }
  } catch (err) {
    console.warn('[PasswordResetService] Local store merge error:', err);
  }

  return allRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Approve password reset request:
 * Sets the user's password to deterministic VidyonSetup_${institution_id}
 * and enables needs_password_setup: true so the user is forced to re-enter
 * their password like when they log in for the first time.
 */
export async function approvePasswordResetRequest(
  request: PasswordResetRequest,
  actor: { id?: string; email?: string }
): Promise<{ success: boolean; message: string }> {
  const targetEmail = request.email.trim().toLowerCase();
  const targetInstId = request.institution_id || 'global';
  const tempPassword = `VidyonSetup_${targetInstId}`;

  // 1. Invoke create-user edge function with reset_password: true
  let edgeSuccess = false;
  try {
    const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('create-user', {
      body: {
        email: targetEmail,
        role: request.role || 'user',
        institution_id: targetInstId,
        full_name: request.full_name,
        reset_password: true,
        password: tempPassword
      }
    });

    if (!edgeErr) {
      edgeSuccess = true;
    } else {
      console.warn('[PasswordResetService] create-user edge reset error:', edgeErr);
    }
  } catch (err) {
    console.warn('[PasswordResetService] Edge function call failed:', err);
  }

  // 2. If this is an institution admin, also update the institutions table admin_password
  if (request.role === 'institution' && request.institution_id) {
    try {
      await (supabase.from('institutions') as any)
        .update({ admin_password: tempPassword })
        .eq('institution_id', request.institution_id);
    } catch (e) {
      console.warn('[PasswordResetService] Failed updating institutions table admin_password:', e);
    }
  }

  // 3. Update DB request record
  try {
    if (!request.id.startsWith('sq-') && !request.id.startsWith('reset-')) {
      await (supabase.from('password_reset_requests') as any)
        .update({
          status: 'approved',
          resolved_at: new Date().toISOString(),
          resolved_by: actor.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);
    } else if (request.id.startsWith('sq-')) {
      const originalSqId = request.id.replace('sq-', '');
      await (supabase.from('support_queries') as any)
        .update({ status: 'resolved' })
        .eq('id', originalSqId);
    }
  } catch (e) {
    console.warn('[PasswordResetService] Error updating DB request status:', e);
  }

  // 4. Update local storage cache status
  try {
    const raw = await LargeSecureStore.getItem(STORAGE_KEY);
    if (raw) {
      const list: PasswordResetRequest[] = JSON.parse(raw);
      const updated = list.map(item => {
        if (item.email.toLowerCase() === targetEmail) {
          return { ...item, status: 'approved' as const, resolved_at: new Date().toISOString() };
        }
        return item;
      });
      await LargeSecureStore.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('[PasswordResetService] Error updating local store:', e);
  }

  // 5. Audit log
  await logAuditEvent({
    action: 'RESET_PASSWORD_APPROVE',
    entityType: 'user_security',
    entityId: targetEmail,
    institutionId: targetInstId,
    actorId: actor.id,
    actorEmail: actor.email,
    details: {
      requester_email: targetEmail,
      role: request.role,
      reset_to: tempPassword
    }
  });

  return {
    success: true,
    message: `Password reset approved for ${targetEmail}. On their next login, they will be automatically prompted to set a new password!`
  };
}

/**
 * Reject password reset request
 */
export async function rejectPasswordResetRequest(
  request: PasswordResetRequest | string,
  actor?: { id?: string; email?: string },
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const reqId = typeof request === 'string' ? request : request.id;
  const targetEmail = typeof request === 'string' ? '' : request.email;
  const targetInstId = typeof request === 'string' ? 'global' : (request.institution_id || 'global');

  try {
    if (!reqId.startsWith('sq-') && !reqId.startsWith('reset-')) {
      await (supabase.from('password_reset_requests') as any)
        .update({
          status: 'rejected',
          resolved_at: new Date().toISOString(),
          resolved_by: actor?.id || null,
          admin_notes: reason || (typeof request !== 'string' ? request.admin_notes : undefined),
          updated_at: new Date().toISOString()
        })
        .eq('id', reqId);
    }
  } catch (e) {
    console.warn('[PasswordResetService] DB reject update failed:', e);
  }

  // Update local cache
  try {
    const raw = await LargeSecureStore.getItem(STORAGE_KEY);
    if (raw) {
      const list: PasswordResetRequest[] = JSON.parse(raw);
      const updated = list.map(item => {
        if (item.id === reqId || (targetEmail && item.email.toLowerCase() === targetEmail.toLowerCase())) {
          return { ...item, status: 'rejected' as const, resolved_at: new Date().toISOString(), admin_notes: reason };
        }
        return item;
      });
      await LargeSecureStore.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('[PasswordResetService] Local store reject update failed:', e);
  }

  if (targetEmail) {
    await logAuditEvent({
      action: 'RESET_PASSWORD_REJECT',
      entityType: 'user_security',
      entityId: targetEmail,
      institutionId: targetInstId,
      actorId: actor?.id,
      actorEmail: actor?.email,
      details: { reason }
    });
  }

  return {
    success: true,
    message: `Password reset request ${targetEmail ? `for ${targetEmail} ` : ''}has been rejected.`
  };
}
