import { Tabs, Redirect } from 'expo-router';
import { TouchableOpacity, View, ActivityIndicator, useWindowDimensions } from 'react-native';
import { theme } from '../../../src/theme';
import { LayoutDashboard, Settings, LogOut } from 'lucide-react-native';
import { useAuth } from '../../../src/hooks/useAuth';
import { HeaderLogo } from '../../../src/components/common/HeaderLogo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DesktopSidebar } from '../../../src/components/common/DesktopSidebar';

export default function AdminTabs() {
  const { signOut, role, loading, session } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  if (loading || (session && role === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Restrict access to admin only - only redirect if role is known and not admin
  if (role && role !== 'admin' && role !== 'superadmin') {
    return <Redirect href={`/(root)/${role}` as any} />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.colors.background }}>
      {isDesktop && <DesktopSidebar role="admin" />}
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
      <Tabs.Screen name="institutions" options={{ href: null }} />
      <Tabs.Screen name="communication" options={{ href: null }} />
      <Tabs.Screen name="revenue" options={{ href: null }} />
      <Tabs.Screen name="users" options={{ href: null }} />
      <Tabs.Screen name="logs" options={{ href: null }} />
      <Tabs.Screen name="status" options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="promotions" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="ads" options={{ href: null }} />
      <Tabs.Screen name="ads/leads" options={{ href: null }} />
    </Tabs>
      </View>
    </View>
  );
}
