import { Stack } from 'expo-router';

export default function FoundationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="mission-vision" />
      <Stack.Screen name="core-values" />
      <Stack.Screen name="constitution" />
      <Stack.Screen name="preview" />
    </Stack>
  );
}
