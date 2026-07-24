
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/_core/supabase';
import { useAuthStore } from '@/lib/stores/auth-store';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowList: true
  }),
});

export function usePushNotifications() {
  const router = useRouter();
  const { user } = useAuthStore();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!user) return;

    registerForPushNotifications(user.id);

    // Handle notifications received while app is in foreground (show in-app only — no additional logic needed)
    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {
      // The notification center is updated via Supabase Realtime — nothing extra needed here
    });

    // Handle tap on push notification — route to the relevant screen
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionRoute = response.notification.request.content.data?.action_route as string | undefined;
      if (actionRoute) {
        router.push(actionRoute as any);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user?.id]);
}

async function registerForPushNotifications(userId: string) {
  if (!Device.isDevice) {
    console.log('[push] Skipping push registration — not a physical device');
    return;
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[push] Push notification permission denied');
    return;
  }

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'FamilyOS Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F59E0B',
    });
  }

  // Get token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  const token = tokenData.data;

  // Save token to Supabase user metadata so the Edge Function can find it
  const { error } = await supabase.auth.updateUser({
    data: { expo_push_token: token },
  });

  if (error) {
    console.error('[push] Failed to save push token:', error.message);
  } else {
    console.log('[push] Push token registered:', token);
  }
}