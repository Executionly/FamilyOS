import { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDmStore } from '@/lib/stores/dm-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { StorageLimitError } from '@/utils/storage-gate';

export default function DmThreadScreen() {
  const router = useRouter();
  const colors = useColors();
  const { userId: otherUserId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuthStore();
  const { family, members } = useFamilyStore();
  const { messages, loading, sending, error, loadThread, sendMessage, sendImage, markThreadRead, subscribeToThread, unsubscribeFromThread } = useDmStore();

  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);
  const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'ai_feature' | 'storage_limit'>('ai_feature');

  const otherMember = members?.find((m) => m.user_id === otherUserId);

  useEffect(() => {
    if (!user?.id || !otherUserId) return;
    loadThread(user.id, otherUserId);
    subscribeToThread(user.id, otherUserId);
    markThreadRead(user.id, otherUserId);
    return () => unsubscribeFromThread();
  }, [user?.id, otherUserId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !family?.id || !user?.id || !otherUserId) return;
    setInput('');
    await sendMessage(family.id, user.id, otherUserId, text);
  };

  const handleImagePick = () => {
    if (!family?.id || !user?.id || !otherUserId) return;
    try{
      sendImage(family.id, user.id, otherUserId);
    }catch(error){
      if (error instanceof StorageLimitError) {
        setUpgradePromptVisible(true);
        setUpgradeReason('storage_limit');
        return;
      }
      alert('Something went wrong sending the image. Please try again.');
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title={otherMember?.name ?? 'Family member'} showBack/>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        className="flex-1"
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-8">
                <Text className="text-center text-base text-muted">Say hello to {otherMember?.name ?? 'them'}!</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMine = item.sender_id === user?.id;
              return (
                <View className={`mb-3 max-w-[80%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
                  <View
                    className={`rounded-2xl px-4 py-3 ${
                      isMine ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm border border-border bg-surface'
                    }`}
                  >
                    {item.image_path ? (
                      item.signed_image_url ? (
                        <Image source={{ uri: item.signed_image_url }} className="h-48 w-48 rounded-xl" resizeMode="cover" />
                      ) : (
                        <View className="h-48 w-48 items-center justify-center rounded-xl bg-border">
                          <ActivityIndicator color={colors.muted} />
                        </View>
                      )
                    ) : (
                      <Text className={`text-base ${isMine ? 'text-white' : 'text-foreground'}`}>{item.content}</Text>
                    )}
                  </View>
                  {isMine && (
                    <Text className="mt-1 mr-1 text-[10px] text-muted">
                      {item.read_at ? 'Seen' : 'Sent'}
                    </Text>
                  )}
                </View>
              );
            }}
          />
        )}

        {error && (
          <View className="bg-error/10 px-4 py-2">
            <Text className="text-sm text-error">{error}</Text>
          </View>
        )}

        <View className="flex-row items-center border-t border-border bg-background px-6 py-3 mb-safe">
          <Pressable onPress={handleImagePick} className="mr-2" hitSlop={8}>
            <Ionicons name="image-outline" size={24} color={colors.primary} />
          </Pressable>
          <TextInput
            placeholder={`Message ${otherMember?.name?.split(' ')[0] ?? ''}...`}
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
            multiline
            className="mr-2 max-h-24 flex-1 rounded-full border border-border bg-surface px-4 py-3 text-base text-foreground"
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !input.trim()}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary"
            style={{ opacity: sending || !input.trim() ? 0.5 : 1 }}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="arrow-up" size={20} color="#fff" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <UpgradePrompt
        visible={upgradePromptVisible}
        onClose={() => setUpgradePromptVisible(false)}
        reason={upgradeReason}
      />
    </ScreenContainer>
  );
}