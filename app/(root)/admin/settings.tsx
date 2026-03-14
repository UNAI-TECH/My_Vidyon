import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Alert } from 'react-native';
import { theme } from '../../../src/theme';
import { PageHeader } from '../../../src/components/common/PageHeader';
import { 
  User, 
  Shield, 
  Bell, 
  Globe, 
  HelpCircle, 
  LogOut, 
  ChevronRight,
  Database,
  Smartphone,
  Info
} from 'lucide-react-native';
import { useAuth } from '../../../src/hooks/useAuth';

export default function AdminSettings() {
  const { user, signOut } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: signOut }
      ]
    );
  };

  const SettingItem = ({ icon: Icon, title, subtitle, value, type = 'chevron', onPress, color = theme.colors.text }: any) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color + '10' }]}>
        <Icon size={20} color={color} {...({} as any)} />
      </View>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {type === 'chevron' && <ChevronRight size={18} color={theme.colors.textMuted} {...({} as any)} />}
      {type === 'switch' && (
        <Switch 
          value={value} 
          onValueChange={onPress}
          trackColor={{ false: '#CBD5E1', true: theme.colors.primary + '80' }}
          thumbColor={value ? theme.colors.primary : '#F8FAFC'}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <PageHeader title="Settings" subtitle="Global platform configuration & profile" />

      {/* Profile Section */}
      <View style={styles.profileCard}>
        <View style={styles.profileInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{(user?.user_metadata?.full_name || user?.email || 'A').charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{user?.user_metadata?.full_name || 'Super Admin'}</Text>
            <Text style={styles.profileRole}>{user?.email || 'Global Platform Administrator'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editProfileBtn}>
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Platform Management</Text>
      <View style={styles.settingsGroup}>
        <SettingItem 
          icon={Shield} 
          title="Maintenance Mode" 
          subtitle="Temporarily disable access for all users"
          type="switch"
          value={maintenanceMode}
          onPress={() => setMaintenanceMode(!maintenanceMode)}
          color="#F59E0B"
        />
        <SettingItem 
          icon={Database} 
          title="Backup & Export" 
          subtitle="Download global network data logs"
          color="#3B82F6"
        />
        <SettingItem 
          icon={Bell} 
          title="System Notifications" 
          subtitle="Alerts for server health and errors"
          type="switch"
          value={pushNotifications}
          onPress={() => setPushNotifications(!pushNotifications)}
          color="#10B981"
        />
      </View>

      <Text style={styles.sectionHeader}>Security & Apps</Text>
      <View style={styles.settingsGroup}>
        <SettingItem 
          icon={Smartphone} 
          title="Connected Apps" 
          subtitle="Manage mobile and tablet device access"
          color="#A855F7"
        />
        <SettingItem 
          icon={Globe} 
          title="Domain Whitelist" 
          subtitle="Configure allowed institution domains"
          color="#6366F1"
        />
      </View>

      <Text style={styles.sectionHeader}>Support</Text>
      <View style={styles.settingsGroup}>
        <SettingItem icon={HelpCircle} title="Help Center" color="#64748B" />
        <SettingItem icon={Info} title="About My-Vidyon SaaS" subtitle="Version 4.2.0-stable" color="#64748B" />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
        <LogOut size={20} color="#EF4444" {...({} as any)} />
        <Text style={styles.logoutText}>Sign Out from Network</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>© 2026 UNAI Tech. All rights reserved.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24, paddingBottom: 40 },
  profileCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  profileName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
  profileRole: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },
  editProfileBtn: { backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  editProfileText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
  sectionHeader: { fontSize: 12, fontWeight: 'bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  settingsGroup: { backgroundColor: 'white', borderRadius: 24, paddingVertical: 8, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  settingText: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  settingSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18, backgroundColor: '#FEF2F2', borderRadius: 20, marginTop: 8 },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: '#EF4444' },
  footerText: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 11, marginTop: 32 },
});
