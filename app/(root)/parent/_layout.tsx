import { Stack } from 'expo-router';

export default function ParentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="fee-gateway" />
      <Stack.Screen name="leaves" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="safety" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="student" />
    </Stack>
  );
}
