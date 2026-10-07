import { Stack } from 'expo-router';

export default function FeesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="structures/index" />
      <Stack.Screen name="structures/add" />
      <Stack.Screen name="assign" />
      <Stack.Screen name="collection" />
      <Stack.Screen name="concessions" />
    </Stack>
  );
}
