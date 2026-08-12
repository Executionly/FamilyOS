import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '@/lib/theme-provider';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import '@/global.css';
import { usePushNotifications } from '@/hooks/use-push-notification';
import { useFonts, SpaceGrotesk_700Bold, SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { ToastHost } from '@/components/ToastHost';
import { BriefingModal } from '@/components/briefing-modal';
import { StatusBar } from 'expo-status-bar';


SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  usePushNotifications()
    const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold, SpaceGrotesk_500Medium,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
      });
    }
  }, [fontsLoaded]);


  if (!fontsLoaded) {
    return null;
  }
  return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <StatusBar style='dark'/>
          <ToastHost />
          <BriefingModal />
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="get-started" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(stack)" />
          </Stack>
        </ThemeProvider>
      </GestureHandlerRootView>
  );
}
