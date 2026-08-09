import { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useDmStore } from '@/lib/stores/dm-store';

export function FamilyChatFab() {
  const router = useRouter();
  const colors = useColors();
  const [menuOpen, setMenuOpen] = useState(false);
  const { conversations } = useDmStore();

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [conversations]
  );

  return (
    <>
      <Pressable
        onPress={() => setMenuOpen(true)}
        className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
      >
        <Ionicons name="sparkles" size={24} color="#fff" />
        {totalUnread > 0 && (
          <View className="absolute -top-1 -right-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 border-2 border-background">
            <Text className="text-[10px] font-bold text-white">
              {totalUnread > 9 ? '9+' : totalUnread}
            </Text>
          </View>
        )}
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setMenuOpen(false)}>
          <Pressable className="mx-4 mb-28 rounded-2xl bg-background p-2" onPress={(e) => e.stopPropagation()}>
            <Pressable
              onPress={() => { setMenuOpen(false); router.push('/family-chat'); }}
              className="flex-row items-center gap-3 rounded-xl p-3.5"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Ionicons name="sparkles" size={20} color={colors.primary} />
              </View>
              <View>
                <Text className="text-sm font-bold text-foreground">Family AI</Text>
                <Text className="text-xs text-muted">Ask about your family</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => { setMenuOpen(false); router.push('/(stack)/group-chat'); }}
              className="flex-row items-center gap-3 rounded-xl p-3.5"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Ionicons name="chatbubbles" size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">Family Chat</Text>
                <Text className="text-xs text-muted">Message your family</Text>
              </View>
              {totalUnread > 0 && (
                <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5">
                  <Text className="text-[10px] font-bold text-white">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </Text>
                </View>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}