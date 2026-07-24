import { Stack } from 'expo-router';

export default function MeetingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create-commitment" />
      <Stack.Screen name="run" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="summary" />
    </Stack>
  );
}
