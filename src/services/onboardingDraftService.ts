// ============================================================
// File: src/services/onboardingDraftService.ts
// Purpose: Multi-draft dual-layer persistence (Supabase PostgreSQL + LargeSecureStore)
//          for in-progress institution onboarding drafts.
// ============================================================

import { LargeSecureStore } from '../lib/storage';
import { supabase } from '../lib/supabase';

const ONBOARDING_ACTIVE_DRAFT_KEY = '@myvidyon_onboarding_draft';

export interface OnboardingDraft {
  id?: string;
  institutionName: string;
  institutionCode?: string;
  institutionCategory: string;
  step: number;
  updatedAt: string;
  basicInfo: any;
  adminInfo: any;
  structure: any[];
  departments: any[];
  institutionalSubjects: any[];
  subjects: any[];
  selectedTimetableTemplateKey: string;
  periodsPerDay: number;
  periodDuration: number;
  dayStartTime: string;
  timetableDays: string[];
  selectedCatalogId: string | null;
  isCustomInstitution: boolean;
  logo: string | null;
  allowedRoles?: { canteen: boolean; finance: boolean; transport: boolean };
}

/**
 * Filter out invalid/expired temporary browser blob URLs
 */
function sanitizeDraft(draft: OnboardingDraft): OnboardingDraft {
  if (draft.logo && draft.logo.startsWith('blob:')) {
    // Browser blob URLs expire across reloads/sessions; do not keep dead blob URLs
    return { ...draft, logo: null };
  }
  return draft;
}

/**
 * Generate client-side UUID fallback
 */
