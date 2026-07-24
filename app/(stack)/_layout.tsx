import { Stack } from 'expo-router';

export default function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="create-event" />
      <Stack.Screen name="create-chore" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="notification-preference" />
      <Stack.Screen name="memory-details" />
      <Stack.Screen name="story-details" />
    </Stack>
  );
}
