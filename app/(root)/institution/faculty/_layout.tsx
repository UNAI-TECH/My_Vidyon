import { Stack } from 'expo-router';

export default function FacultyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="assign" />
      <Stack.Screen name="leave-config" />
    </Stack>
  );
}
