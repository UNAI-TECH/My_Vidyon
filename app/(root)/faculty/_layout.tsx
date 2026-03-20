import { Stack } from 'expo-router';

export default function FacultyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="attendance/index" />
      <Stack.Screen name="assignments/index" />
      <Stack.Screen name="assignments/[id]" />
      <Stack.Screen name="courses/index" />
      <Stack.Screen name="exams/index" />
      <Stack.Screen name="exams/[id]" />
      <Stack.Screen name="announcements/index" />
      <Stack.Screen name="leave" />
      <Stack.Screen name="timetable/index" />
      <Stack.Screen name="timetable/edit" />
      <Stack.Screen name="directory/index" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="schedule" />
    </Stack>
  );
}
