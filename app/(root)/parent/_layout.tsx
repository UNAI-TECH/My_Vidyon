import { Stack } from 'expo-router';

export default function ParentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="fee-gateway" />
      <Stack.Screen name="leaves/index" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="safety/index" />
      <Stack.Screen name="stats/index" />
      <Stack.Screen name="student/[id]" />
    </Stack>
  );
}
