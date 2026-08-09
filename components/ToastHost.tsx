import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore, ToastItem } from '@/lib/stores/toast-store';
import { useColors } from '@/hooks/use-colors';

function ToastCard({ toast }: { toast: ToastItem }) {
  const router = useRouter();
  const colors = useColors();
  const { dismissToast } = useToastStore();
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
  }, []);

  const iconFor = (variant: ToastItem['variant']) => {
    if (variant === 'assigned') return { name: 'person-add' as const, color: colors.primary };
    if (variant === 'success') return { name: 'checkmark-circle' as const, color: '#22C55E' };
    return { name: 'notifications' as const, color: colors.primary };
  };

  const icon = iconFor(toast.variant);

  return (
    <Animated.View style={{ transform: [{ translateY }] }} className="mb-2 px-4">
      <Pressable
        onPress={() => {
          dismissToast(toast.id);
          if (toast.actionRoute) router.push(toast.actionRoute as any);
        }}
        className="flex-row items-center rounded-2xl border border-border bg-surface p-3.5 shadow-lg"
      >
        <View className="mr-3 h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: icon.color + '18' }}>
          <Ionicons name={icon.name} size={18} color={icon.color} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-foreground">{toast.title}</Text>
          {toast.body ? <Text className="mt-0.5 text-xs text-muted" numberOfLines={2}>{toast.body}</Text> : null}
        </View>
        <Pressable onPress={() => dismissToast(toast.id)} hitSlop={8} className="ml-2">
          <Ionicons name="close" size={16} color={colors.muted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export function ToastHost() {
  const { toasts } = useToastStore();
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: insets.top + (Platform.OS === 'ios' ? 4 : 12), left: 0, right: 0, zIndex: 999 }}
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </View>
  );
}