import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../../theme';
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  CreditCard, 
  LogOut, 
  ShieldCheck,
  Globe,
  MapPin,
  Users,
  Briefcase,
  Store,
  Info
} from 'lucide-react-native';

export const ProfileSettings = () => {
  const { user, signOut, role, institutionId, fullName: authFullName, imageUrl: authImageUrl } = useAuth();

  // Fetch Full Profile Details
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id as string)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  // Fetch Role-Specific Details
  const { data: roleData, isLoading: isRoleLoading } = useQuery({
    queryKey: ['user-role-data', user?.id, role],
    queryFn: async () => {
      if (!user?.id) return null;

      if (role === 'student') {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        return data;
      }

      if (role === 'faculty') {
        // Faculty data is primarily in profiles (department etc), 
        // but we might want to check if there's a specific faculty table if needed.
        // For now, profiles has everything for faculty.
        return profile;
      }

      if (role === 'parent') {
        // Parent might have linked children
        const { data: children } = await supabase
          .from('students')
          .select('name, register_number, class_name, section')
          .eq('parent_id', user.id);
        return { children };
      }

      return null;
    },
    enabled: !!user?.id && !!profile,
  });

  // Fetch Institution Details
  const { data: institution, isLoading: isInstLoading } = useQuery({
    queryKey: ['user-institution', institutionId],
    queryFn: async () => {
      if (!institutionId) return null;
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .eq('institution_id', institutionId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!institutionId,
  });

  const isLoading = isProfileLoading || isRoleLoading || isInstLoading;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const InfoRow = ({ icon: Icon, label, value, color = theme.colors.textMuted }: any) => (
    <View style={styles.infoRow}>
      <View style={[styles.iconBox, { backgroundColor: color + '10' }]}>
        <Icon size={18} color={color} {...({} as any)} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value || 'N/A'}</Text>
      </View>
    </View>
  );

  const getRoleIcon = () => {
    switch (role) {
      case 'student': return User;
      case 'faculty': return Briefcase;
      case 'parent': return Users;
      case 'canteen': return Store;
      case 'institution': return Building;
      case 'admin': return ShieldCheck;
      default: return User;
    }
  };

  const RoleIcon = getRoleIcon();

  // Use Auth context as primary source for avatar and name
  const displayName = authFullName || profile?.full_name || 'User';
  const displayAvatar = authImageUrl || profile?.image_url || (role === 'student' ? roleData?.image_url : null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {displayAvatar ? (
            <Image 
              source={{ uri: displayAvatar }} 
              style={styles.avatar} 
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <RoleIcon size={40} color={theme.colors.primary} {...({} as any)} />
            </View>
          )}
        </View>
        <Text style={styles.userName}>{displayName}</Text>
        <View style={[styles.roleBadge, { backgroundColor: theme.colors.primary }]}>
          <ShieldCheck size={12} color="white" style={{ marginRight: 4 }} {...({} as any)} />
          <Text style={styles.roleText}>{role?.toUpperCase()} PROFILE</Text>
        </View>
        <Text style={styles.readOnlyNote}>Read-only official record</Text>
      </View>

      {/* Account Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.card}>
          <InfoRow icon={Mail} label="Email Address" value={profile?.email} color="#3B82F6" />
          <InfoRow icon={Phone} label="Phone Number" value={profile?.phone} color="#10B981" />
          
          {role === 'student' && roleData && (
            <>
              <InfoRow icon={CreditCard} label="Register Number" value={roleData.register_number} color="#F59E0B" />
              <InfoRow icon={User} label="Class & Section" value={`${roleData.class_name || ''} - ${roleData.section || ''}`} color="#6366F1" />
            </>
          )}

          {role === 'faculty' && (
            <>
              <InfoRow icon={Building} label="Department" value={profile?.department} color="#8B5CF6" />
              <InfoRow icon={Briefcase} label="Designation" value={profile?.designation || 'Faculty Member'} color="#EC4899" />
            </>
          )}

          {role === 'parent' && roleData?.children && roleData.children.length > 0 && (
            <View style={styles.childList}>
              <Text style={styles.subTitle}>Linked Children</Text>
              {roleData.children.map((child: any, idx: number) => (
                <View key={idx} style={styles.childItem}>
                  <User size={16} color={theme.colors.primary} {...({} as any)} />
                  <Text style={styles.childText}>{child.name} ({child.class_name}-{child.section})</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Institution Information */}
      {institution && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Institution Details</Text>
          <View style={styles.card}>
            <View style={styles.instHeader}>
              {institution.logo_url && (
                <Image source={{ uri: institution.logo_url }} style={styles.instLogo} />
              )}
              <View>
                <Text style={styles.instName}>{institution.name}</Text>
                <Text style={styles.instType}>Educational Partner</Text>
              </View>
            </View>
            <View style={{ marginTop: 16 }}>
              <InfoRow icon={Building} label="Office Address" value={institution.address} color="#64748B" />
              <InfoRow icon={Globe} label="Website" value={institution.website} color="#0EA5E9" />
              <InfoRow icon={MapPin} label="Region" value={institution.state || 'N/A'} color="#F43F5E" />
            </View>
          </View>
        </View>
      )}

      {/* Warning/Read-Only Notice */}
      <View style={styles.noticeCard}>
        <Info size={16} color={theme.colors.primary} style={{ marginRight: 8 }} {...({} as any)} />
        <Text style={styles.noticeText}>
          Some profile details are managed by your institution administrator and cannot be modified directly.
        </Text>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <LogOut size={20} color="#EF4444" style={{ marginRight: 8 }} {...({} as any)} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.footerNote}>
        MY VIDYON ERP v2.0.0
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeader: { alignItems: 'center', marginBottom: 32 },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    padding: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 16
  },
  avatar: { width: '100%', height: '100%', borderRadius: 46 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 46, backgroundColor: theme.colors.primary + '10', justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 22, fontWeight: 'bold', color: theme.colors.text, marginBottom: 8 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 4 },
  roleText: { color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  readOnlyNote: { fontSize: 10, color: theme.colors.textMuted, fontWeight: '600', textTransform: 'uppercase', opacity: 0.6 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoText: { flex: 1 },
  label: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 2 },
  value: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  subTitle: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted, marginTop: 8, marginBottom: 8, textTransform: 'uppercase' },
  childList: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  childItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8 },
  childText: { fontSize: 13, color: theme.colors.text, marginLeft: 8, fontWeight: '500' },
  instHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 16 },
  instLogo: { width: 40, height: 40, borderRadius: 10, marginRight: 12 },
  instName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
  instType: { fontSize: 12, color: theme.colors.textMuted },
  noticeCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.colors.primary + '05', 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20'
  },
  noticeText: { flex: 1, fontSize: 12, color: theme.colors.textMuted, lineHeight: 18 },
  signOutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#FEF2F2', 
    padding: 16, 
    borderRadius: 20,
    marginTop: 8
  },
  signOutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
  footerNote: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 10, marginTop: 24, paddingHorizontal: 40 }
});
