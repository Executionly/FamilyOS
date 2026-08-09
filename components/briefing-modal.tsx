import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBriefingStore } from '@/lib/stores/briefing-store';
import { useColors } from '@/hooks/use-colors';
import { ActionCard } from '@/components/ActionCard';
import Markdown from 'react-native-markdown-display';
import { markdownStyles } from '@/utils';

export function BriefingModal() {
  const router = useRouter();
  const colors = useColors();
  const { briefing, pendingActions, autoExecuted, visible, dismiss } = useBriefingStore();

  if (!briefing && pendingActions.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-h-[80%] rounded-3xl bg-background p-6">
          <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Ionicons name="sparkles" size={22} color={colors.primary} />
          </View>
          <Text className="text-lg font-bold text-foreground">Your Family AI</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            {briefing && <Markdown style={markdownStyles(colors, 14)}>{briefing}</Markdown>}
            {autoExecuted.length > 0 && (
              <View className="mt-3">
                {autoExecuted.map((note, i) => (
                  <View key={i} className="mt-1 flex-row items-center">
                    <Ionicons name="checkmark-circle" size={13} color="#22C55E" />
                    <Text className="ml-1.5 text-xs text-muted">{note}</Text>
                  </View>
                ))}
              </View>
            )}

            {pendingActions.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
          </ScrollView>

          <Pressable onPress={dismiss} className="mt-4 items-center rounded-xl bg-primary py-3">
            <Text className="text-sm font-bold text-white">Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}