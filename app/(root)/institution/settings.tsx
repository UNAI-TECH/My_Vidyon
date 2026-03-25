import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Switch, Image } from 'react-native';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { useAuth } from '../../../src/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../src/lib/supabase';
import { 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Save, 
  Bell,
  Settings2,
  ShieldCheck,
  ChevronRight,
  LogOut,
  ArrowUpRight,
  CalendarRange,
  Clock
} from 'lucide-react-native';
import { AlertModal } from '../../../src/components/common/AlertModal';
import * as ImagePicker from 'expo-image-picker';

export default function InstitutionSettingsScreen() {
  const { institutionId, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'notifications'>('general');

  // Alert Modal State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [guardPhone, setGuardPhone] = useState('');
  const [transportPhone, setTransportPhone] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch institution data
  const { data: institution, isLoading } = useQuery({
    queryKey: ['institution-settings', institutionId],
    queryFn: async (): Promise<any> => {
      if (!institutionId) return null;
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .eq('institution_id', institutionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!institutionId
  });

  // Fetch pending promotion request
  const { data: pendingPromotion, isLoading: loadingPromotion } = useQuery({
    queryKey: ['pending-promotion', institutionId],
    queryFn: async () => {
      if (!institutionId) return null;
      const { data, error } = await (supabase
        .from('promotion_requests') as any)
        .select('*')
        .eq('institution_id', institutionId)
        .eq('status', 'pending')
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!institutionId
  });

  // Calculate next year
  const calculateNextYear = (currentYear: string) => {
    if (!currentYear) return '';
    try {
      const parts = currentYear.split('-');
      if (parts.length === 2) {
        const start = parseInt(parts[0]);
        const end = parseInt(parts[1]);
        if (!isNaN(start) && !isNaN(end)) {
          return `${start + 1}-${(end + 1).toString().padStart(2, '0')}`;
        }
      }
    } catch(e) {}
    return 'Next Year';
  };

  // Promotion mutation
  const requestPromotionMutation = useMutation({
    mutationFn: async ({ fromYear, toYear }: { fromYear: string, toYear: string }) => {
      if (!institutionId) throw new Error('No institution ID');
      const { error } = await (supabase
        .from('promotion_requests') as any)
        .insert([{
          institution_id: institutionId,
          from_year: fromYear,
          to_year: toYear,
          status: 'pending'
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-promotion'] });
      showAlert('Success', 'Promotion request sent to admin for approval.', 'success');
    },
    onError: (error: any) => {
      showAlert('Error', error.message || 'Failed to request promotion', 'error');
    }
  });

  // Sync form with fetched data
  useEffect(() => {
    if (institution) {
      setName(institution.name || '');
      setEmail(institution.email || '');
      setPhone(institution.phone || '');
      setAddress(institution.address || '');
      setAcademicYear(institution.current_academic_year || '');
      setOfficePhone(institution.office_phone || '');
      setGuardPhone(institution.guard_phone || '');
      setTransportPhone(institution.transport_phone || '');
      setLogo(institution.logo_url || null);
    }
  }, [institution]);

  // Image Picker
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setLogo(result.assets[0].uri);
    }
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedData: Record<string, any>) => {
      if (!institutionId) throw new Error('No institution ID');
      const { error } = await (supabase
        .from('institutions' as any) as any)
        .update(updatedData as any)
        .eq('institution_id', institutionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-settings'] });
      showAlert('Success', 'Settings saved successfully', 'success');
    },
    onError: (error: any) => {
      showAlert('Error', error.message || 'Failed to save settings', 'error');
    }
  });

  const handleSave = async () => {
    try {
      setIsUploading(true);
      let finalLogoUrl = logo;
      
      if (logo && logo.startsWith('file://')) {
        const fileExt = logo.split('.').pop() || 'jpeg';
        const fileName = `${institutionId}-${Math.random()}.${fileExt}`;
        const formData = new FormData();
        
        formData.append('file', {
          uri: logo,
          name: fileName,
          type: `image/${fileExt}`
        } as unknown as Blob);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, formData, {
            upsert: true
          });
          
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('logos')
            .getPublicUrl(fileName);
          finalLogoUrl = publicUrl;
        } else {
          throw new Error("Logo upload failed: " + uploadError.message);
        }
      }

      updateMutation.mutate({
        name,
        email,
        phone,
        address,
        current_academic_year: academicYear,
        academic_year: academicYear,
        office_phone: officePhone,
        guard_phone: guardPhone,
        transport_phone: transportPhone,
        logo_url: finalLogoUrl
      });
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Settings" subtitle="Configure institutional preferences" />

      {/* Tab Toggle */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'general' && styles.activeTab]}
          onPress={() => setActiveTab('general')}
        >
          <Building size={16} color={activeTab === 'general' ? theme.colors.primary : theme.colors.textMuted} {...({} as any)} />
          <Text style={[styles.tabText, activeTab === 'general' && styles.activeTabText]}>General</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Bell size={16} color={activeTab === 'notifications' ? theme.colors.primary : theme.colors.textMuted} {...({} as any)} />
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>Notifications</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'general' && (
          <>
            {/* Profile Card */}
            <View style={styles.profileCard}>
              <TouchableOpacity style={styles.profileImage} onPress={pickImage}>
                {logo ? (
                  <Image source={{ uri: logo }} style={{ width: 72, height: 72, borderRadius: 18 }} />
                ) : (
                  <Building size={36} color={theme.colors.primary} {...({} as any)} />
                )}
                <View style={{ position: 'absolute', bottom: -5, right: -5, backgroundColor: theme.colors.primary, borderRadius: 12, padding: 4 }}>
                  <Settings2 size={12} color="white" {...({} as any)} />
                </View>
              </TouchableOpacity>
              <View style={styles.profileInfo}>
                <Text style={styles.orgName}>{institution?.name || 'Institution'}</Text>
                <Text style={styles.orgId}>Code: {institutionId}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{institution?.status || 'Active'}</Text>
                </View>
              </View>
            </View>

            {/* Editable Fields */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>General Information</Text>
              <View style={styles.card}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Institution Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Institution Name"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="admin@institution.edu"
                    keyboardType="email-address"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Contact Number</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+91 98765 43210"
                    keyboardType="phone-pad"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Academic Year</Text>
                  <TextInput
                    style={styles.input}
                    value={academicYear}
                    onChangeText={setAcademicYear}
                    placeholder="2026-27"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.fieldLabel}>Address</Text>
                    <TextInput
                      style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Full address"
                      multiline
                      placeholderTextColor={theme.colors.textMuted}
                    />
                </View>

                <View style={styles.divider} />
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>School Office Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={officePhone}
                    onChangeText={setOfficePhone}
                    placeholder="+91 00000 00000"
                    keyboardType="phone-pad"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={styles.divider} />
                <View style={[styles.fieldRow, { flexDirection: 'row', gap: 20 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Main Guard Deck</Text>
                    <TextInput
                      style={styles.input}
                      value={guardPhone}
                      onChangeText={setGuardPhone}
                      placeholder="+91 00000 00000"
                      keyboardType="phone-pad"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                  <View style={{ width: 1, backgroundColor: '#F1F5F9' }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Transport Dept</Text>
                    <TextInput
                      style={styles.input}
                      value={transportPhone}
                      onChangeText={setTransportPhone}
                      placeholder="+91 00000 00000"
                      keyboardType="phone-pad"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, (updateMutation.isPending || isUploading) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={updateMutation.isPending || isUploading}
            >
              {(updateMutation.isPending || isUploading) ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Save size={18} color="white" {...({} as any)} />
              )}
              <Text style={styles.saveBtnText}>{(updateMutation.isPending || isUploading) ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>

            {/* Academic Year Promotion */}
            <View style={[styles.section, { marginTop: 32 }]}>
              <Text style={styles.sectionTitle}>Academic Operations</Text>
              
              <View style={[styles.card, { padding: 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <View style={{ backgroundColor: '#F3E8FF', padding: 12, borderRadius: 12 }}>
                    <CalendarRange size={24} color="#9333EA" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.colors.text }}>Promote Academic Year</Text>
                    <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginTop: 2 }}>
                      Advance all students, staff, and classes to {calculateNextYear(academicYear)}
                    </Text>
                  </View>
                </View>

                {loadingPromotion ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : pendingPromotion ? (
                  <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color="#B45309" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#B45309', fontWeight: 'bold', fontSize: 13 }}>Promotion Request Pending</Text>
                      <Text style={{ color: '#D97706', fontSize: 12, marginTop: 2 }}>
                        Admin is reviewing your request to move to {pendingPromotion.to_year}.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={{ backgroundColor: '#9333EA', padding: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}
                    onPress={() => {
                      const nextYear = calculateNextYear(academicYear);
                      Alert.alert(
                        'Confirm Promotion Request',
                        `Are you sure you want to request moving from ${academicYear} to ${nextYear}? This will advance all students and archive previous records.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Request Promotion', 
                            style: 'default',
                            onPress: () => requestPromotionMutation.mutate({ fromYear: academicYear, toYear: nextYear })
                          }
                        ]
                      );
                    }}
                    disabled={requestPromotionMutation.isPending || !academicYear}
                  >
                    {requestPromotionMutation.isPending ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <ArrowUpRight size={18} color="white" />
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>Request Promotion to {calculateNextYear(academicYear)}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        )}

        {activeTab === 'notifications' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Preferences</Text>
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Push Notifications</Text>
                  <Text style={styles.switchDesc}>Receive instant alerts for critical events</Text>
                </View>
                <Switch
                  value={true}
                  trackColor={{ false: '#CBD5E1', true: theme.colors.primary + '50' }}
                  thumbColor={theme.colors.primary}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Leave Request Alerts</Text>
                  <Text style={styles.switchDesc}>Get notified when staff submits leave requests</Text>
                </View>
                <Switch
                  value={true}
                  trackColor={{ false: '#CBD5E1', true: theme.colors.primary + '50' }}
                  thumbColor={theme.colors.primary}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Attendance Summary</Text>
                  <Text style={styles.switchDesc}>Daily attendance summary at end of day</Text>
                </View>
                <Switch
                  value={false}
                  trackColor={{ false: '#CBD5E1', true: theme.colors.primary + '50' }}
                  thumbColor={'#CBD5E1'}
                />
              </View>
            </View>
          </View>
        )}

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <LogOut size={20} color="#EF4444" {...({} as any)} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 2.0.1 Stable</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: 'white', padding: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8FAFC' },
  activeTab: { backgroundColor: '#3B82F615' },
  tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  activeTabText: { color: theme.colors.primary, fontWeight: 'bold' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  profileImage: { width: 72, height: 72, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.colors.primary + '20' },
  profileInfo: { flex: 1, marginLeft: 16 },
  orgName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  orgId: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#10b98115', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginTop: 6 },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#10b981', textTransform: 'capitalize' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase', marginBottom: 12, marginLeft: 4, letterSpacing: 0.5 },
  card: { backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  fieldRow: { padding: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 6 },
  input: { fontSize: 15, color: theme.colors.text, padding: 0 },
  divider: { height: 1, backgroundColor: '#F1F5F9' },
  switchRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  switchDesc: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, padding: 16, borderRadius: 16, marginTop: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: 'bold', color: 'white' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#EF444410', padding: 16, borderRadius: 20, marginTop: 32 },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: '#EF4444' },
  version: { textAlign: 'center', fontSize: 12, color: theme.colors.textMuted, marginTop: 32 }
});
