import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useFamilyChatStore } from '@/lib/stores/family-chat-store';
import { ScreenContainer } from '@/components/screen-container';
import { Animated } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ActionCard } from '@/components/ActionCard';
import { markdownStyles } from '@/utils';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { useSubscriptionStore } from '@/lib/stores/subscription-store';

export default function FamilyChatScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const { family } = useFamilyStore();
  const { tier, aiIntroUsed } = useSubscriptionStore();
  const {
    messages, loading, sending, error, pendingActionsByMessageId,
    upgradeRequired, upgradeReason, clearUpgradePrompt,
    loadMessages, sendMessage, subscribeToChat, unsubscribe,
    dismissIntroWrapUp, showIntroWrapUp
  } = useFamilyChatStore();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const showIntroBanner = tier === 'free' && !aiIntroUsed && messages.length === 0;

  useEffect(() => {
    if (!family?.id) return;
    loadMessages(family.id);
    subscribeToChat(family.id);
    return () => unsubscribe();
  }, [family?.id]);

  useEffect(() => {
    if (messages.length > 0 || sending) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, sending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !family?.id || !user?.id) return;
    setInput('');
    await sendMessage(family.id, user.id, text);
  };

  // Append a fake "typing" row while waiting for the AI's reply
  const listData = sending ? [...messages, { id: '__typing__', role: 'typing' as const, content: '' }] : messages;

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">Family AI</Text>
          <Text className="text-xs text-muted">Ask me anything about your family</Text>
        </View>
      </View>
      {showIntroBanner && (
        <View className="mx-4 mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-3.5">
          <View className="flex-row items-center gap-2">
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text className="text-xs font-bold text-primary">Free Preview</Text>
          </View>
          <Text className="mt-1.5 text-xs leading-4 text-foreground">
            Ask me anything about your family — I'll use your real schedule, tasks, and details. This is your one-time free preview of Fambound AI.
          </Text>
        </View>
      )}
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
            data={listData}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-8">
                <Text className="text-base text-muted text-center">
                  Ask about your family's stories, upcoming events, chores, or anything else on your mind.
                </Text>
              </View>
            }
            renderItem={({ item }) =>
              item.role === 'typing' ? (
                <TypingBubble />
              ) : (
                <View className={`mb-1 max-w-[85%] ${item.role === 'user' ? 'self-end' : 'self-start'}`}>
                  <View
                    className={`px-4 py-3 rounded-2xl ${
                      item.role === 'user' ? 'bg-primary rounded-br-sm' : 'bg-surface border border-border rounded-bl-sm'
                    }`}
                  >
                    {item.role === 'user' ? (
                      <Text className="text-white text-base">{item.content}</Text>
                    ) : (
                      <Markdown style={markdownStyles(colors)}>{item.content}</Markdown>
                    )}
                  </View>

                  {/* Approval cards for actions attached to this message */}
                  {pendingActionsByMessageId[item.id]?.filter((a) => a.status === 'pending').map((action) => (
                    <ActionCard key={action.id} action={action} />
                  ))}
                  {pendingActionsByMessageId[item.id]?.some((a) => a.status !== 'pending') && (
                    <Text className="mt-1.5 ml-1 text-[11px] text-muted">
                      {pendingActionsByMessageId[item.id].filter((a) => a.status === 'approved' || a.status === 'executed').length > 0 && '✓ Handled'}
                    </Text>
                  )}
                </View>
              )
            }
          />
        )}

         {/* Intro wrap-up card — appears right after the free preview reply */}
        {showIntroWrapUp && (
          <View className="mx-4 mb-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text className="text-sm font-bold text-foreground">That's Fambound AI</Text>
            </View>
            <Text className="mt-1.5 text-xs leading-5 text-muted">
              Imagine that for everything — scheduling, meal planning, meeting prep, and more. Upgrade to keep the conversation going.
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Pressable onPress={dismissIntroWrapUp} className="flex-1 items-center rounded-xl border border-border py-2.5">
                <Text className="text-xs font-semibold text-muted">Maybe later</Text>
              </Pressable>
              <Pressable
                onPress={() => { dismissIntroWrapUp(); router.push('/paywall'); }}
                className="flex-1 items-center rounded-xl bg-primary py-2.5"
              >
                <Text className="text-xs font-bold text-white">Upgrade Now</Text>
              </Pressable>
            </View>
          </View>
        )}

        {error && (
          <View className="px-4 py-2 bg-error/10">
            <Text className="text-sm text-error">{error}</Text>
          </View>
        )}

        {/* Input bar */}
        <View className="flex-row items-center px-4 py-3 border-t mb-7 border-border bg-background">
          <TextInput
            placeholder="Message your family AI..."
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
            multiline
            className="flex-1 bg-surface border border-border rounded-full px-4 py-3 text-foreground text-base mr-2 max-h-24"
            style={{ color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || !input.trim()}
            className="w-11 h-11 rounded-full bg-primary items-center justify-center"
            style={{ opacity: sending || !input.trim() ? 0.5 : 1 }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
       <UpgradePrompt
        visible={upgradeRequired}
        onClose={clearUpgradePrompt}
        reason={upgradeReason ?? 'ai_feature'}
      />
    </ScreenContainer>
  );
}

// ── Typing indicator — three dots pulsing in sequence ─────────
function TypingBubble() {
  const colors = useColors();
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        ])
      );

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  return (
    <View className="mb-3 max-w-[85%] self-start flex-row items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3.5">
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={{ opacity: dot }}
          className="h-2 w-2 rounded-full"
        >
          <View className="h-2 w-2 rounded-full bg-primary" />
        </Animated.View>
      ))}
    </View>
  );
}