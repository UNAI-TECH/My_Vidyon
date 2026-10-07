import { Stack } from 'expo-router';
import { ParentStudentsProvider } from '../../../src/hooks/useParentStudents';

export default function ParentLayout() {
  return (
    <ParentStudentsProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="fee-gateway" />
        <Stack.Screen name="fees" />
        <Stack.Screen name="academics" />
        <Stack.Screen name="leaves" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="safety" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="student" />
        <Stack.Screen name="children/[studentId]" />
        <Stack.Screen name="bus-tracking" />
      </Stack>
    </ParentStudentsProvider>
  );
}
