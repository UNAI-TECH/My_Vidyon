import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '../../src/theme';

export default function RootLayout() {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="student" />
      <Stack.Screen name="faculty" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="institution" />
      <Stack.Screen name="accountant" />
      <Stack.Screen name="parent" />
      <Stack.Screen name="canteen" />
    </Stack>
  );
}
