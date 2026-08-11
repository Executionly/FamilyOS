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
      <Stack.Screen name="calendar" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="notification-preference" />
      <Stack.Screen name="memory-details" />
      <Stack.Screen name="story-details" />
      <Stack.Screen name="member-list" />
      <Stack.Screen name="add-member" />
      <Stack.Screen name="meal" />
      <Stack.Screen name="chores" />
      <Stack.Screen name="group-chat" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="account-settings" />
      <Stack.Screen name="update-profile" />
      <Stack.Screen name="family-settings" />
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="terms-of-service" />
      <Stack.Screen name="dm" />
      <Stack.Screen name="dm-list" />
      <Stack.Screen name="paywall" />
    </Stack>
  );
}
