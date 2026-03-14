import { Stack } from 'expo-router';
import { theme } from '../src/theme';
import { AuthProvider } from '../src/hooks/useAuth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebSocketProvider } from '../src/hooks/useWebSocket';
import { SearchProvider } from '../src/hooks/useSearch';
import { useERPRealtime } from '../src/hooks/useERPRealtime';

const queryClient = new QueryClient();

import { SafeAreaProvider } from 'react-native-safe-area-context';

function RealtimeObserver({ children }: { children: React.ReactNode }) {
  useERPRealtime();
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
