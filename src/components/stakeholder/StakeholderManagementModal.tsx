// ============================================================
// File: src/components/stakeholder/StakeholderManagementModal.tsx
// Purpose: Frontend modal to view, add, and revoke stakeholders
//          for any institution without requiring password generation
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';
import {
  X,
  Users,
  UserPlus,
  ShieldCheck,
  Mail,
  User,
  Trash2,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react-native';

export interface StakeholderManagementModalProps {
  visible: boolean;
  onClose: () => void;
  institutionId: string;
  institutionName: string;
  onStakeholderCountChanged?: (newCount: number) => void;
}

interface LinkedStakeholder {
  id: string;
  user_id: string;
  can_export: boolean;
  created_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    is_active: boolean | null;
  };
}

export const StakeholderManagementModal: React.FC<StakeholderManagementModalProps> = ({
  visible,
  onClose,
  institutionId,
  institutionName,
  onStakeholderCountChanged,
}) => {
  const [stakeholders, setStakeholders] = useState<LinkedStakeholder[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [canExport, setCanExport] = useState(true);

  // 1. Fetch linked stakeholders for this institution
  const fetchStakeholders = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      // First get the active links
      const { data: links, error: linksError } = await supabase
        .from('institution_stakeholder_links')
        .select('id, user_id, can_export, created_at, revoked_at')
        .eq('institution_id', institutionId)
        .is('revoked_at', null);

      if (linksError) throw linksError;

      const activeLinks = (links || []) as any[];
      if (activeLinks.length === 0) {
        setStakeholders([]);
        if (onStakeholderCountChanged) onStakeholderCountChanged(0);
        return;
      }

      // Fetch corresponding profile details
      const userIds = activeLinks.map((l: any) => l.user_id);
      const { data: profiles, error: profilesError } = await (supabase
        .from('profiles') as any)
        .select('id, full_name, role, is_active')
        .in('id', userIds);

      if (profilesError) console.warn('[Stakeholders] Could not fetch profiles:', profilesError);

      const profileMap = new Map(((profiles || []) as any[]).map((p: any) => [p.id, p]));

      const combined: LinkedStakeholder[] = activeLinks.map((link: any) => ({
        ...link,
        profile: profileMap.get(link.user_id) || {
          id: link.user_id,
          full_name: 'Stakeholder Member',
          email: null,
          role: 'institution_stakeholder',
          is_active: true,
        },
      }));

      setStakeholders(combined);
      if (onStakeholderCountChanged) onStakeholderCountChanged(combined.length);
    } catch (err: any) {
      console.error('[Stakeholders] Error loading stakeholders:', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId, onStakeholderCountChanged]);

  useEffect(() => {
    if (visible && institutionId) {
      fetchStakeholders();
      setShowAddForm(false);
      setEmail('');
      setFullName('');
      setCanExport(true);
    }
  }, [visible, institutionId, fetchStakeholders]);

  // 2. Add new stakeholder
  const handleAddStakeholder = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      let targetUserId: string | null = null;

      // Step A: Check if a user with this email already exists
      const { data: existingProfile } = await (supabase
        .from('profiles')
        .select('id, role') as any)
        .ilike('email', trimmedEmail)
        .maybeSingle();

      if (existingProfile?.id) {
        targetUserId = existingProfile.id;
        console.log('[Stakeholders] Existing user found with id:', targetUserId);
      } else {
        // Step B: User doesn't exist yet -> Provision via create-user Edge Function
        // Notice: NO PASSWORD passed. Backend sets default password VidyonSetup_${institutionId}.
        // The user will set their own custom password on first login!
        console.log('[Stakeholders] Provisioning new stakeholder user via Edge Function...');
        const { data: createRes, error: createErr } = await supabase.functions.invoke('create-user', {
          body: {
            email: trimmedEmail,
            role: 'institution_stakeholder',
            full_name: fullName.trim() || 'Institution Stakeholder',
            institution_id: institutionId,
          },
        });

        if (createErr) {
          console.error('[Stakeholders] create-user function failed:', createErr);
          throw new Error(createErr.message || 'Failed to provision stakeholder user account.');
        }

        targetUserId = createRes?.user?.id || createRes?.id;

        // If Edge function did not return id directly, query profiles
        if (!targetUserId) {
          const { data: freshProfile } = await (supabase
            .from('profiles')
            .select('id') as any)
            .ilike('email', trimmedEmail)
            .maybeSingle();
          targetUserId = freshProfile?.id;
        }
      }

      if (!targetUserId) {
        throw new Error('Unable to resolve user ID for stakeholder account.');
      }

      // Step C: Link the stakeholder to this institution
      // Attempt RPC first, fallback to direct upsert
      let linkSuccess = false;
      try {
        const { error: rpcError } = await (supabase.rpc as any)('link_institution_stakeholder', {
          p_user_id: targetUserId,
          p_institution_id: institutionId,
          p_can_export: canExport,
        });
        if (!rpcError) linkSuccess = true;
      } catch {
        // fallback
      }

      if (!linkSuccess) {
        const { error: upsertError } = await (supabase
          .from('institution_stakeholder_links') as any)
          .upsert(
            {
              user_id: targetUserId,
              institution_id: institutionId,
              can_export: canExport,
              revoked_at: null,
            },
            { onConflict: 'user_id,institution_id' }
          );

        if (upsertError) throw upsertError;
      }

      // Ensure profile role is institution_stakeholder if not already superadmin/admin
      if (existingProfile && !['superadmin', 'super_admin', 'admin'].includes(existingProfile.role)) {
        await (supabase.from('profiles') as any)
          .update({ role: 'institution_stakeholder' })
          .eq('id', targetUserId);
      }

      Alert.alert(
        'Stakeholder Added',
        `Successfully linked ${trimmedEmail} to ${institutionName}.\n\nNo password generation needed: on their first login, they will be prompted to create their own password.`,
        [{ text: 'OK' }]
      );

      setEmail('');
      setFullName('');
      setShowAddForm(false);
      await fetchStakeholders();
    } catch (err: any) {
      console.error('[Stakeholders] Add error:', err);
      Alert.alert('Error', err.message || 'Failed to add stakeholder.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Revoke/Unlink stakeholder
  const handleRevokeStakeholder = (item: LinkedStakeholder) => {
    const name = item.profile?.full_name || 'this stakeholder';
    Alert.alert(
      'Revoke Stakeholder Access',
      `Are you sure you want to remove ${name} from ${institutionName}? They will no longer be able to view dashboards for this school.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              // Attempt RPC first
              let unlinked = false;
              try {
                const { error } = await (supabase.rpc as any)('unlink_institution_stakeholder', {
                  p_user_id: item.user_id,
                  p_institution_id: institutionId,
                });
                if (!error) unlinked = true;
              } catch {
                // fallback
              }

              if (!unlinked) {
                await (supabase.from('institution_stakeholder_links') as any)
                  .update({ revoked_at: new Date().toISOString() })
                  .eq('id', item.id);
              }

              Alert.alert('Access Revoked', 'Stakeholder access has been removed.');
              await fetchStakeholders();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to revoke stakeholder access.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <ShieldCheck size={20} color={theme.colors.primary} {...({} as any)} />
                <Text style={styles.title}>Institution Stakeholders</Text>
              </View>
              <Text style={styles.subtitle} numberOfLines={1}>
                {institutionName} ({institutionId})
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#64748B" {...({} as any)} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* View-Only Explanation */}
            <View style={styles.infoBanner}>
              <AlertCircle size={16} color="#D97706" {...({} as any)} />
              <Text style={styles.infoBannerText}>
                Stakeholders have <Text style={{ fontWeight: '700' }}>view-only</Text> oversight across
                academics, attendance, and fee analytics. They cannot edit, delete, or approve records.
              </Text>
            </View>

            {/* Existing Stakeholders List */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Linked Stakeholders ({stakeholders.length})
              </Text>
              {!showAddForm && (
                <TouchableOpacity
                  style={styles.addTriggerBtn}
                  onPress={() => setShowAddForm(true)}
                >
                  <UserPlus size={14} color="#1E293B" {...({} as any)} />
                  <Text style={styles.addTriggerBtnText}>Add Stakeholder</Text>
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
            ) : stakeholders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Users size={36} color="#CBD5E1" {...({} as any)} />
                <Text style={styles.emptyTitle}>No Stakeholders Linked Yet</Text>
                <Text style={styles.emptyDesc}>
                  Add board members, trustees, or investors to give them executive view-only access.
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {stakeholders.map((item) => (
                  <View key={item.id} style={styles.stakeholderCard}>
                    <View style={styles.avatarCircle}>
                      <User size={18} color="#D97706" {...({} as any)} />
                    </View>
                    <View style={styles.cardDetails}>
                      <Text style={styles.cardName}>
                        {item.profile?.full_name || 'Stakeholder Member'}
                      </Text>
                      <Text style={styles.cardRole}>
                        Role: {item.profile?.role || 'institution_stakeholder'}
                      </Text>
                      <View style={styles.tagsRow}>
                        {item.can_export ? (
                          <View style={styles.exportTag}>
                            <FileSpreadsheet size={10} color="#059669" {...({} as any)} />
                            <Text style={styles.exportTagText}>Export Enabled</Text>
                          </View>
                        ) : (
                          <View style={[styles.exportTag, { backgroundColor: '#F1F5F9' }]}>
                            <Text style={[styles.exportTagText, { color: '#64748B' }]}>Export Disabled</Text>
                          </View>
                        )}
                        <Text style={styles.dateTag}>
                          Added {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.revokeBtn}
                      onPress={() => handleRevokeStakeholder(item)}
                    >
                      <Trash2 size={16} color="#EF4444" {...({} as any)} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add Stakeholder Form */}
            {showAddForm && (
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Add New Stakeholder</Text>
                  <TouchableOpacity onPress={() => setShowAddForm(false)}>
                    <X size={16} color="#64748B" {...({} as any)} />
                  </TouchableOpacity>
                </View>

                {/* Email Input */}
                <Text style={styles.fieldLabel}>Stakeholder Email *</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={16} color="#94A3B8" {...({} as any)} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. trustee@school.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                {/* Full Name Input */}
                <Text style={styles.fieldLabel}>Full Name / Title (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <User size={16} color="#94A3B8" {...({} as any)} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Dr. Ramesh Gupta (Trustee)"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>

                {/* Export Permission Toggle */}
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchLabel}>Allow Report Export</Text>
                    <Text style={styles.switchSubtext}>
                      Allows downloading executive reports and summaries.
                    </Text>
                  </View>
                  <Switch
                    value={canExport}
                    onValueChange={setCanExport}
                    trackColor={{ false: '#CBD5E1', true: '#FDE68A' }}
                    thumbColor={canExport ? theme.colors.primary : '#F1F5F9'}
                  />
                </View>

                {/* First-time login note */}
                <View style={styles.passwordNote}>
                  <CheckCircle size={14} color="#059669" {...({} as any)} />
                  <Text style={styles.passwordNoteText}>
                    <Text style={{ fontWeight: '700' }}>No password setup required:</Text> The user will
                    be prompted to create their own secure password the first time they log in.
                  </Text>
                </View>

                {/* Submit button */}
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                  disabled={submitting}
                  onPress={handleAddStakeholder}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <UserPlus size={16} color="#FFFFFF" {...({} as any)} />
                      <Text style={styles.submitBtnText}>Add & Link Stakeholder</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  addTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addTriggerBtnText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
  },
  listContainer: {
    gap: 10,
    marginBottom: 16,
  },
  stakeholderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  cardRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  exportTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exportTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  dateTag: {
    fontSize: 10,
    color: '#94A3B8',
  },
  revokeBtn: {
    padding: 8,
  },
  formCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  switchSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  passwordNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
    marginBottom: 16,
  },
  passwordNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitBtnText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
  },
});
