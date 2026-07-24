import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useColors } from '@/hooks/use-colors';
import {Ionicons} from '@expo/vector-icons';


export function NotificationBell() {
  const router = useRouter();
  const colors = useColors();
  const unreadCount = useNotificationStore((s) => s.unreadCount());

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View className="relative">
        {/* Bell icon */}
        <Ionicons name="notifications-circle-sharp" size={35} color="#fff" />
        {/* Unread badge */}
        {unreadCount > 0 && (
          <View
            className="absolute -top-1 -right-1 rounded-full items-center justify-center"
            style={{
              backgroundColor: colors.primary,
              minWidth: 16,
              height: 16,
              paddingHorizontal: 3,
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 9,
                fontWeight: '700',
                lineHeight: 12,
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}