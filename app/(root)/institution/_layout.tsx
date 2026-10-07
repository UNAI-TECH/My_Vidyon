import { Tabs, Redirect } from 'expo-router';
import { TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { theme } from '../../../src/theme';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react-native';
import { useAuth } from '../../../src/hooks/useAuth';
import { HeaderLogo } from '../../../src/components/common/HeaderLogo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DesktopSidebar } from '../../../src/components/common/DesktopSidebar';

export default function InstitutionTabs() {
  const { signOut, role } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Role Guard: non-institution users get redirected to their proper dashboard
  const allowedInstitutionRoles = [
    'institution',
    'admin',
    'superadmin',
    'admission_officer',
    'admissions',
    'reports_manager',
    'accountant',
    'finance',
  ];
  if (role && !allowedInstitutionRoles.includes(role)) {
    return <Redirect href={`/(root)/${role}` as any} />;
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.colors.background }}>
      {isDesktop && <DesktopSidebar role="institution" />}
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: !isDesktop,
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text,
            headerLeft: () => <HeaderLogo />,
            headerTitle: "",
            headerShadowVisible: false,
            headerTitleAlign: 'center',
            headerRight: () => (
              <TouchableOpacity 
                onPress={signOut} 
                style={{ marginRight: 10, padding: 8 }}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <LogOut size={20} color={theme.colors.text} {...({} as any)} />
              </TouchableOpacity>
            ),
            tabBarStyle: isDesktop
              ? { display: 'none' }
              : {
                  backgroundColor: theme.colors.background,
                  borderTopColor: theme.colors.glassBorder,
                  elevation: 0, shadowOpacity: 0,
                  height: 60 + insets.bottom, 
                  paddingBottom: 10 + Math.max(0, insets.bottom - 10),
                },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textMuted,
          }}
        >
      {/* Visible Bottom Nav Tabs — Only Dashboard + Settings */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} {...({} as any)} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={22} color={color} {...({} as any)} />,
        }}
      />

      {/* Hidden Screens — Accessible via dashboard shortcuts, not in bottom nav */}
      <Tabs.Screen name="faculty" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="faculty/assign" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="reports" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="org" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="leaves" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="analytics" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="departments" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="exams" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="users" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="students" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="students/add" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="timetable" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="timetable/edit" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="timetable/special" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="communication" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="notifications" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="events" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="admissions" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="fees" options={{ href: null, headerTitle: "" }} />
      <Tabs.Screen name="promotions" options={{ href: null, headerTitle: "" }} />
    </Tabs>
      </View>
    </View>
  );
}
