import { Stack, useRouter } from 'expo-router';
import { LogBox } from 'react-native';

// Suppress the Expo Go push notification removal warning for Android SDK 53+
LogBox.ignoreLogs(['expo-notifications: Android Push notifications', 'remote notifications functionality provided by expo-notifications was removed from Expo Go']);
import { theme } from '../src/theme';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { RBACProvider } from '../src/context/RBACContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebSocketProvider } from '../src/hooks/useWebSocket';
import { SearchProvider } from '../src/hooks/useSearch';
import { useERPRealtime } from '../src/hooks/useERPRealtime';
import { ThemedAlertProvider } from '../src/components/common/ThemedAlert';

const queryClient = new QueryClient();

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { registerForPushNotificationsAsync, setupNotificationListeners, setupAndroidNotificationChannel } from '../src/utils/notifications';
import { useEffect } from 'react';

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

export default function AppLayout() {
  console.log("ROOT LAYOUT BOOTING WITH STACK");

  // Ensure the Android notification channel exists at every app boot,
  // independent of auth state — required for background push delivery.
  useEffect(() => {
    setupAndroidNotificationChannel();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RBACProvider>
            <RealtimeObserver>
              <WebSocketProvider>
                <ThemedAlertProvider>
                  <SearchProvider>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: theme.colors.background },
                      }}
                    >
                      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                      <Stack.Screen name="(root)" options={{ animation: 'slide_from_right' }} />
                    </Stack>
                  </SearchProvider>
                </ThemedAlertProvider>
              </WebSocketProvider>
            </RealtimeObserver>
          </RBACProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
