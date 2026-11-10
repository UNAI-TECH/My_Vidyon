import { Tabs, Redirect } from 'expo-router';
import { TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { theme } from '../../../src/theme';
import { LayoutDashboard, LogOut } from 'lucide-react-native';
import { useAuth } from '../../../src/hooks/useAuth';
import { HeaderLogo } from '../../../src/components/common/HeaderLogo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DesktopSidebar } from '../../../src/components/common/DesktopSidebar';
import { ProfileTabIcon, ProfileTabBarButton } from '../../../src/components/common/ProfileTabComponents';

export default function AccountantTabs() {
  const { signOut, role } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Role guard: Redirect non-accountant users away from accountant section
  if (role && role !== 'accountant' && role !== 'finance') {
    if (role === 'admin' || role === 'superadmin' || role === 'ad_manager' || role === 'finance_manager') {
      return <Redirect href="/(root)/admin" />;
    }
    if (
      role === 'institution' || 
      role === 'institution_stakeholder' || 
      role === 'admission_officer' || 
      role === 'admissions' || 
      role === 'reports_manager'
    ) {
      return <Redirect href="/(root)/institution" />;
    }
    return <Redirect href={`/(root)/${role}` as any} />;
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.colors.background }}>
      {isDesktop && <DesktopSidebar role="accountant" />}
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
              tabBarLabel: 'Profile',
              tabBarIcon: ({ color, focused }) => <ProfileTabIcon color={color} focused={focused} />,
              tabBarButton: (props) => <ProfileTabBarButton {...props} />,
            }}
          />

          {/* Hidden Screens */}
          <Tabs.Screen name="fees" options={{ href: null }} />
          <Tabs.Screen name="quick-bills" options={{ href: null }} />
          <Tabs.Screen name="reports" options={{ href: null }} />
          <Tabs.Screen name="transactions" options={{ href: null }} />
          <Tabs.Screen name="notifications" options={{ href: null }} />
        </Tabs>
      </View>
    </View>
  );
}
