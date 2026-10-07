import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  GraduationCap,
  Building,
  Building2,
  UserCheck,
  Clock,
  ClipboardList,
  FileText,
  Bell,
  Calendar,
  CalendarRange,
  TrendingUp,
  Settings,
  LogOut,
  MessageSquare,
  BarChart3,
  Megaphone,
  Activity,
  ShieldCheck,
  UserPlus,
  CreditCard,
  KeyRound,
  LucideIcon
} from 'lucide-react-native';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}

interface DesktopSidebarProps {
  role: 'institution' | 'admin';
}

const INSTITUTION_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/(root)/institution', icon: LayoutDashboard },
  { label: 'Admissions', href: '/(root)/institution/admissions', icon: UserPlus },
  { label: 'Promotions', href: '/(root)/institution/promotions', icon: CalendarRange },
  { label: 'Fee Management', href: '/(root)/institution/fees', icon: CreditCard },
  { label: 'Departments', href: '/(root)/institution/departments', icon: Briefcase },
  { label: 'Users Directory', href: '/(root)/institution/users', icon: Users },
  { label: 'Add User', href: '/(root)/institution/students/add', icon: GraduationCap },
  { label: 'Staff Management', href: '/(root)/institution/faculty', icon: Building },
  { label: 'Staff Assigning', href: '/(root)/institution/faculty/assign', icon: UserCheck },
  { label: 'Timetable', href: '/(root)/institution/timetable', icon: Clock },
  { label: 'Exams & Grades', href: '/(root)/institution/exams', icon: ClipboardList },
  { label: 'Leave Operations', href: '/(root)/institution/leaves', icon: FileText },
  { label: 'Communication', href: '/(root)/institution/communication', icon: Bell },
  { label: 'Events & Notices', href: '/(root)/institution/events', icon: Calendar },
  { label: 'Analytics', href: '/(root)/institution/analytics', icon: TrendingUp },
  { label: 'Reports', href: '/(root)/institution/reports', icon: FileText },
  { label: 'Settings', href: '/(root)/institution/settings', icon: Settings },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/(root)/admin', icon: LayoutDashboard },
  { label: 'Add Institution', href: '/(root)/admin/onboarding', icon: Building2 },
  { label: 'Institutions', href: '/(root)/admin/institutions', icon: Building },
  { label: 'Broadcast Comm', href: '/(root)/admin/communication', icon: MessageSquare },
  { label: 'Revenue & Reports', href: '/(root)/admin/revenue', icon: BarChart3 },
  { label: 'Ad Management', href: '/(root)/admin/ads', icon: Megaphone },
  { label: 'Promotions', href: '/(root)/admin/promotions', icon: CalendarRange },
  { label: 'User Management', href: '/(root)/admin/users', icon: Users },
  { label: 'Password Resets', href: '/(root)/admin/users?tab=reset_requests', icon: KeyRound },
  { label: 'System Logs', href: '/(root)/admin/logs', icon: Activity },
  { label: 'Network Status', href: '/(root)/admin/status', icon: ShieldCheck },
  { label: 'Settings & Config', href: '/(root)/admin/settings', icon: Settings },
];

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ role }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    signOut, 
    user, 
    role: userRole, 
    fullName, 
    imageUrl, 
    institutionName, 
    institutionLogo 
  } = useAuth();

  const [logoFailed, setLogoFailed] = React.useState(false);

  const items = React.useMemo(() => {
    if (role === 'admin') {
      if (userRole === 'ad_manager') {
        return [
          { label: 'Dashboard', href: '/(root)/admin', icon: LayoutDashboard },
          { label: 'Ad Management', href: '/(root)/admin/ads', icon: Megaphone },
          { label: 'Advertiser Leads', href: '/(root)/admin/ads/leads', icon: Users },
          { label: 'Broadcast Comm', href: '/(root)/admin/communication', icon: MessageSquare },
          { label: 'Settings & Config', href: '/(root)/admin/settings', icon: Settings },
        ];
      }
      if (userRole === 'finance_manager') {
        return [
          { label: 'Dashboard', href: '/(root)/admin', icon: LayoutDashboard },
          { label: 'Revenue & Reports', href: '/(root)/admin/revenue', icon: BarChart3 },
          { label: 'Institutions', href: '/(root)/admin/institutions', icon: Building },
          { label: 'Settings & Config', href: '/(root)/admin/settings', icon: Settings },
        ];
      }
      return ADMIN_NAV_ITEMS;
    }

    // Role is institution layout
    if (userRole === 'admission_officer' || userRole === 'admissions') {
      return [
        { label: 'Dashboard', href: '/(root)/institution', icon: LayoutDashboard },
        { label: 'Admissions', href: '/(root)/institution/admissions', icon: UserPlus },
        { label: 'Add Student/User', href: '/(root)/institution/students/add', icon: GraduationCap },
        { label: 'Promotions', href: '/(root)/institution/promotions', icon: CalendarRange },
        { label: 'Communication', href: '/(root)/institution/communication', icon: Bell },
        { label: 'Events & Notices', href: '/(root)/institution/events', icon: Calendar },
        { label: 'Settings', href: '/(root)/institution/settings', icon: Settings },
      ];
    }

    if (userRole === 'accountant' || userRole === 'finance') {
      return [
        { label: 'Dashboard', href: '/(root)/institution', icon: LayoutDashboard },
        { label: 'Fee Management', href: '/(root)/institution/fees', icon: CreditCard },
        { label: 'Reports', href: '/(root)/institution/reports', icon: FileText },
        { label: 'Analytics', href: '/(root)/institution/analytics', icon: TrendingUp },
        { label: 'Communication', href: '/(root)/institution/communication', icon: Bell },
        { label: 'Settings', href: '/(root)/institution/settings', icon: Settings },
      ];
    }

    if (userRole === 'reports_manager') {
      return [
        { label: 'Dashboard', href: '/(root)/institution', icon: LayoutDashboard },
        { label: 'Reports', href: '/(root)/institution/reports', icon: FileText },
        { label: 'Analytics', href: '/(root)/institution/analytics', icon: TrendingUp },
        { label: 'Exams & Grades', href: '/(root)/institution/exams', icon: ClipboardList },
        { label: 'Settings', href: '/(root)/institution/settings', icon: Settings },
      ];
    }

    return INSTITUTION_NAV_ITEMS;
  }, [role, userRole]);

  const isItemActive = (href: string) => {
    const baseHref = href.split('?')[0];
    if (href === '/(root)/admin' || href === '/(root)/institution') {
      return pathname === href || pathname === `${href}/` || pathname === `${href}/index`;
    }
    return pathname.startsWith(baseHref);
  };

  const effectiveLogo = institutionLogo;
  const isValidLogo = Boolean(
    effectiveLogo &&
    typeof effectiveLogo === 'string' &&
    (effectiveLogo.startsWith('http') || effectiveLogo.startsWith('data:')) &&
    !logoFailed
  );

  const homeHref = role === 'admin' ? '/(root)/admin' : '/(root)/institution';
  const settingsHref = role === 'admin' ? '/(root)/admin/settings' : '/(root)/institution/settings';

  return (
    <View style={styles.container}>
      {/* Brand / Logo Header - Always Official Vidyon Logo */}
      <TouchableOpacity 
        style={styles.header}
        onPress={() => router.push(homeHref as any)}
        activeOpacity={0.7}
      >
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Navigation Links */}
      <ScrollView 
        style={styles.navList} 
        contentContainerStyle={styles.navListContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeader}>MAIN NAVIGATION</Text>
        {items.map((item) => {
          const active = isItemActive(item.href);
          const Icon = item.icon;

          return (
            <TouchableOpacity
              key={item.href}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.href as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Icon
                  size={19}
                  color={active ? '#FFFFFF' : theme.colors.textMuted}
                  {...({} as any)}
                />
              </View>
              <Text style={[styles.navItemText, active && styles.navItemTextActive]}>
                {item.label}
              </Text>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer Profile & Logout - Clickable Profile */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.userRow}
          onPress={() => router.push(settingsHref as any)}
          activeOpacity={0.7}
        >
          {imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) ? (
            <Image source={{ uri: imageUrl }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(fullName?.[0] || user?.email?.[0] || role[0]).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {fullName || user?.email?.split('@')[0] || (role === 'admin' ? 'Admin' : 'Institution')}
            </Text>
            <Text style={styles.userSubtitle} numberOfLines={1}>
              {institutionName || userRole || role}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={signOut} 
          activeOpacity={0.7}
        >
          <LogOut size={16} color="#EF4444" {...({} as any)} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  customBrandLogo: {
    width: 130,
    height: 36,
  },
  logo: {
    width: 130,
    height: 36,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navList: {
    flex: 1,
  },
  navListContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: '#FAB75A18',
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#F1F5F9',
  },
  iconWrapActive: {
    backgroundColor: theme.colors.primary,
  },
  navItemText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#475569',
    flex: 1,
  },
  navItemTextActive: {
    color: '#1E293B',
    fontWeight: '700',
  },
  badge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 6,
    borderRadius: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  userSubtitle: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
});
