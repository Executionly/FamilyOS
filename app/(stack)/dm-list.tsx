import { useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ConversationSummary, useDmStore } from '@/lib/stores/dm-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';

type InboxRow =
  | { type: 'conversation'; key: string; data: ConversationSummary }
  | { type: 'member'; key: string; data: { user_id: string; name: string; avatar_url?: string | null } }
  | { type: 'header'; key: string; label: string };

export default function DmInboxScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const { family, members } = useFamilyStore();
  const { conversations, loadingConversations, loadConversations, subscribeToInbox, unsubscribeFromInbox } = useDmStore();

  useEffect(() => {
    if (!family?.id || !user?.id) return;
    loadConversations(family.id, user.id);
    subscribeToInbox(user.id, family.id);
    return () => unsubscribeFromInbox();
  }, [family?.id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!family?.id || !user?.id) return;
      loadConversations(family.id, user.id, true);
    }, [family?.id, user?.id])
  );

  // Members with a login, excluding myself, excluding anyone already in the conversation list
  const membersWithoutChat = useMemo(() => {
    const conversationUserIds = new Set(conversations.map((c) => c.other_user_id));
    return (members ?? []).filter(
      (m): m is typeof m & { user_id: string } =>
        !!m.user_id && m.user_id !== user?.id && !conversationUserIds.has(m.user_id)
    );
  }, [members, conversations, user?.id]);

  const rows: InboxRow[] = [
    ...conversations.map((c) => ({ type: 'conversation' as const, key: c.conversation_id, data: c })),
    ...(membersWithoutChat.length > 0
      ? [
          { type: 'header' as const, key: 'header-start', label: 'Start a chat' },
          ...membersWithoutChat.map((m) => ({
            type: 'member' as const,
            key: `member-${m.user_id}`,
            data: { user_id: m.user_id, name: m.name, avatar_url: m.avatar_url },
          })),
        ]
      : []),
  ];

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Chats" showBack />

      {loadingConversations ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.muted} />
              <Text className="mt-2 text-sm text-muted">No family members to chat with yet</Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <Text className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-muted">
                  {item.label}
                </Text>
              );
            }

            if (item.type === 'conversation') {
              const c = item.data;
              return (
                <Pressable
                  onPress={() => router.push(`/dm?userId=${c.other_user_id}`)}
                  className="mb-2 flex-row items-center rounded-2xl border border-border bg-surface p-3.5"
                >
                  <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                    <Text className="text-base font-bold text-primary">
                      {c.other_member_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-foreground">{c.other_member_name}</Text>
                    <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
                      {c.last_message.image_path ? '📷 Photo' : c.last_message.content}
                    </Text>
                  </View>
                  {c.unread_count > 0 && (
                    <View className="ml-2 h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5">
                      <Text className="text-[10px] font-bold text-white">{c.unread_count}</Text>
                    </View>
                  )}
                </Pressable>
              );
            }

            // type === 'member'
            const m = item.data;
            return (
              <Pressable
                onPress={() => router.push(`/dm?userId=${m.user_id}`)}
                className="mb-2 flex-row items-center rounded-2xl border border-dashed border-border bg-surface p-3.5"
              >
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-border">
                  <Text className="text-base font-bold text-muted">{m.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-foreground">{m.name}</Text>
                  <Text className="mt-0.5 text-xs text-muted">Tap to start a conversation</Text>
                </View>
                <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
              </Pressable>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}