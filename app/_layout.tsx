import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '@/lib/theme-provider';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import '@/global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const fontsLoaded = true;

  const { initialize, isAuthenticated, loading: authLoading } = useAuthStore();
  const { isCompleted: onboardingCompleted } = useOnboardingStore();
console.log('RootLayout', { isAuthenticated, onboardingCompleted, authLoading });
  useEffect(() => {
    initialize();
    console.log("INItialiazed")
  }, [initialize]);

  useEffect(() => {
    if (!authLoading) {
      SplashScreen.hideAsync();
    }
  }, [authLoading]);

  if (!fontsLoaded || authLoading) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          {!isAuthenticated ? (
            // Auth Stack
            <Stack.Screen name="(auth)" />
          // ) : !onboardingCompleted ? (
          //   // Onboarding Stack
          //   <Stack.Screen name="(onboarding)" />
          ) : (
            // Main App Stack
            <Stack.Screen name="(tabs)" />
          )}

          {/* OAuth Callback */}
          <Stack.Screen name="oauth/callback" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
