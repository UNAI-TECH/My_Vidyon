import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { StatCard } from '../../../src/components/common/StatCard';
import { Badge } from '../../../src/components/common/Badge';
import { Button } from '../../../src/components/common/Button';
import { AlertModal } from '../../../src/components/common/AlertModal';
import { useAuth } from '../../../src/hooks/useAuth';
import { supabase } from '../../../src/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { uploadToSupabaseStorage } from '../../../src/utils/fileUpload';
import { logAuditEvent } from '../../../src/utils/auditLogger';
import {
  Users,
  Megaphone,
  CreditCard,
  Building2,
  Shield,
  Search,
  Plus,
  X,
  CheckCircle,
  Globe,
  Building,
  Mail,
  Phone,
  Trash2,
  UserCheck,
  UserX,
  Filter,
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  Sparkles,
  KeyRound,
  Camera,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Download,
  Clock,
  AlertTriangle,
} from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  fetchPasswordResetRequests,
  approvePasswordResetRequest,
  rejectPasswordResetRequest,
  PasswordResetRequest,
} from '../../../src/services/passwordResetService';

type StakeholderRole = 'ad_manager' | 'finance_manager' | 'institution_stakeholder' | 'superadmin' | 'institution_admin';
type ScopeType = 'global' | 'institution';

interface InstitutionItem {
  id: string;
  institution_id: string;
  name: string;
  city: string | null;
}

interface StakeholderUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department: string | null;
  institution_id: string | null;
  institution_name?: string;
  phone: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  resolvedRole: StakeholderRole;
}

