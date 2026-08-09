import { Stack } from 'expo-router';

export default function MealsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="library" />
      <Stack.Screen name="create-meal" />
      <Stack.Screen name="shopping-list"/>
    </Stack>
  );
}