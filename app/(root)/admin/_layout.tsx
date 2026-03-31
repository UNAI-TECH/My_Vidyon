import { Tabs, Redirect } from 'expo-router';
import { TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { theme } from '../../../src/theme';
import { LayoutDashboard, MessageSquare, Settings, LogOut, Building, BarChart3 } from 'lucide-react-native';
import { useAuth } from '../../../src/hooks/useAuth';
import { HeaderLogo } from '../../../src/components/common/HeaderLogo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminTabs() {
  const { signOut, role, loading } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Restrict access to admin only
  if (role !== 'admin' && role !== 'superadmin') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
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
        tabBarStyle: {
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
        name="institutions/index"
        options={{
          tabBarLabel: 'Institutions',
          tabBarIcon: ({ color }) => <Building size={22} color={color} {...({} as any)} />,
        }}
      />
      <Tabs.Screen
        name="communication"
        options={{
          tabBarLabel: 'Broadcast',
          tabBarIcon: ({ color }) => <MessageSquare size={22} color={color} {...({} as any)} />,
        }}
      />
      <Tabs.Screen
        name="revenue/index"
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({ color, focused }) => <BarChart3 size={22} color={color} {...({} as any)} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={22} color={color} {...({} as any)} />,
        }}
      />

      {/* Hidden Screens */}
      <Tabs.Screen name="users" options={{ href: null }} />
      <Tabs.Screen name="logs/index" options={{ href: null }} />
      <Tabs.Screen name="status/index" options={{ href: null }} />
      <Tabs.Screen name="onboarding/index" options={{ href: null }} />
      <Tabs.Screen name="promotions/index" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="ads/index" options={{ href: null }} />
    </Tabs>
  );
}