export default function AdminUsers() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const queryClient = useQueryClient();
  const { user: currentUser, role: currentUserRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | StakeholderRole | 'reset_requests'>(
    (params?.tab as any) || 'all'
  );

  React.useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab as any);
    }
  }, [params?.tab]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-step form state (Pages 1, 2, 3, 4)
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [instSearch, setInstSearch] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<StakeholderRole>('ad_manager');
  const [scopeType, setScopeType] = useState<ScopeType>('global');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('');
  const [canExport, setCanExport] = useState(false);
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [superAdminConfirmPassword, setSuperAdminConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Alert Modal State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    buttons?: { text: string; style?: 'primary' | 'secondary' | 'destructive'; onPress: () => void }[];
  }>({ visible: false, title: '', message: '' });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    buttons?: { text: string; style?: 'primary' | 'secondary' | 'destructive'; onPress: () => void }[]
  ) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  // Fetch registered institutions for scope assignment
  const { data: institutions = [] } = useQuery<InstitutionItem[]>({
    queryKey: ['admin-registered-institutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, institution_id, name, city')
        .order('name');
      if (error) {
        console.error('Failed to load institutions:', error);
        return [];
      }
      return (data || []) as InstitutionItem[];
    },
  });

  // Fetch all admin and stakeholder profiles
  const { data: stakeholders = [], isLoading, refetch } = useQuery<StakeholderUser[]>({
    queryKey: ['admin-stakeholders-list'],
    queryFn: async () => {
      // Query profiles that are admins, superadmins, stakeholders, or have specialized departments
      let profilesData: any[] = [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.warn('Failed to order profiles by updated_at, trying unordered:', error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profiles')
          .select('*');
        if (fallbackError) {
          console.error('Failed to load profiles:', fallbackError);
          throw fallbackError;
        }
        profilesData = fallbackData || [];
      } else {
        profilesData = data || [];
      }

      const instMap: Record<string, string> = {};
      institutions.forEach((inst: any) => {
        if (inst.institution_id) instMap[inst.institution_id] = inst.name;
        if (inst.id) instMap[inst.id] = inst.name;
      });

      const relevant = profilesData.filter((p: any) => {
        const rawRole = (p.role || '').toLowerCase().trim();
        const dept = (p.department || '').toLowerCase().trim();
        return (
          rawRole === 'superadmin' ||
          rawRole === 'admin' ||
          rawRole === 'institution' ||
          rawRole === 'institution_stakeholder' ||
          rawRole === 'stakeholder' ||
          rawRole === 'ad_manager' ||
          rawRole === 'finance_manager' ||
          dept === 'ad management' ||
          dept === 'platform finance' ||
          dept === 'ads' ||
          dept === 'finance'
        );
      });

      return relevant.map((p: any) => {
        const dept = (p.department || '').toLowerCase().trim();
        const rawRole = (p.role || '').toLowerCase().trim();

        let resolvedRole: StakeholderRole = 'institution_stakeholder';
        if (rawRole === 'superadmin' || rawRole === 'admin') {
          resolvedRole = 'superadmin';
        } else if (rawRole === 'institution') {
          resolvedRole = 'institution_admin';
        } else if (dept === 'ad management' || dept === 'ads' || rawRole === 'ad_manager') {
          resolvedRole = 'ad_manager';
        } else if (dept === 'platform finance' || dept === 'finance' || rawRole === 'finance_manager') {
          resolvedRole = 'finance_manager';
        }

        const instName = p.institution_id ? instMap[p.institution_id] || p.institution_id : undefined;

        return {
          id: p.id,
          email: p.email || '',
          full_name: p.full_name || 'Unnamed User',
          role: p.role,
          department: p.department,
          institution_id: p.institution_id,
          institution_name: instName,
          phone: p.phone,
          avatar_url: p.avatar_url || p.profile_image_url || p.image_url || null,
          is_active: p.is_active !== false,
          created_at: p.updated_at || p.created_at || new Date().toISOString(),
          resolvedRole,
        };
      });
    },
    enabled: institutions.length >= 0,
  });

  // Calculate metrics
  const stats = useMemo(() => {
    const total = stakeholders.length;
    const adManagers = stakeholders.filter((s) => s.resolvedRole === 'ad_manager').length;
    const financeManagers = stakeholders.filter((s) => s.resolvedRole === 'finance_manager').length;
    const instStakeholders = stakeholders.filter((s) => s.resolvedRole === 'institution_stakeholder').length;
    const superAdmins = stakeholders.filter((s) => s.resolvedRole === 'superadmin').length;
    const instAdmins = stakeholders.filter((s) => s.resolvedRole === 'institution_admin').length;
    return { total, adManagers, financeManagers, instStakeholders, superAdmins, instAdmins };
  }, [stakeholders]);

  // Filtered list based on search and active tab
  const filteredStakeholders = useMemo(() => {
    return stakeholders.filter((s) => {
      const matchesTab = activeTab === 'all' || s.resolvedRole === activeTab;
      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.institution_name && s.institution_name.toLowerCase().includes(q))
      );
    });
  }, [stakeholders, activeTab, searchQuery]);

  // Toggle user active / disabled status
  const handleToggleStatus = (user: StakeholderUser) => {
    const nextStatus = !user.is_active;
    const actionLabel = nextStatus ? 'Activate' : 'Disable';

    showAlert(
      `${actionLabel} User`,
      nextStatus
        ? `Are you sure you want to activate ${user.full_name} (${user.email})?\n\nThey will regain full platform access and will be permitted to log in.`
        : `Are you sure you want to disable ${user.full_name} (${user.email})?\n\nThey will immediately be blocked from logging into the platform until re-activated.`,
      nextStatus ? 'info' : 'warning',
      [
        {
          text: 'Cancel',
          style: 'secondary',
          onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
        },
        {
          text: `${actionLabel} User`,
          style: nextStatus ? 'primary' : 'destructive',
          onPress: async () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            try {
              const { error } = await (supabase
                .from('profiles') as any)
                .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
                .eq('id', user.id);

              if (error) throw error;

              await logAuditEvent({
                action: nextStatus ? 'ACTIVATE_STAKEHOLDER' : 'DEACTIVATE_STAKEHOLDER',
                entityType: 'user',
                entityId: user.id,
                institutionId: user.institution_id || 'global',
                actorId: currentUser?.id,
                actorEmail: currentUser?.email,
                details: { target_user: user.email, full_name: user.full_name, is_active: nextStatus }
              });

              queryClient.invalidateQueries({ queryKey: ['admin-stakeholders-list'] });

              showAlert(
                `User ${nextStatus ? 'Activated' : 'Disabled'}`,
                `${user.full_name} (${user.email}) has been successfully ${nextStatus ? 'activated and can now log in.' : 'disabled and will be blocked from logging in.'}`,
                nextStatus ? 'success' : 'warning',
                [
                  {
                    text: 'OK',
                    style: 'primary',
                    onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                  }
                ]
              );
            } catch (err: any) {
              showAlert(
                'Update Error',
                err.message || `Failed to ${actionLabel.toLowerCase()} user.`,
                'error',
                [
                  {
                    text: 'OK',
                    style: 'primary',
                    onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                  }
                ]
              );
            }
          },
        },
      ]
    );
  };

  // Revoke / Delete stakeholder
  const handleDelete = (user: StakeholderUser) => {
    showAlert(
      'Remove User',
      `Are you sure you want to permanently remove ${user.full_name} (${user.email})?\n\nThey will lose access to the platform and their account will be deleted.`,
      'warning',
      [
        {
          text: 'Cancel',
          style: 'secondary',
          onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            try {
              // Delete profile
              const { error } = await supabase.from('profiles').delete().eq('id', user.id);
              if (error) throw error;

              await logAuditEvent({
                action: 'DELETE_STAKEHOLDER',
                entityType: 'user',
                entityId: user.id,
                institutionId: user.institution_id || 'global',
                actorId: currentUser?.id,
                actorEmail: currentUser?.email,
                details: { target_user: user.email, full_name: user.full_name }
              });

              queryClient.invalidateQueries({ queryKey: ['admin-stakeholders-list'] });
              showAlert('User Removed', `${user.full_name} has been successfully removed.`, 'success', [
                {
                  text: 'OK',
                  style: 'primary',
                  onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                }
              ]);
            } catch (err: any) {
              showAlert('Removal Error', err.message || 'Failed to remove user.', 'error', [
                {
                  text: 'OK',
                  style: 'primary',
                  onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                }
              ]);
            }
          },
        },
      ]
    );
  };

  // Fetch Password Reset Requests
  const {
    data: resetRequests = [],
    isLoading: isLoadingResets,
    refetch: refetchResets
  } = useQuery<PasswordResetRequest[]>({
    queryKey: ['admin-password-reset-requests'],
    queryFn: () => fetchPasswordResetRequests({ isSuperAdmin: true }),
    refetchInterval: 15000,
  });

  const pendingResetsCount = useMemo(() => {
    return resetRequests.filter(r => r.status === 'pending').length;
  }, [resetRequests]);

  const filteredResetRequests = useMemo(() => {
    if (!searchQuery.trim()) return resetRequests;
    const q = searchQuery.toLowerCase().trim();
    return resetRequests.filter(
      (r) =>
        (r.full_name && r.full_name.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.role && r.role.toLowerCase().includes(q)) ||
        (r.institution_name && r.institution_name.toLowerCase().includes(q)) ||
        (r.institution_id && r.institution_id.toLowerCase().includes(q))
    );
  }, [resetRequests, searchQuery]);

  const [processingResetId, setProcessingResetId] = useState<string | null>(null);

  const handleApproveReset = (req: PasswordResetRequest) => {
    showAlert(
      'Approve Password Reset',
      `Are you sure you want to approve password reset for ${req.full_name || req.email}?\n\nTheir password will be reset to default setup mode. On their next login, they will be prompted to set a new password, just like a first-time login.`,
      'info',
      [
        {
          text: 'Cancel',
          style: 'secondary',
          onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
        },
        {
          text: 'Approve & Reset',
          style: 'primary',
          onPress: async () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            setProcessingResetId(req.id);
            try {
              const res = await approvePasswordResetRequest(req, {
                id: currentUser?.id,
                email: currentUser?.email,
              });
              showAlert('Reset Approved', res.message, 'success', [
                {
                  text: 'OK',
                  style: 'primary',
                  onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                }
              ]);
              queryClient.invalidateQueries({ queryKey: ['admin-password-reset-requests'] });
            } catch (err: any) {
              showAlert('Error', err.message || 'Failed to approve request', 'error', [
                {
                  text: 'OK',
                  style: 'primary',
                  onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                }
              ]);
            } finally {
              setProcessingResetId(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectReset = (req: PasswordResetRequest) => {
    showAlert(
      'Reject Request',
      `Are you sure you want to reject the reset request for ${req.full_name || req.email}?`,
      'warning',
      [
        {
          text: 'Cancel',
          style: 'secondary',
          onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            setProcessingResetId(req.id);
            try {
              const res = await rejectPasswordResetRequest(req, {
                id: currentUser?.id,
                email: currentUser?.email,
              });
              showAlert('Request Rejected', res.message, 'info', [
                {
                  text: 'OK',
                  style: 'primary',
                  onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                }
              ]);
              queryClient.invalidateQueries({ queryKey: ['admin-password-reset-requests'] });
            } catch (err: any) {
              showAlert('Error', err.message || 'Failed to reject request', 'error', [
                {
                  text: 'OK',
                  style: 'primary',
                  onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                }
              ]);
            } finally {
              setProcessingResetId(null);
            }
          },
        },
      ]
    );
  };

  // Auto-generate email based on name, selected role, and scope/institution
  const autoEmail = useMemo(() => {
    if (!fullName.trim()) return '';
    const nameParts = fullName.trim().split(/\s+/);
    const first = (nameParts[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
    const last = (nameParts.slice(1).join('') || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const base = last ? `${first}.${last}` : first;
    const instObj = institutions.find(
      (i: any) => i.id === selectedInstitutionId || i.institution_id === selectedInstitutionId
    );
    const instCode = instObj?.institution_id || instObj?.id;

    let domain = 'vidyon.app';
    if (selectedRole === 'superadmin') {
      domain = 'admin.vidyon.app';
    } else if (scopeType === 'institution' && instCode) {
      domain = `${instCode.toLowerCase().replace(/[^a-z0-9]/g, '')}.vidyon.app`;
    } else if (selectedRole === 'ad_manager') {
      domain = 'ads.vidyon.app';
    } else if (selectedRole === 'finance_manager') {
      domain = 'finance.vidyon.app';
    } else if (selectedRole === 'institution_stakeholder') {
      domain = instCode ? `${instCode.toLowerCase().replace(/[^a-z0-9]/g, '')}.vidyon.app` : 'stakeholder.vidyon.app';
    }
    return `${base}@${domain}`;
  }, [fullName, selectedRole, scopeType, selectedInstitutionId, institutions]);

  // Filter institutions for step 2 search
  const filteredInstitutions = useMemo(() => {
    if (!instSearch.trim()) return institutions;
    const q = instSearch.trim().toLowerCase();
    return institutions.filter((inst) =>
      inst.name?.toLowerCase().includes(q) ||
      inst.institution_id?.toLowerCase().includes(q) ||
      inst.city?.toLowerCase().includes(q)
    );
  }, [institutions, instSearch]);

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick image: ' + (err.message || 'Unknown error'));
    }
  };

  const handleCopyEmail = async () => {
    if (!autoEmail) return;
    await Clipboard.setStringAsync(autoEmail);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setAvatarUri(null);
    setInstSearch('');
    setSelectedRole('ad_manager');
    setScopeType('global');
    setSelectedInstitutionId('');
    setCanExport(false);
    setSuperAdminPassword('');
    setSuperAdminConfirmPassword('');
    setShowPassword(false);
    setFormStep(1);
    setIsAddModalOpen(false);
  };

  // Create new stakeholder with passwordless initial account (or direct password for superadmin)
  const handleCreateStakeholder = async () => {
    if (!fullName.trim() || !autoEmail) {
      Alert.alert('Validation Error', 'Please enter a valid full name on Step 1 to generate credentials.');
      setFormStep(1);
      return;
    }

    if (selectedRole === 'superadmin') {
      if (!superAdminPassword || superAdminPassword.length < 6) {
        Alert.alert('Password Error', 'Super Admin root password must be at least 6 characters.');
        setFormStep(3);
        return;
      }
      if (superAdminPassword !== superAdminConfirmPassword) {
        Alert.alert('Password Error', 'Passwords do not match. Please verify your password entry.');
        setFormStep(3);
        return;
      }
    } else if (selectedRole === 'institution_stakeholder') {
      if (!selectedInstitutionId) {
        Alert.alert('Validation Error', 'Please select a target institution for this administrator.');
        setFormStep(3);
        return;
      }
    } else if ((selectedRole === 'ad_manager' || selectedRole === 'finance_manager') && scopeType === 'institution') {
      if (!selectedInstitutionId) {
        Alert.alert('Validation Error', 'Please select the target institution for this scoped stakeholder.');
        setFormStep(3);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let uploadedAvatarUrl: string | null = null;
      if (avatarUri) {
        try {
          let ext = 'jpg';
          let mimeType = 'image/jpeg';

          if (Platform.OS === 'web') {
            try {
              const res = await fetch(avatarUri);
              const blob = await res.blob();
              if (blob.type) {
                mimeType = blob.type;
                if (blob.type.includes('png')) ext = 'png';
                else if (blob.type.includes('webp')) ext = 'webp';
                else if (blob.type.includes('jpeg') || blob.type.includes('jpg')) ext = 'jpg';
              }
            } catch (blobErr) {
              console.warn('Failed reading blob type on web:', blobErr);
            }
          } else {
            const clean = avatarUri.split('?')[0].split('#')[0];
            const possibleExt = clean.split('.').pop()?.toLowerCase();
            if (possibleExt && ['jpg', 'jpeg', 'png', 'webp'].includes(possibleExt)) {
              ext = possibleExt;
              mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
            }
          }

          const fileName = `stakeholder_${Date.now()}.${ext}`;
          const filePath = `stakeholders/${fileName}`;
          const { publicUrl } = await uploadToSupabaseStorage({
            bucket: 'avatars',
            path: filePath,
            uri: avatarUri,
            mimeType,
          });
          uploadedAvatarUrl = publicUrl;
        } catch (photoErr) {
          console.warn('Avatar upload fallback error:', photoErr);
        }
      }

      // Map to safe Postgres role + department
      let dbRole: string = 'institution_stakeholder';
      let dbDept: string = 'Stakeholder';

      if (selectedRole === 'ad_manager') {
        dbRole = 'institution_stakeholder';
        dbDept = 'Ad Management';
      } else if (selectedRole === 'finance_manager') {
        dbRole = 'institution_stakeholder';
        dbDept = 'Platform Finance';
      } else if (selectedRole === 'superadmin') {
        dbRole = 'superadmin';
        dbDept = 'Administration';
      }

      const instObj = institutions.find(
        (i: any) => i.id === selectedInstitutionId || i.institution_id === selectedInstitutionId
      );
      const effectiveInstId =
        selectedRole === 'superadmin' || scopeType === 'global'
          ? 'global'
          : instObj?.institution_id || instObj?.id || selectedInstitutionId;

      // Invoke Supabase function create-user
      const body: Record<string, any> = {
        email: autoEmail.toLowerCase(),
        full_name: fullName.trim(),
        role: dbRole,
        institution_id: effectiveInstId,
        department: dbDept,
        phone: phone.trim() || null,
        image_url: uploadedAvatarUrl,
        avatar_url: uploadedAvatarUrl,
      };

      // Set direct password for SuperAdmin
      if (selectedRole === 'superadmin' && superAdminPassword) {
        body.password = superAdminPassword;
      }

      const { data: res, error: fnError } = await supabase.functions.invoke('create-user', { body });

      if (fnError || (res && res.error)) {
        const errMsg = fnError?.message || res?.error || 'Failed to create stakeholder user.';
        console.error('Edge function error:', fnError || res);
        throw new Error(errMsg);
      }

      const createdUserId = res?.data?.user?.id || res?.user?.id || res?.id;

      // Link in institution_stakeholder_links for RBAC and set export permissions
      if (effectiveInstId !== 'global' && effectiveInstId && createdUserId) {
        try {
          await (supabase.rpc as any)('link_institution_stakeholder', {
            p_user_id: createdUserId,
            p_institution_id: effectiveInstId,
            p_can_export: selectedRole === 'institution_stakeholder' ? canExport : true,
          });
        } catch (linkErr) {
          console.warn('Could not link stakeholder via RPC:', linkErr);
        }

        try {
          await (supabase.from('institution_stakeholder_links') as any).upsert({
            user_id: createdUserId,
            institution_id: effectiveInstId,
            can_export: selectedRole === 'institution_stakeholder' ? canExport : true,
          });
        } catch (upsertErr) {
          console.warn('Could not upsert institution_stakeholder_links:', upsertErr);
        }
      }

      // Record comprehensive audit trail
      await logAuditEvent({
        action: 'CREATE_STAKEHOLDER',
        entityType: 'user',
        entityId: createdUserId,
        institutionId: effectiveInstId,
        actorId: currentUser?.id,
        actorEmail: currentUser?.email,
        details: {
          full_name: fullName.trim(),
          email: autoEmail.toLowerCase(),
          role: selectedRole,
          scope: scopeType,
          institution_id: effectiveInstId,
          can_export: selectedRole === 'institution_stakeholder' ? canExport : true,
          is_superadmin: selectedRole === 'superadmin',
        },
      });

      const successNotice =
        selectedRole === 'superadmin'
          ? `🛡️ Super Administrator Created!\n\nEmail: ${autoEmail}\n\nDirect root credentials have been saved.`
          : `✅ Stakeholder Created!\n\nAccount registered!\n\nEmail: ${autoEmail}\n\nThe user will set up their own password upon their first login.`;

      resetForm();
      refetch();
      showAlert(
        selectedRole === 'superadmin' ? 'Super Admin Created' : 'Stakeholder Created',
        successNotice,
        'success',
        [
          {
            text: 'Done',
            style: 'primary',
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
          }
        ]
      );
    } catch (err: any) {
      showAlert('Creation Error', err.message || 'Failed to create stakeholder.', 'error', [
        {
          text: 'OK',
          style: 'primary',
          onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (resolvedRole: StakeholderRole) => {
    switch (resolvedRole) {
      case 'ad_manager':
        return <Badge variant="warning">📢 Ad Manager</Badge>;
      case 'finance_manager':
        return <Badge variant="success">💳 Finance Stakeholder</Badge>;
      case 'institution_stakeholder':
        return <Badge variant="info">🏛️ Inst. Stakeholder</Badge>;
      case 'institution_admin':
        return <Badge variant="info">🏫 Campus Admin</Badge>;
      case 'superadmin':
        return <Badge variant="destructive">🛡️ Super Admin</Badge>;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader
        title="User & Stakeholder Directory"
        subtitle="Manage Super Admins, Campus Admins, Stakeholders, and Password Reset Requests"
        actions={
          <Button
            title="Add Stakeholder"
            icon={<Plus size={16} color="#FFFFFF" />}
            onPress={() => setIsAddModalOpen(true)}
            size="md"
          />
        }
      />

      {/* Metrics Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="All Stakeholders"
          value={stats.total.toString()}
          icon={Users}
          iconColor="#3B82F6"
          change="Total active team"
        />
        <StatCard
          title="Ad Managers"
          value={stats.adManagers.toString()}
          icon={Megaphone}
          iconColor="#F59E0B"
          change="Ads & Sponsors"
        />
        <StatCard
          title="Finance Team"
          value={stats.financeManagers.toString()}
          icon={CreditCard}
          iconColor="#10B981"
          change="SaaS Revenue"
        />
        <StatCard
          title="Inst. Stakeholders"
          value={stats.instStakeholders.toString()}
          icon={Building2}
          iconColor="#8B5CF6"
          change="Oversight"
        />
      </View>

      {/* Search and Tabs */}
      <View style={styles.controlsCard}>
        <View style={styles.searchBar}>
          <Search size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, role, or institution..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'all' && styles.activeTabChip]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabChipText, activeTab === 'all' && styles.activeTabChipText]}>
              All ({stats.total})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'ad_manager' && styles.activeTabChip]}
            onPress={() => setActiveTab('ad_manager')}
          >
            <Text style={[styles.tabChipText, activeTab === 'ad_manager' && styles.activeTabChipText]}>
              Ad Managers ({stats.adManagers})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'finance_manager' && styles.activeTabChip]}
            onPress={() => setActiveTab('finance_manager')}
          >
            <Text style={[styles.tabChipText, activeTab === 'finance_manager' && styles.activeTabChipText]}>
              Finance Team ({stats.financeManagers})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'institution_stakeholder' && styles.activeTabChip]}
            onPress={() => setActiveTab('institution_stakeholder')}
          >
            <Text style={[styles.tabChipText, activeTab === 'institution_stakeholder' && styles.activeTabChipText]}>
              Inst. Stakeholders ({stats.instStakeholders})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'superadmin' && styles.activeTabChip]}
            onPress={() => setActiveTab('superadmin')}
          >
            <Text style={[styles.tabChipText, activeTab === 'superadmin' && styles.activeTabChipText]}>
              Super Admins ({stats.superAdmins})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'institution_admin' && styles.activeTabChip]}
            onPress={() => setActiveTab('institution_admin')}
          >
            <Text style={[styles.tabChipText, activeTab === 'institution_admin' && styles.activeTabChipText]}>
              Campus Admins ({stats.instAdmins})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabChip,
              activeTab === 'reset_requests' && styles.activeTabChip,
              pendingResetsCount > 0 && { borderColor: '#F59E0B' },
            ]}
            onPress={() => setActiveTab('reset_requests')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <KeyRound size={13} color={activeTab === 'reset_requests' ? 'white' : (pendingResetsCount > 0 ? '#D97706' : theme.colors.textMuted)} />
              <Text
                style={[
                  styles.tabChipText,
                  activeTab === 'reset_requests' && styles.activeTabChipText,
                  pendingResetsCount > 0 && activeTab !== 'reset_requests' && { color: '#D97706', fontWeight: 'bold' },
                ]}
              >
                Password Resets ({pendingResetsCount})
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Stakeholders or Password Resets List */}
      <View style={styles.listSection}>
        {activeTab === 'reset_requests' ? (
          isLoadingResets ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading password reset requests...</Text>
            </View>
          ) : filteredResetRequests.length === 0 ? (
            <View style={styles.emptyCard}>
              <KeyRound size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No Reset Requests</Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? 'No password reset requests matched your search query.'
                  : 'Users who request a password reset from the login screen will appear here for verification and approval.'}
              </Text>
            </View>
          ) : (
            filteredResetRequests.map((req) => (
              <View key={req.id} style={styles.userCard}>
                <View style={styles.userMainInfo}>
                  <View
                    style={[
                      styles.userAvatar,
                      {
                        backgroundColor:
                          req.status === 'pending'
                            ? '#FEF3C7'
                            : req.status === 'approved'
                            ? '#DCFCE7'
                            : '#F1F5F9',
                      },
                    ]}
                  >
                    <KeyRound
                      size={20}
                      color={
                        req.status === 'pending'
                          ? '#D97706'
                          : req.status === 'approved'
                          ? '#16A34A'
                          : '#64748B'
                      }
                    />
                  </View>

                  <View style={styles.userDetails}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName}>{req.full_name || req.email}</Text>
                      <Badge variant="default">
                        {req.role ? req.role.replace('_', ' ').toUpperCase() : 'USER'}
                      </Badge>
                      <Badge
                        variant={
                          req.status === 'approved'
                            ? 'success'
                            : req.status === 'pending'
                            ? 'warning'
                            : 'destructive'
                        }
                      >
                        {req.status.toUpperCase()}
                      </Badge>
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Mail size={13} color={theme.colors.textMuted} />
                        <Text style={styles.metaText}>{req.email}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Clock size={13} color={theme.colors.textMuted} />
                        <Text style={styles.metaText}>
                          {new Date(req.created_at).toLocaleDateString()}{' '}
                          {new Date(req.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>

                    {/* Scope / Institution info */}
                    <View style={styles.scopeRow}>
                      {req.institution_name || req.institution_id ? (
                        <View style={styles.scopeBadgeInst}>
                          <Building size={12} color="#0284C7" />
                          <Text style={styles.scopeTextInst}>
                            {req.institution_name
                              ? `Institution: ${req.institution_name}`
                              : `Campus: ${req.institution_id}`}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.scopeBadgeGlobal}>
                          <Globe size={12} color="#16A34A" />
                          <Text style={styles.scopeTextGlobal}>Global / Admin Scope</Text>
                        </View>
                      )}
                    </View>

                    {req.admin_notes ? (
                      <View
                        style={{
                          marginTop: 8,
                          padding: 8,
                          backgroundColor: '#F8FAFC',
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic' }}>
                          Reason: "{req.admin_notes}"
                        </Text>
                      </View>
                    ) : null}

                    {req.status === 'approved' && (
                      <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={13} color="#16A34A" />
                        <Text style={{ fontSize: 12, color: '#16A34A', fontWeight: '500' }}>
                          Reset to Setup Mode • User will set their new password on next login.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.userActions}>
                  {req.status === 'pending' ? (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          { backgroundColor: '#10B981', borderColor: '#059669' },
                          processingResetId === req.id && { opacity: 0.6 },
                        ]}
                        onPress={() => handleApproveReset(req)}
                        disabled={processingResetId === req.id}
                      >
                        {processingResetId === req.id ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <CheckCircle size={14} color="white" />
                            <Text
                              style={{
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: 12,
                                marginLeft: 4,
                              }}
                            >
                              Approve & Reset
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionDelete]}
                        onPress={() => handleRejectReset(req)}
                        disabled={processingResetId === req.id}
                      >
                        <X size={14} color="#EF4444" />
                        <Text style={{ color: '#EF4444', fontSize: 12, marginLeft: 4 }}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: '#E2E8F0' }]}
                      onPress={() => handleApproveReset(req)}
                      disabled={processingResetId === req.id}
                    >
                      <KeyRound size={13} color={theme.colors.textMuted} />
                      <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginLeft: 4 }}>
                        Re-Reset
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading directory...</Text>
          </View>
        ) : filteredStakeholders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Users size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? 'Try adjusting your search criteria.'
                : 'No users found matching the selected category. Click "+ Add Stakeholder" to create a new user.'}
            </Text>
          </View>
        ) : (
          filteredStakeholders.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userMainInfo}>
                <View style={styles.userAvatar}>
                  {user.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.userAvatarImg} resizeMode="cover" />
                  ) : (
                    <Text style={styles.avatarText}>
                      {user.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={styles.userDetails}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName}>{user.full_name}</Text>
                    {getRoleBadge(user.resolvedRole)}
                    <Badge variant={user.is_active ? 'success' : 'destructive'}>
                      {user.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Mail size={13} color={theme.colors.textMuted} />
                      <Text style={styles.metaText}>{user.email}</Text>
                    </View>
                    {user.phone && (
                      <View style={styles.metaItem}>
                        <Phone size={13} color={theme.colors.textMuted} />
                        <Text style={styles.metaText}>{user.phone}</Text>
                      </View>
                    )}
                  </View>

                  {/* Scope Indicator */}
                  <View style={styles.scopeRow}>
                    {user.institution_name ? (
                      <View style={styles.scopeBadgeInst}>
                        <Building size={12} color="#0284C7" />
                        <Text style={styles.scopeTextInst}>
                          Institution: {user.institution_name}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.scopeBadgeGlobal}>
                        <Globe size={12} color="#16A34A" />
                        <Text style={styles.scopeTextGlobal}>Global Platform Scope</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, user.is_active ? styles.actionDisable : styles.actionEnable]}
                  onPress={() => handleToggleStatus(user)}
                >
                  {user.is_active ? (
                    <>
                      <UserX size={14} color="#EF4444" />
                      <Text style={styles.actionDisableText}>Disable</Text>
                    </>
                  ) : (
                    <>
                      <UserCheck size={14} color="#10B981" />
                      <Text style={styles.actionEnableText}>Activate</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionDelete]}
                  onPress={() => handleDelete(user)}
                >
                  <Trash2 size={14} color="#94A3B8" />
                  <Text style={styles.actionDeleteText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Add Stakeholder Modal - 4-Step Wizard */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={resetForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add New Stakeholder</Text>
                <Text style={styles.modalSubtitle}>
                  {formStep === 1 && 'Step 1 of 4 • Profile Details & Photo'}
                  {formStep === 2 && 'Step 2 of 4 • Choose Stakeholder Role'}
                  {formStep === 3 && 'Step 3 of 4 • Scope & Permissions'}
                  {formStep === 4 && 'Step 4 of 4 • Review & Auto-Credentials'}
                </Text>
              </View>
              <TouchableOpacity onPress={resetForm} style={styles.closeBtn}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* 4-Step Progress Indicator */}
            <View style={styles.stepIndicatorRow}>
              {/* Step 1: Profile */}
              <TouchableOpacity
                style={[styles.stepTab, formStep === 1 && styles.stepTabActive, formStep > 1 && styles.stepTabCompleted]}
                onPress={() => setFormStep(1)}
              >
                <View style={[styles.stepDot, formStep === 1 && styles.stepDotActive, formStep > 1 && styles.stepDotCompleted]}>
                  <Text style={[styles.stepDotNum, (formStep === 1 || formStep > 1) && styles.stepDotNumActive]}>1</Text>
                </View>
                <Text style={[styles.stepTabText, formStep === 1 && styles.stepTabTextActive]}>Profile</Text>
              </TouchableOpacity>

              <View style={[styles.stepLine, formStep >= 2 && styles.stepLineActive]} />

              {/* Step 2: Role */}
              <TouchableOpacity
                style={[styles.stepTab, formStep === 2 && styles.stepTabActive, formStep > 2 && styles.stepTabCompleted]}
                onPress={() => {
                  if (fullName.trim()) setFormStep(2);
                }}
              >
                <View style={[styles.stepDot, formStep === 2 && styles.stepDotActive, formStep > 2 && styles.stepDotCompleted]}>
                  <Text style={[styles.stepDotNum, (formStep === 2 || formStep > 2) && styles.stepDotNumActive]}>2</Text>
                </View>
                <Text style={[styles.stepTabText, formStep === 2 && styles.stepTabTextActive]}>Role</Text>
              </TouchableOpacity>

              <View style={[styles.stepLine, formStep >= 3 && styles.stepLineActive]} />

              {/* Step 3: Scope & Permissions */}
              <TouchableOpacity
                style={[styles.stepTab, formStep === 3 && styles.stepTabActive, formStep > 3 && styles.stepTabCompleted]}
                onPress={() => {
                  if (fullName.trim()) setFormStep(3);
                }}
              >
                <View style={[styles.stepDot, formStep === 3 && styles.stepDotActive, formStep > 3 && styles.stepDotCompleted]}>
                  <Text style={[styles.stepDotNum, (formStep === 3 || formStep > 3) && styles.stepDotNumActive]}>3</Text>
                </View>
                <Text style={[styles.stepTabText, formStep === 3 && styles.stepTabTextActive]}>Scope</Text>
              </TouchableOpacity>

              <View style={[styles.stepLine, formStep >= 4 && styles.stepLineActive]} />

              {/* Step 4: Confirm */}
              <TouchableOpacity
                style={[styles.stepTab, formStep === 4 && styles.stepTabActive]}
                onPress={() => {
                  if (!fullName.trim()) return;
                  if (selectedRole === 'institution_stakeholder' && !selectedInstitutionId) return;
                  if ((selectedRole === 'ad_manager' || selectedRole === 'finance_manager') && scopeType === 'institution' && !selectedInstitutionId) return;
                  if (selectedRole === 'superadmin' && (!superAdminPassword || superAdminPassword.length < 6 || superAdminPassword !== superAdminConfirmPassword)) return;
                  setFormStep(4);
                }}
              >
                <View style={[styles.stepDot, formStep === 4 && styles.stepDotActive]}>
                  <Text style={[styles.stepDotNum, formStep === 4 && styles.stepDotNumActive]}>4</Text>
                </View>
                <Text style={[styles.stepTabText, formStep === 4 && styles.stepTabTextActive]}>Confirm</Text>
              </TouchableOpacity>
            </View>

            {/* PAGE 1: Profile Details & Avatar Photo */}
            {formStep === 1 && (
              <ScrollView style={styles.modalStepPage} showsVerticalScrollIndicator={false}>
                {/* Photo Upload Section */}
                <View style={styles.avatarUploadContainer}>
                  <View style={styles.avatarPreviewWrapper}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatarPreviewImg} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Camera size={28} color="#6366F1" />
                        <Text style={styles.avatarPlaceholderText}>Photo</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.avatarActionButtons}>
                    <TouchableOpacity style={styles.photoUploadBtn} onPress={handlePickAvatar}>
                      <Camera size={14} color="#FFFFFF" />
                      <Text style={styles.photoUploadBtnText}>
                        {avatarUri ? 'Change Photo' : 'Upload Profile Photo'}
                      </Text>
                    </TouchableOpacity>

                    {!!avatarUri && (
                      <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => setAvatarUri(null)}>
                        <Trash2 size={13} color="#EF4444" />
                        <Text style={styles.photoRemoveText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Full Name */}
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Ramesh Sharma"
                  placeholderTextColor={theme.colors.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                  autoFocus
                />

                {/* Contact Phone */}
                <Text style={styles.inputLabel}>Contact Phone (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />

                {/* Step 1 Informational Note */}
                <View style={styles.stepOneHintCard}>
                  <Sparkles size={16} color="#3B82F6" style={{ marginTop: 2 }} />
                  <Text style={styles.stepOneHintText}>
                    Enter the basic profile details. You will choose their role in Step 2, configure their jurisdiction & permissions in Step 3, and confirm auto-credentials in Step 4.
                  </Text>
                </View>
              </ScrollView>
            )}

            {/* PAGE 2: Role Selection */}
            {formStep === 2 && (
              <ScrollView style={styles.modalStepPage} showsVerticalScrollIndicator={false}>
                <View style={styles.scopeSectionHeader}>
                  <Text style={styles.sectionHeaderTitle}>Select Stakeholder Role *</Text>
                  <Text style={styles.pageDescText}>
                    Choose the administrative responsibility and permission tier for this stakeholder:
                  </Text>
                </View>

                <View style={styles.roleOptions}>
                  {/* Ad Management */}
                  <TouchableOpacity
                    style={[styles.roleOption, selectedRole === 'ad_manager' && styles.selectedRoleOption]}
                    onPress={() => setSelectedRole('ad_manager')}
                  >
                    <View style={[styles.roleIconWrap, { backgroundColor: '#FEF3C7' }]}>
                      <Megaphone size={18} color="#D97706" />
                    </View>
                    <View style={styles.roleOptionTextWrap}>
                      <View style={styles.roleTitleRow}>
                        <Text style={[styles.roleOptionTitle, selectedRole === 'ad_manager' && styles.selectedRoleTitle]}>
                          Ad Management Stakeholder
                        </Text>
                        {selectedRole === 'ad_manager' && <CheckCircle size={17} color="#D97706" />}
                      </View>
                      <Text style={styles.roleOptionDesc}>
                        Manages sponsored ads, banner placements, institution-specific or global ad campaigns, and leads.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Finance Management */}
                  <TouchableOpacity
                    style={[styles.roleOption, selectedRole === 'finance_manager' && styles.selectedRoleOption]}
                    onPress={() => setSelectedRole('finance_manager')}
                  >
                    <View style={[styles.roleIconWrap, { backgroundColor: '#D1FAE5' }]}>
                      <CreditCard size={18} color="#059669" />
                    </View>
                    <View style={styles.roleOptionTextWrap}>
                      <View style={styles.roleTitleRow}>
                        <Text style={[styles.roleOptionTitle, selectedRole === 'finance_manager' && styles.selectedRoleTitle]}>
                          Finance Management Stakeholder
                        </Text>
                        {selectedRole === 'finance_manager' && <CheckCircle size={17} color="#059669" />}
                      </View>
                      <Text style={styles.roleOptionDesc}>
                        Oversees platform SaaS recurring billing, institution invoices, subscription settlements, and payouts.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Institution Stakeholder / Admin */}
                  <TouchableOpacity
                    style={[styles.roleOption, selectedRole === 'institution_stakeholder' && styles.selectedRoleOption]}
                    onPress={() => {
                      setSelectedRole('institution_stakeholder');
                      setScopeType('institution');
                    }}
                  >
                    <View style={[styles.roleIconWrap, { backgroundColor: '#EDE9FE' }]}>
                      <Building2 size={18} color="#7C3AED" />
                    </View>
                    <View style={styles.roleOptionTextWrap}>
                      <View style={styles.roleTitleRow}>
                        <Text style={[styles.roleOptionTitle, selectedRole === 'institution_stakeholder' && styles.selectedRoleTitle]}>
                          Institution Admin / Stakeholder
                        </Text>
                        {selectedRole === 'institution_stakeholder' && <CheckCircle size={17} color="#7C3AED" />}
                      </View>
                      <Text style={styles.roleOptionDesc}>
                        Campus-level executive overseeing admissions, academic metrics, and finances for a specific institution.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Super Admin */}
                  <TouchableOpacity
                    style={[styles.roleOption, selectedRole === 'superadmin' && styles.selectedRoleOption]}
                    onPress={() => {
                      setSelectedRole('superadmin');
                      setScopeType('global');
                      setSelectedInstitutionId('');
                    }}
                  >
                    <View style={[styles.roleIconWrap, { backgroundColor: '#FEE2E2' }]}>
                      <Shield size={18} color="#DC2626" />
                    </View>
                    <View style={styles.roleOptionTextWrap}>
                      <View style={styles.roleTitleRow}>
                        <Text style={[styles.roleOptionTitle, selectedRole === 'superadmin' && styles.selectedRoleTitle]}>
                          Super Administrator
                        </Text>
                        {selectedRole === 'superadmin' && <CheckCircle size={17} color="#DC2626" />}
                      </View>
                      <Text style={styles.roleOptionDesc}>
                        Full unrestricted root control across all platform settings, databases, institutions, and tenant policies.
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {/* PAGE 3: Scope & Permissions (Dynamic based on selected role) */}
            {formStep === 3 && (
              <ScrollView style={styles.modalStepPage} showsVerticalScrollIndicator={false}>
                {/* CASE A: Ad Manager or Finance Manager (Can choose Global vs Specific Institution) */}
                {(selectedRole === 'ad_manager' || selectedRole === 'finance_manager') && (
                  <View>
                    <View style={styles.scopeSectionHeader}>
                      <Text style={styles.sectionHeaderTitle}>Jurisdiction & Access Scope *</Text>
                      <Text style={styles.pageDescText}>
                        {selectedRole === 'ad_manager'
                          ? 'Select whether this Ad Manager can create & manage ads globally across all institutions, or only for a specific campus:'
                          : 'Select whether this Finance Stakeholder monitors platform-wide revenue or revenue for a specific campus:'}
                      </Text>
                    </View>

                    <View style={styles.scopeToggleRow}>
                      <TouchableOpacity
                        style={[styles.scopeToggleBtn, scopeType === 'global' && styles.scopeToggleActive]}
                        onPress={() => {
                          setScopeType('global');
                          setSelectedInstitutionId('');
                        }}
                      >
                        <Globe size={18} color={scopeType === 'global' ? '#FFFFFF' : theme.colors.text} />
                        <View style={styles.scopeToggleTextWrap}>
                          <Text style={[styles.scopeToggleText, scopeType === 'global' && styles.scopeToggleTextActive]}>
                            Global Platform
                          </Text>
                          <Text style={[styles.scopeToggleSubText, scopeType === 'global' && styles.scopeToggleSubTextActive]}>
                            All platform institutions
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.scopeToggleBtn, scopeType === 'institution' && styles.scopeToggleActive]}
                        onPress={() => setScopeType('institution')}
                      >
                        <Building size={18} color={scopeType === 'institution' ? '#FFFFFF' : theme.colors.text} />
                        <View style={styles.scopeToggleTextWrap}>
                          <Text style={[styles.scopeToggleText, scopeType === 'institution' && styles.scopeToggleTextActive]}>
                            Specific Institution
                          </Text>
                          <Text style={[styles.scopeToggleSubText, scopeType === 'institution' && styles.scopeToggleSubTextActive]}>
                            Single campus / tenant
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Institution Selector if Specific Institution is picked */}
                    {scopeType === 'institution' && (
                      <View style={styles.instSelectSection}>
                        <Text style={styles.inputLabel}>Select Target Institution *</Text>
                        
                        <View style={styles.instSearchBox}>
                          <Search size={15} color={theme.colors.textMuted} />
                          <TextInput
                            style={styles.instSearchInput}
                            placeholder="Search by institution name, code, or city..."
                            placeholderTextColor={theme.colors.textMuted}
                            value={instSearch}
                            onChangeText={setInstSearch}
                          />
                          {!!instSearch && (
                            <TouchableOpacity onPress={() => setInstSearch('')}>
                              <X size={14} color={theme.colors.textMuted} />
                            </TouchableOpacity>
                          )}
                        </View>

                        <ScrollView style={styles.instCardsScroll} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                          {filteredInstitutions.length === 0 ? (
                            <View style={styles.noInstFound}>
                              <Building2 size={24} color="#94A3B8" />
                              <Text style={styles.noInstFoundText}>
                                {instSearch ? 'No matching institutions found' : 'No institutions registered yet'}
                              </Text>
                            </View>
                          ) : (
                            filteredInstitutions.map((inst) => {
                              const isSelected = selectedInstitutionId === inst.institution_id || selectedInstitutionId === inst.id;
                              return (
                                <TouchableOpacity
                                  key={inst.id || inst.institution_id}
                                  style={[styles.instCardItem, isSelected && styles.instCardItemActive]}
                                  onPress={() => setSelectedInstitutionId(inst.institution_id || inst.id)}
                                >
                                  <View style={[styles.instCardIconWrap, isSelected && styles.instCardIconWrapActive]}>
                                    <Building2 size={18} color={isSelected ? theme.colors.primary : '#4F46E5'} />
                                  </View>

                                  <View style={styles.instCardInfo}>
                                    <Text style={[styles.instCardName, isSelected && styles.instCardNameActive]}>
                                      {inst.name}
                                    </Text>
                                    <View style={styles.instCardMetaRow}>
                                      <View style={styles.instCodeChip}>
                                        <Text style={styles.instCodeChipText}>Code: {inst.institution_id}</Text>
                                      </View>
                                      <View style={styles.instCityChip}>
                                        <MapPin size={11} color="#059669" />
                                        <Text style={styles.instCityChipText}>{inst.city || 'India'}</Text>
                                      </View>
                                    </View>
                                  </View>

                                  <View style={styles.instCardCheck}>
                                    {isSelected ? (
                                      <CheckCircle size={20} color={theme.colors.primary} />
                                    ) : (
                                      <View style={styles.instRadioUnchecked} />
                                    )}
                                  </View>
                                </TouchableOpacity>
                              );
                            })
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}

                {/* CASE B: Institution Admin / Stakeholder (CANNOT be global, mandates institution + Export toggle) */}
                {selectedRole === 'institution_stakeholder' && (
                  <View>
                    <View style={styles.scopeSectionHeader}>
                      <Text style={styles.sectionHeaderTitle}>Select Target Institution *</Text>
                      <Text style={styles.pageDescText}>
                        Institution administrators are campus-scoped. Select which campus this administrator governs:
                      </Text>
                    </View>

                    {/* Search & Institution Card Picker */}
                    <View style={styles.instSearchBox}>
                      <Search size={15} color={theme.colors.textMuted} />
                      <TextInput
                        style={styles.instSearchInput}
                        placeholder="Search by institution name, code, or city..."
                        placeholderTextColor={theme.colors.textMuted}
                        value={instSearch}
                        onChangeText={setInstSearch}
                      />
                      {!!instSearch && (
                        <TouchableOpacity onPress={() => setInstSearch('')}>
                          <X size={14} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView style={styles.instCardsScroll} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                      {filteredInstitutions.length === 0 ? (
                        <View style={styles.noInstFound}>
                          <Building2 size={24} color="#94A3B8" />
                          <Text style={styles.noInstFoundText}>
                            {instSearch ? 'No matching institutions found' : 'No institutions registered yet'}
                          </Text>
                        </View>
                      ) : (
                        filteredInstitutions.map((inst) => {
                          const isSelected = selectedInstitutionId === inst.institution_id || selectedInstitutionId === inst.id;
                          return (
                            <TouchableOpacity
                              key={inst.id || inst.institution_id}
                              style={[styles.instCardItem, isSelected && styles.instCardItemActive]}
                              onPress={() => setSelectedInstitutionId(inst.institution_id || inst.id)}
                            >
                              <View style={[styles.instCardIconWrap, isSelected && styles.instCardIconWrapActive]}>
                                <Building2 size={18} color={isSelected ? theme.colors.primary : '#4F46E5'} />
                              </View>

                              <View style={styles.instCardInfo}>
                                <Text style={[styles.instCardName, isSelected && styles.instCardNameActive]}>
                                  {inst.name}
                                </Text>
                                <View style={styles.instCardMetaRow}>
                                  <View style={styles.instCodeChip}>
                                    <Text style={styles.instCodeChipText}>Code: {inst.institution_id}</Text>
                                  </View>
                                  <View style={styles.instCityChip}>
                                    <MapPin size={11} color="#059669" />
                                    <Text style={styles.instCityChipText}>{inst.city || 'India'}</Text>
                                  </View>
                                </View>
                              </View>

                              <View style={styles.instCardCheck}>
                                {isSelected ? (
                                  <CheckCircle size={20} color={theme.colors.primary} />
                                ) : (
                                  <View style={styles.instRadioUnchecked} />
                                )}
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>

                    {/* Export Files Permission Toggle */}
                    <TouchableOpacity
                      style={[styles.exportToggleCard, canExport && styles.exportToggleCardActive]}
                      onPress={() => setCanExport(!canExport)}
                    >
                      <View style={[styles.exportToggleIconWrap, canExport && styles.exportToggleIconWrapActive]}>
                        <FileSpreadsheet size={20} color={canExport ? '#059669' : '#64748B'} />
                      </View>
                      <View style={styles.exportToggleTextWrap}>
                        <Text style={styles.exportToggleTitle}>Allow Export Files & Reports</Text>
                        <Text style={styles.exportToggleDesc}>
                          Grant permission to download and export institution student rosters, fee reports, admissions, and financial Excel spreadsheets.
                        </Text>
                      </View>
                      <View style={[styles.switchPill, canExport && styles.switchPillActive]}>
                        <View style={[styles.switchKnob, canExport && styles.switchKnobActive]} />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* CASE C: Super Admin (CANNOT be scoped to an institution, requires root password creation) */}
                {selectedRole === 'superadmin' && (
                  <View>
                    <View style={styles.superadminBanner}>
                      <Shield size={24} color="#DC2626" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.superadminBannerTitle}>Root Super Administrator Access</Text>
                        <Text style={styles.superadminBannerDesc}>
                          Super Administrators hold universal platform control across all institutions, databases, and policies. Specify secure direct credentials below.
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>Root Super Admin Password *</Text>
                    <View style={styles.passwordInputContainer}>
                      <Lock size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Enter password (minimum 6 characters)"
                        placeholderTextColor={theme.colors.textMuted}
                        secureTextEntry={!showPassword}
                        value={superAdminPassword}
                        onChangeText={setSuperAdminPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                        {showPassword ? <EyeOff size={16} color="#64748B" /> : <Eye size={16} color="#64748B" />}
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.inputLabel}>Confirm Password *</Text>
                    <View style={styles.passwordInputContainer}>
                      <Lock size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Re-enter password"
                        placeholderTextColor={theme.colors.textMuted}
                        secureTextEntry={!showPassword}
                        value={superAdminConfirmPassword}
                        onChangeText={setSuperAdminConfirmPassword}
                      />
                    </View>

                    <View style={styles.stepOneHintCard}>
                      <Lock size={16} color="#DC2626" style={{ marginTop: 2 }} />
                      <Text style={[styles.stepOneHintText, { color: '#991B1B' }]}>
                        This super administrator will be directly provisioned with full administrative root credentials and can sign in immediately using this password.
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {/* PAGE 4: Final Review & Auto-Generated Credentials */}
            {formStep === 4 && (
              <ScrollView style={styles.modalStepPage} showsVerticalScrollIndicator={false}>
                {/* Stakeholder Identity Card */}
                <View style={styles.summaryUserCard}>
                  <View style={styles.summaryAvatar}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.summaryAvatarImg} />
                    ) : (
                      <View style={styles.summaryAvatarPlaceholder}>
                        <Text style={styles.summaryAvatarInitials}>
                          {fullName.trim().charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.summaryUserInfo}>
                    <Text style={styles.summaryUserName}>{fullName}</Text>
                    <Text style={styles.summaryUserPhone}>{phone ? `📞 ${phone}` : 'No phone specified'}</Text>
                    <View style={styles.summaryBadgesRow}>
                      <Badge variant="info">
                        {selectedRole === 'ad_manager' ? '📢 Ad Manager' :
                         selectedRole === 'finance_manager' ? '💳 Finance Manager' :
                         selectedRole === 'institution_stakeholder' ? '🏛️ Inst. Admin' : '🛡️ Super Admin'}
                      </Badge>
                      <Badge variant="default">
                        {selectedRole === 'superadmin'
                          ? 'Global Platform (Root Access)'
                          : scopeType === 'global'
                          ? 'Global Platform (All Institutions)'
                          : institutions.find(i => i.id === selectedInstitutionId || i.institution_id === selectedInstitutionId)?.name || 'Scoped Institution'}
                      </Badge>
                      {selectedRole === 'institution_stakeholder' && (
                        <Badge variant={canExport ? 'success' : 'destructive'}>
                          {canExport ? '✅ Exports Permitted' : '🔒 Exports Restricted'}
                        </Badge>
                      )}
                    </View>
                  </View>
                </View>

                {/* Auto-Generated Login Email Card */}
                <View style={styles.autoEmailCard}>
                  <View style={styles.autoEmailHeader}>
                    <View style={styles.autoEmailHeaderLeft}>
                      <Sparkles size={16} color="#F59E0B" />
                      <Text style={styles.autoEmailTitle}>Auto-Generated Login Email</Text>
                    </View>
                    <Badge variant="warning">System Generated</Badge>
                  </View>

                  <View style={styles.autoEmailBody}>
                    <Text style={styles.autoEmailText} numberOfLines={1}>
                      {autoEmail}
                    </Text>
                    <TouchableOpacity style={styles.copyBtn} onPress={handleCopyEmail}>
                      {isCopied ? (
                        <>
                          <Check size={14} color="#10B981" />
                          <Text style={styles.copiedText}>Copied</Text>
                        </>
                      ) : (
                        <>
                          <Copy size={14} color={theme.colors.primary} />
                          <Text style={styles.copyBtnText}>Copy</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.autoEmailHint}>
                    Official email dynamically derived from full name and assigned institution/role domain.
                  </Text>
                </View>

                {/* Password / Credentials Info Card */}
                {selectedRole === 'superadmin' ? (
                  <View style={[styles.firstLoginNotice, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                    <View style={[styles.firstLoginIcon, { backgroundColor: '#FEE2E2' }]}>
                      <Lock size={20} color="#DC2626" />
                    </View>
                    <View style={styles.firstLoginContent}>
                      <Text style={[styles.firstLoginTitle, { color: '#991B1B' }]}>Root Password Configured</Text>
                      <Text style={[styles.firstLoginDesc, { color: '#B91C1C' }]}>
                        Direct root credentials saved. This Super Administrator can sign in immediately using the password entered on Step 3.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.firstLoginNotice}>
                    <View style={styles.firstLoginIcon}>
                      <KeyRound size={20} color="#6366F1" />
                    </View>
                    <View style={styles.firstLoginContent}>
                      <Text style={styles.firstLoginTitle}>Password Setup on First Login</Text>
                      <Text style={styles.firstLoginDesc}>
                        No initial password needed. The user will be automatically prompted to create their secure personal password when signing in for the first time with this email.
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Modal Navigation Footer */}
            <View style={styles.modalFooter}>
              {formStep === 1 && (
                <>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={resetForm}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="Next: Choose Role →"
                    onPress={() => {
                      if (!fullName.trim()) {
                        showAlert('Required Field', 'Please enter stakeholder full name to continue.', 'warning');
                        return;
                      }
                      setFormStep(2);
                    }}
                    style={{ flex: 1, marginLeft: 8 }}
                  />
                </>
              )}

              {formStep === 2 && (
                <>
                  <Button
                    title="← Back to Profile"
                    variant="outline"
                    onPress={() => setFormStep(1)}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="Next: Scope & Permissions →"
                    onPress={() => setFormStep(3)}
                    style={{ flex: 1, marginLeft: 8 }}
                  />
                </>
              )}

              {formStep === 3 && (
                <>
                  <Button
                    title="← Back to Role"
                    variant="outline"
                    onPress={() => setFormStep(2)}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="Next: Review & Confirm →"
                    onPress={() => {
                      if (selectedRole === 'superadmin') {
                        if (!superAdminPassword || superAdminPassword.length < 6) {
                          showAlert('Password Error', 'Super Admin root password must be at least 6 characters.', 'warning');
                          return;
                        }
                        if (superAdminPassword !== superAdminConfirmPassword) {
                          showAlert('Password Error', 'Passwords do not match. Please verify your password entry.', 'warning');
                          return;
                        }
                      } else if (selectedRole === 'institution_stakeholder') {
                        if (!selectedInstitutionId) {
                          showAlert('Required Field', 'Please select a target institution before proceeding.', 'warning');
                          return;
                        }
                      } else if ((selectedRole === 'ad_manager' || selectedRole === 'finance_manager') && scopeType === 'institution') {
                        if (!selectedInstitutionId) {
                          showAlert('Required Field', 'Please select a target institution before proceeding.', 'warning');
                          return;
                        }
                      }
                      setFormStep(4);
                    }}
                    style={{ flex: 1, marginLeft: 8 }}
                  />
                </>
              )}

              {formStep === 4 && (
                <>
                  <Button
                    title="← Back to Scope"
                    variant="outline"
                    onPress={() => setFormStep(3)}
                    style={{ flex: 1, marginRight: 8 }}
                    disabled={isSubmitting}
                  />
                  <Button
                    title={isSubmitting ? 'Creating...' : 'Create Stakeholder'}
                    onPress={handleCreateStakeholder}
                    loading={isSubmitting}
                    style={{ flex: 1, marginLeft: 8 }}
                  />
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Universal Alert & Confirmation Modal */}
      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        buttons={alertConfig.buttons}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24, paddingBottom: 60 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  controlsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 44,
    marginBottom: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text },
  tabsScroll: { flexDirection: 'row' },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  activeTabChip: { backgroundColor: theme.colors.primary },
  tabChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  activeTabChipText: { color: '#FFFFFF' },
  listSection: { gap: 12 },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
  },
  userMainInfo: { flexDirection: 'row', alignItems: 'flex-start' },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    overflow: 'hidden',
  },
  userAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: { fontSize: 15, fontWeight: 'bold', color: '#4F46E5' },
  userDetails: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  userName: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: theme.colors.textMuted },
  scopeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  scopeBadgeGlobal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  scopeTextGlobal: { fontSize: 12, fontWeight: '600', color: '#16A34A' },
  scopeBadgeInst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  scopeTextInst: { fontSize: 12, fontWeight: '600', color: '#0284C7' },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionDisable: { backgroundColor: '#FEF2F2' },
  actionDisableText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  actionEnable: { backgroundColor: '#F0FDF4' },
  actionEnableText: { fontSize: 12, fontWeight: '600', color: '#10B981' },
  actionDelete: { backgroundColor: '#F8FAFC' },
  actionDeleteText: { fontSize: 12, color: theme.colors.textMuted },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, color: theme.colors.textMuted, fontSize: 14 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text, marginTop: 16 },
  emptySub: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', marginTop: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  modalSubtitle: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  closeBtn: { padding: 4 },
  modalForm: { flexGrow: 0 },
  modalStepPage: { maxHeight: 420 },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  stepTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepTabActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  stepTabCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: theme.colors.primary,
  },
  stepDotCompleted: {
    backgroundColor: '#10B981',
  },
  stepDotNum: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stepDotNumActive: {
    color: '#FFFFFF',
  },
  stepTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  stepTabTextActive: {
    color: theme.colors.primary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 6,
  },
  stepLineActive: {
    backgroundColor: theme.colors.primary,
  },
  autoEmailCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginTop: 16,
  },
  autoEmailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  autoEmailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autoEmailTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  autoEmailBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  autoEmailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  autoEmailPlaceholder: {
    color: '#94A3B8',
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  copiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  autoEmailHint: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 6,
  },
  firstLoginNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: 14,
    marginTop: 14,
  },
  firstLoginIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstLoginContent: {
    flex: 1,
  },
  firstLoginTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4338CA',
  },
  firstLoginDesc: {
    fontSize: 12,
    color: '#4F46E5',
    marginTop: 2,
    lineHeight: 16,
  },
  pageDescText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 14,
  },
  inputLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6, marginTop: 12 },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 14,
    color: theme.colors.text,
  },
  roleOptions: { gap: 10 },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  selectedRoleOption: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FFF7ED',
  },
  roleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleOptionTextWrap: { marginLeft: 12, flex: 1 },
  roleOptionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  selectedRoleTitle: { color: theme.colors.primary },
  roleOptionDesc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 3, lineHeight: 16 },
  scopeSectionHeader: { marginBottom: 4 },
  sectionHeaderTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  scopeToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12, marginTop: 6 },
  scopeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  scopeToggleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  scopeToggleTextWrap: { flex: 1 },
  scopeToggleText: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  scopeToggleTextActive: { color: '#FFFFFF' },
  scopeToggleSubText: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  scopeToggleSubTextActive: { color: 'rgba(255, 255, 255, 0.9)' },
  avatarUploadContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  avatarPreviewWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPreviewImg: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  avatarPlaceholderText: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '600',
  },
  avatarActionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  photoUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  photoUploadBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  photoRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  photoRemoveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  stepOneHintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  stepOneHintText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  instSelectSection: { marginTop: 10 },
  instSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 10,
    marginTop: 4,
  },
  instSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: theme.colors.text,
  },
  instCardsScroll: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 8,
    backgroundColor: '#F8FAFC',
  },
  noInstFound: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  noInstFoundText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  instCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  instCardItemActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FFFBEB',
  },
  instCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instCardIconWrapActive: {
    backgroundColor: '#FEF3C7',
  },
  instCardInfo: {
    flex: 1,
    marginLeft: 10,
  },
  instCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  instCardNameActive: {
    color: theme.colors.primary,
  },
  instCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  instCodeChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  instCodeChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  instCityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  instCityChipText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  instCardCheck: {
    marginLeft: 8,
  },
  instRadioUnchecked: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  summaryUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
  },
  summaryAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    marginRight: 14,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  summaryAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryAvatarInitials: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  summaryUserInfo: {
    flex: 1,
  },
  summaryUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  summaryUserPhone: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  summaryBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  superadminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  superadminBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  superadminBannerDesc: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 16,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  exportToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  exportToggleCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  exportToggleIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exportToggleIconWrapActive: {
    backgroundColor: '#DCFCE7',
  },
  exportToggleTextWrap: {
    flex: 1,
  },
  exportToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  exportToggleDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  switchPill: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CBD5E1',
    padding: 2,
    justifyContent: 'center',
  },
  switchPillActive: {
    backgroundColor: '#10B981',
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  switchKnobActive: {
    alignSelf: 'flex-end',
  },
});
