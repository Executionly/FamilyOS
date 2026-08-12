import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGroupChatStore } from '@/lib/stores/group-chat-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import ImageView from "react-native-image-viewing";
import { useDmStore } from '@/lib/stores/dm-store';
import { StorageLimitError } from '@/utils/storage-gate';
import { UpgradePrompt } from '@/components/upgrade-prompt';


export default function GroupChatScreen() {
    const router = useRouter();
    const colors = useColors();
    const { user } = useAuthStore();
    const { family } = useFamilyStore();
    const { messages, loading, sending, error, loadMessages, sendMessage, sendImage, subscribeToChat, unsubscribe } = useGroupChatStore();
    const [visible, setVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const listRef = useRef<FlatList>(null);
    const { conversations } = useDmStore();
    const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
    const [upgradeReason, setUpgradeReason] = useState<'ai_feature' | 'storage_limit'>('ai_feature');
    
    const totalUnread = useMemo(
      () => conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
      [conversations]
    );

    useEffect(() => {
        if (!family?.id) return;
            loadMessages(family.id);
            subscribeToChat(family.id);
        return () => unsubscribe();
    }, [family?.id]);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages.length]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || !family?.id || !user?.id) return;
        setInput('');
        await sendMessage(family.id, user.id, text);
    };

    const handleImagePick = () => {
      if (!family?.id || !user?.id) return;
      try {
        sendImage(family.id, user.id);
      } catch (error) {
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
      <View className="flex-row items-center border-b border-border px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">Family Chat</Text>
          <Text className="text-xs text-muted">{family?.name}</Text>
        </View>
        <TouchableOpacity
        onPress={()=>router.push('/dm-list')}
        className='py-2 px-2 border border-primary rounded-xl flex-row items-center gap-1'>
          <Text className="text-sm font-semibold text-primary">Private Chat</Text>
          {totalUnread > 0 && (
            <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 border-2 border-background">
              <Text className="text-[10px] font-bold text-white">
                {totalUnread > 9 ? '9+' : totalUnread}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
                <Text className="text-center text-base text-muted">
                  No messages yet — say hello to your family!
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMine = item.sender_id === user?.id;
              return (
                <View className={`mb-3 max-w-[80%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
                  {!isMine && (
                    <TouchableOpacity
                    className=''
                    onPress={() => router.push(`/dm?userId=${item.sender_id}`)}>
                      <Text className="mb-1 ml-1 text-[13px] font-semibold text-muted">
                        {item.member?.name ?? 'Family member'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View
                    className={`rounded-2xl px-4 py-3 ${
                      isMine ? 'rounded-br-sm bg-primary' : 'rounded-bl-sm border border-border bg-surface'
                    }`}
                  >
                    {item.image_path ? (
                        item.signed_image_url ? (
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedImage(item.signed_image_url!);
                              setVisible(true);
                            }}
                          >
                            <Image
                            source={{ uri: item.signed_image_url }}
                            className="h-48 w-48 rounded-xl"
                            resizeMode="cover"
                            // onError={(e) => console.log('Image load error:', e.nativeEvent.error, item.signed_image_url)}
                            // onLoad={() => console.log('Image loaded successfully')}
                            />

                          </TouchableOpacity>
                        ) : (
                            <View className="h-48 w-48 items-center justify-center rounded-xl bg-border">
                            <ActivityIndicator color={colors.muted} />
                            </View>
                        )
                        ) : (
                        <Text className={`text-base ${isMine ? 'text-white' : 'text-foreground'}`}>
                            {item.content}
                        </Text>
                    )}
                  </View>
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

        <View className="flex-row items-center border-t border-border bg-background px-6 py-3 mb-6">
          <Pressable onPress={handleImagePick} className="mr-2" hitSlop={8}>
            <Ionicons name="image-outline" size={24} color={colors.primary} />
          </Pressable>
          <TextInput
            placeholder="Message your family..."
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
      <ImageView
        images={selectedImage ? [{ uri: selectedImage }] : []}
        imageIndex={0}
        visible={visible}
        onRequestClose={() => setVisible(false)}
      />

      <UpgradePrompt
        visible={upgradePromptVisible}
        onClose={() => setUpgradePromptVisible(false)}
        reason={upgradeReason}
      />
    </ScreenContainer>
  );
}