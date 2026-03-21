import { Stack } from 'expo-router';
import { LogBox } from 'react-native';

// Suppress the Expo Go push notification removal warning for Android SDK 53+
LogBox.ignoreLogs(['expo-notifications: Android Push notifications', 'remote notifications functionality provided by expo-notifications was removed from Expo Go']);
import { theme } from '../src/theme';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebSocketProvider } from '../src/hooks/useWebSocket';
import { SearchProvider } from '../src/hooks/useSearch';
import { useERPRealtime } from '../src/hooks/useERPRealtime';

const queryClient = new QueryClient();

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { registerForPushNotificationsAsync, setupNotificationListeners } from '../src/utils/notifications';
import { useEffect } from 'react';

function RealtimeObserver({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  useERPRealtime();

  useEffect(() => {
    if (user?.id) {
      // Register for push notifications
      registerForPushNotificationsAsync(user.id);

      // Setup listeners
      const { notificationListener, responseListener } = setupNotificationListeners();

      return () => {
        notificationListener.remove();
        responseListener.remove();
      };
    }
  }, [user?.id]);

  return <>{children}</>;
}

export default function AppLayout() {
  console.log("ROOT LAYOUT BOOTING WITH STACK");
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RealtimeObserver>
            <WebSocketProvider>
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
            </WebSocketProvider>
          </RealtimeObserver>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
