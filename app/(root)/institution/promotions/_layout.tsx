import { Stack } from 'expo-router';

export default function PromotionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="rules" />
      <Stack.Screen name="history" />
    </Stack>
  );
}