function generateDraftId(): string {
  return 'draft_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * List all saved onboarding drafts from Supabase DB and local cache
 */
export async function listOnboardingDrafts(): Promise<OnboardingDraft[]> {
  const draftsMap = new Map<string, OnboardingDraft>();

  // 1. Fetch from Supabase DB if user is authenticated
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: cloudDrafts, error } = await (supabase as any)
        .from('onboarding_drafts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (!error && cloudDrafts && cloudDrafts.length > 0) {
        for (const row of cloudDrafts) {
          const parsed = row.draft_data as OnboardingDraft;
          if (parsed) {
            const sanitized = sanitizeDraft({
              ...parsed,
              id: row.id,
              institutionName: row.institution_name || parsed.institutionName || 'Untitled Institution',
              institutionCode: row.institution_code || parsed.institutionCode || '',
              institutionCategory: row.institution_category || parsed.institutionCategory || 'school',
              step: row.step || parsed.step || 1,
              logo: row.logo_url || parsed.logo || null,
              updatedAt: row.updated_at || parsed.updatedAt || new Date().toISOString(),
            });
            draftsMap.set(row.id, sanitized);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[DraftService] Error listing cloud drafts:', err);
  }

  // 2. Read local active draft from LargeSecureStore
  try {
    const raw = await LargeSecureStore.getItem(ONBOARDING_ACTIVE_DRAFT_KEY);
    if (raw) {
      const local = JSON.parse(raw) as OnboardingDraft;
      if (
        local &&
        (local.basicInfo?.name ||
          local.selectedCatalogId ||
          local.step > 1 ||
          local.basicInfo?.pincode)
      ) {
        const localId = local.id || 'local_active';
        // If not already in cloud map or if local is newer, add/update
        if (!draftsMap.has(localId)) {
          draftsMap.set(localId, sanitizeDraft(local));
        } else {
          const cloudDraft = draftsMap.get(localId)!;
          if (new Date(local.updatedAt || 0).getTime() > new Date(cloudDraft.updatedAt || 0).getTime()) {
            draftsMap.set(localId, sanitizeDraft({ ...local, id: localId }));
          }
        }
      }
    }
  } catch (err) {
    console.warn('[DraftService] Error reading local draft in list:', err);
  }

  const list = Array.from(draftsMap.values());
  // Sort most recently updated first
  list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  return list;
}

/**
 * Retrieve saved onboarding draft (either a specific draft by ID, or the most recent)
 */
export async function getOnboardingDraft(draftId?: string): Promise<OnboardingDraft | null> {
  const drafts = await listOnboardingDrafts();
  if (drafts.length === 0) return null;

  if (draftId) {
    const found = drafts.find(d => d.id === draftId);
    if (found) return found;
  }

  // Check if there is an active draft key saved locally
  try {
    const raw = await LargeSecureStore.getItem(ONBOARDING_ACTIVE_DRAFT_KEY);
    if (raw) {
      const local = JSON.parse(raw) as OnboardingDraft;
      if (local?.id) {
        const matching = drafts.find(d => d.id === local.id);
        if (matching) return matching;
      }
    }
  } catch (err) {
    console.warn('[DraftService] Error reading local active draft:', err);
  }

  // Return the most recently updated draft
  return drafts[0] || null;
}

/**
 * Save draft state to both local storage (LargeSecureStore) and Supabase database (public.onboarding_drafts)
 */
export async function saveOnboardingDraft(draft: Partial<OnboardingDraft>): Promise<string | null> {
  try {
    const targetId = draft.id;
    let existing: OnboardingDraft | null = null;
    if (targetId) {
      existing = await getOnboardingDraft(targetId);
    } else {
      existing = await getOnboardingDraft();
    }

    const assignedId = draft.id || existing?.id || generateDraftId();

    const merged: OnboardingDraft = {
      id: assignedId,
      institutionName:
        draft.basicInfo?.name ||
        draft.institutionName ||
        existing?.institutionName ||
        'Untitled Institution',
      institutionCode:
        draft.basicInfo?.school_code ||
        draft.institutionCode ||
        existing?.institutionCode ||
        '',
      institutionCategory:
        draft.basicInfo?.institution_category ||
        draft.institutionCategory ||
        existing?.institutionCategory ||
        'school',
      step: draft.step ?? existing?.step ?? 1,
      updatedAt: new Date().toISOString(),
      basicInfo: draft.basicInfo ?? existing?.basicInfo ?? {},
      adminInfo: draft.adminInfo ?? existing?.adminInfo ?? { email: '', password: '' },
      structure: draft.structure ?? existing?.structure ?? [],
      departments: draft.departments ?? existing?.departments ?? [],
      institutionalSubjects: draft.institutionalSubjects ?? existing?.institutionalSubjects ?? [],
      subjects: draft.subjects ?? existing?.subjects ?? [],
      selectedTimetableTemplateKey:
        draft.selectedTimetableTemplateKey ?? existing?.selectedTimetableTemplateKey ?? '',
      periodsPerDay: draft.periodsPerDay ?? existing?.periodsPerDay ?? 8,
      periodDuration: draft.periodDuration ?? existing?.periodDuration ?? 45,
      dayStartTime: draft.dayStartTime ?? existing?.dayStartTime ?? '08:30',
      timetableDays:
        draft.timetableDays ?? existing?.timetableDays ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      selectedCatalogId:
        draft.selectedCatalogId !== undefined ? draft.selectedCatalogId : existing?.selectedCatalogId ?? null,
      isCustomInstitution:
        draft.isCustomInstitution !== undefined ? draft.isCustomInstitution : existing?.isCustomInstitution ?? false,
      logo: draft.logo !== undefined ? draft.logo : existing?.logo ?? null,
      allowedRoles:
        draft.allowedRoles ?? existing?.allowedRoles ?? { canteen: true, finance: true, transport: true },
    };

    const hasMeaningfulData =
      Boolean(merged.basicInfo?.name?.trim()) ||
      Boolean(merged.basicInfo?.school_code?.trim()) ||
      Boolean(merged.basicInfo?.pincode?.trim()) ||
      Boolean(merged.basicInfo?.address_line_1?.trim()) ||
      Boolean(merged.selectedCatalogId) ||
      merged.step > 1;

    if (!hasMeaningfulData) {
      return null;
    }

    const sanitized = sanitizeDraft(merged);

    // 1. Save to LargeSecureStore for active session caching
    await LargeSecureStore.setItem(ONBOARDING_ACTIVE_DRAFT_KEY, JSON.stringify(sanitized));

    // 2. Persist to Supabase Database (public.onboarding_drafts) asynchronously
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const draftsTable = (supabase as any).from('onboarding_drafts');

        // Check if a row exists with this draft id or for this institution
        let existingRowId: string | null = null;
        
        // Check by explicit id first
        if (sanitized.id && !sanitized.id.startsWith('draft_')) {
          const { data: byId } = await draftsTable
            .select('id')
            .eq('id', sanitized.id)
            .limit(1);
          if (byId && byId.length > 0) {
            existingRowId = byId[0].id;
          }
        }

        // Fallback: check by matching institution name for this user
        if (!existingRowId && sanitized.institutionName && sanitized.institutionName !== 'Untitled Institution') {
          const { data: byName } = await draftsTable
            .select('id')
            .eq('user_id', user.id)
            .eq('institution_name', sanitized.institutionName)
            .limit(1);
          if (byName && byName.length > 0) {
            existingRowId = byName[0].id;
          }
        }

        const dbRecord = {
          user_id: user.id,
          institution_name: sanitized.institutionName,
          institution_code: sanitized.institutionCode || null,
          institution_category: sanitized.institutionCategory,
          step: sanitized.step,
          draft_data: sanitized as any,
          logo_url: sanitized.logo && !sanitized.logo.startsWith('blob:') ? sanitized.logo : null,
          updated_at: sanitized.updatedAt,
        };

        if (existingRowId) {
          await draftsTable
            .update(dbRecord)
            .eq('id', existingRowId);
          sanitized.id = existingRowId;
        } else {
          const { data: insertRes, error: insertErr } = await draftsTable
            .insert([dbRecord])
            .select('id')
            .single();

          if (!insertErr && insertRes?.id) {
            sanitized.id = insertRes.id;
          }
        }

        // Update local storage with confirmed id
        await LargeSecureStore.setItem(ONBOARDING_ACTIVE_DRAFT_KEY, JSON.stringify(sanitized));
        return sanitized.id || assignedId;
      }
    } catch (dbErr) {
      console.warn('[DraftService] Cloud DB sync warning:', dbErr);
    }

    return assignedId;
  } catch (err) {
    console.warn('[DraftService] Error saving draft:', err);
    return null;
  }
}

