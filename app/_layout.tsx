import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { LogBox, View, Platform, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

// Suppress the Expo Go push notification removal warning for Android SDK 53+
LogBox.ignoreLogs(['expo-notifications: Android Push notifications', 'remote notifications functionality provided by expo-notifications was removed from Expo Go']);
import { theme } from '../src/theme';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebSocketProvider } from '../src/hooks/useWebSocket';
import { SearchProvider } from '../src/hooks/useSearch';
import { useERPRealtime } from '../src/hooks/useERPRealtime';
import { ThemedAlertProvider } from '../src/components/common/ThemedAlert';

const queryClient = new QueryClient();

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { registerForPushNotificationsAsync, setupNotificationListeners } from '../src/utils/notifications';
import { useEffect, useState } from 'react';

function RealtimeObserver({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  useERPRealtime();

  useEffect(() => {
    if (user?.id) {
      // Register for push notifications
      registerForPushNotificationsAsync(user.id);

      // Setup listeners
      const { notificationListener, responseListener } = setupNotificationListeners((data: any) => {
        console.log('Notification Clicked: Redirection Logged', data);
        
        // Handle explicit timetable redirection for SDK consistency
        if (data?.type === 'timetable') {
           router.push('/student/timetable');
        } else if (data?.action_url) {
           router.push(data.action_url);
        }
      });

      return () => {
        notificationListener.remove();
        responseListener.remove();
      };
    }
  }, [user?.id, router]);

  return <>{children}</>;
}

import { StatusBar } from 'expo-status-bar';
import { useWindowDimensions } from 'react-native';
import { House, Settings, Bell, LogOut, ChevronRight, ChevronLeft, Building, Users, Calendar, BarChart3, Database, MessageSquare, PlusCircle, Megaphone, Receipt, IndianRupee, FileText } from 'lucide-react-native';

function DesktopSidebar() {
  const { user, role, fullName, imageUrl, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAuthGroup = segments[0] === '(auth)';

  // Hide if strictly at the index route (login splash) or auth
  if (width < 1024 || !user || !role || isAuthGroup || pathname === '/') return null;

  const NavItem = ({ label, icon: Icon, href }: any) => {
    const isActive = pathname === href || pathname.startsWith(href + '/');
    return (
      <TouchableOpacity 
        style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          padding: 16, 
          borderRadius: 12, 
          marginBottom: 8,
          backgroundColor: isActive ? theme.colors.primary + '10' : 'transparent'
        }}
        activeOpacity={0.7}
        onPress={() => router.push(href)}
      >
        <View style={{ marginRight: isCollapsed ? 0 : 12 }}>
          <Icon size={20} color={isActive ? theme.colors.primary : theme.colors.textMuted} />
        </View>
        {!isCollapsed && (
          <>
            <Text style={{ fontSize: 15, fontWeight: isActive ? '700' : '600', color: isActive ? theme.colors.primary : theme.colors.text }}>{label}</Text>
            <View style={{ flex: 1 }} />
            <ChevronRight size={16} color={theme.colors.textMuted} opacity={0.3} />
          </>
        )}
      </TouchableOpacity>
    );
  };

  // Dynamic role-based prefix for routing root
  const rolePrefix = role && role.includes('admin') ? '/(root)/admin' : 
                     role === 'canteen_manager' || role === 'canteen' ? '/(root)/canteen' : 
                     `/(root)/${role}`;

  const renderRoleLinks = () => {
    if (role === 'admin' || role === 'superadmin') {
      return (
        <>
          <NavItem label="Institutions" icon={Building} href="/(root)/admin/institutions" />
          <NavItem label="Broadcast" icon={MessageSquare} href="/(root)/admin/communication" />
          <NavItem label="Analytics" icon={BarChart3} href="/(root)/admin/revenue" />
        </>
      );
    }
    // Institution and Accountant role bottom nav bars only have Dashboard and Settings natively. 
    // Students, faculty layout bottom tabs etc can be added here if needed, but for now we fallback.
    return null;
  };

  return (
    <View style={{ width: isCollapsed ? 84 : 280, backgroundColor: 'white', borderRightWidth: 1, borderRightColor: '#F1F5F9', paddingHorizontal: isCollapsed ? 12 : 24, paddingVertical: 24, overflow: 'hidden' }}>
      <View style={{ flexDirection: isCollapsed ? 'column' : 'row', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', marginBottom: 32, gap: isCollapsed ? 16 : 0, overflow: 'visible' }}>
        {!isCollapsed ? (
          <View style={{ width: 120, height: 40, justifyContent: 'center' }}>
             <Image source={require('../assets/logo.png')} style={{ width: 120, height: 40, resizeMode: 'contain', transform: [{ scale: 1.65 }], marginLeft: 8 }} />
          </View>
        ) : (
          <Image source={require('../assets/icon.png')} style={{ width: 36, height: 36, resizeMode: 'contain' }} />
        )}
        <TouchableOpacity 
          onPress={() => setIsCollapsed(!isCollapsed)}
          style={{ padding: 4, borderRadius: 8, backgroundColor: '#F8FAFC' }}
        >
          {isCollapsed ? <ChevronRight size={18} color={theme.colors.textMuted} /> : <ChevronLeft size={18} color={theme.colors.textMuted} />}
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <NavItem label="Dashboard" icon={House} href={role ? rolePrefix : '/'} />
        {renderRoleLinks()}
        <NavItem label="Notifications" icon={Bell} href={role ? `${rolePrefix}/notifications` : '/notifications'} />
        {role !== 'student' && role !== 'parent' && <NavItem label="Settings" icon={Settings} href={role ? `${rolePrefix}/settings` : '/settings'} />}
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 20, alignItems: isCollapsed ? 'center' : 'flex-start' }}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
            onPress={signOut}
          >
              <View style={{ backgroundColor: theme.colors.primary + '15', padding: 10, borderRadius: 10, marginRight: isCollapsed ? 0 : 12 }}>
                  <LogOut size={18} color={theme.colors.primary} />
              </View>
              {!isCollapsed && (
                <View>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.colors.text }}>Sign Out</Text>
                    <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>{fullName}</Text>
                </View>
              )}
          </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const { width } = useWindowDimensions();
  console.log("ROOT LAYOUT BOOTING WITH STACK", width);
  
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RealtimeObserver>
            <WebSocketProvider>
              <ThemedAlertProvider>
                <SearchProvider>
                  <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.colors.background }}>
                    <DesktopSidebar />
                    
                    <View style={StyleSheet.flatten([{ 
                          flex: 1, 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          backgroundColor: theme.colors.background 
                    }])}>
                      <View style={StyleSheet.flatten([
                        {
                          width: '100%',
                          maxWidth: width > 1024 ? 1200 : 500,
                          height: '100%',
                          backgroundColor: theme.colors.background,
                        },
                        Platform.select({
                          web: {},
                          default: {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: width > 1024 ? 0 : 0.05,
                            shadowRadius: 10,
                          }
                        })
                      ])}>
                        <Stack
                          screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: theme.colors.background },
                          }}
                        >
                          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                          <Stack.Screen name="(root)" options={{ animation: 'slide_from_right' }} />
                        </Stack>
                      </View>
                    </View>
                  </View>
                </SearchProvider>
              </ThemedAlertProvider>
            </WebSocketProvider>
          </RealtimeObserver>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
