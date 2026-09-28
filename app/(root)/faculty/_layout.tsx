import { Stack } from 'expo-router';

export default function FacultyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="assignments" />
      <Stack.Screen name="courses" />
      <Stack.Screen name="exams" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="leave" />
      <Stack.Screen name="timetable" />
      <Stack.Screen name="directory" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="schedule" />
    </Stack>
  );
}
