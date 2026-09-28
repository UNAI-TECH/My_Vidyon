import { Tabs } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { theme } from '../../../src/theme';
import { Home, Settings, LogOut } from 'lucide-react-native';
import { useAuth } from '../../../src/hooks/useAuth';
import { HeaderLogo } from '../../../src/components/common/HeaderLogo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StudentTabs() {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

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
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Home size={22} color={color} {...({} as any)} />,
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
      <Tabs.Screen name="academic" options={{ href: null }} />
      <Tabs.Screen name="ai-tutor" options={{ href: null }} />
      <Tabs.Screen name="fees" options={{ href: null }} />
      <Tabs.Screen name="notices" options={{ href: null }} />
      <Tabs.Screen name="assignments" options={{ href: null }} />
      <Tabs.Screen name="assignments/[id]" options={{ href: null }} />
      <Tabs.Screen name="attendance" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
      <Tabs.Screen name="courses" options={{ href: null }} />
      <Tabs.Screen name="grades" options={{ href: null }} />
      <Tabs.Screen name="timetable" options={{ href: null }} />
      <Tabs.Screen name="exams" options={{ href: null }} />
      <Tabs.Screen name="certificates" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="leave" options={{ href: null }} />
    </Tabs>
  );
}