/**
 * Clears the active local draft session WITHOUT deleting saved drafts from the database.
 * Use this when the user chooses "Start New Institution" or "Start Fresh".
 */
export async function clearActiveDraftSession(): Promise<void> {
  try {
    await LargeSecureStore.removeItem(ONBOARDING_ACTIVE_DRAFT_KEY);
  } catch (err) {
    console.warn('[DraftService] Error clearing active draft session:', err);
  }
}

/**
 * Permanently deletes a specific draft from both Supabase database and local store.
 * Use this when the user explicitly clicks "Discard Draft" or when onboarding succeeds.
 */
export async function deleteOnboardingDraft(draftId?: string): Promise<void> {
  try {
    let targetId = draftId;
    if (!targetId) {
      const active = await getOnboardingDraft();
      targetId = active?.id;
    }

    await LargeSecureStore.removeItem(ONBOARDING_ACTIVE_DRAFT_KEY);

    if (targetId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await (supabase as any)
          .from('onboarding_drafts')
          .delete()
          .eq('id', targetId);
      }
    }
  } catch (err) {
    console.warn('[DraftService] Error deleting draft:', err);
  }
}

/**
 * Legacy wrapper: Deletes the draft (only called when user confirms discard or finishes onboarding)
 */
export async function clearOnboardingDraft(draftId?: string): Promise<void> {
  return deleteOnboardingDraft(draftId);
}
