import { View, Text, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { memberLimit } from '@/utils';
import { useFamilyStore } from '@/lib/stores/family-store';

interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  reason: 'ai_feature' | 'storage_limit' | 'quota_exceeded' | 'video_limit' | 'member_limit' | 'module_limit';
  usedBytes?: number;
  limitBytes?: number;
  videoLimit?: number;
  videosUsed?: number;
}

const COPY: Record<UpgradePromptProps['reason'], { title: string; body: string }> = {
  ai_feature: {
    title: 'This is a Premium feature',
    body: "Unlock Fambound Intelligence and get personalized guidance designed for your family's growth.",
  },
  quota_exceeded: {
    title: "You've used this month's AI allowance",
    body: 'Your AI usage resets next month, or upgrade for a higher monthly allowance.',
  },
  storage_limit: {
    title: "You've reached your storage limit",
    body: 'Upgrade to Premium for unlimited photo and memory storage.',
  },
   video_limit: {
    title: "You've reached your free video limit",
    body: 'Free accounts can save up to 3 videos. Upgrade to Premium for unlimited video memories.',
  },
  member_limit: {
    title: "You've reached your member limit",
    body: 'Free accounts can have up to 4 family members. Upgrade to Premium to add more.',
  },
  module_limit: {
    title: "You can't access this feature",
    body: 'This feature is not available for free tier account. Upgrade to Premium to gain access to this feature.',
  },
};

export function UpgradePrompt({ visible, onClose, reason, usedBytes, limitBytes,videosUsed,videoLimit }: UpgradePromptProps) {
  const router = useRouter();
  const colors = useColors();
  const { members } = useFamilyStore();
  const copy = COPY[reason];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full rounded-3xl bg-background p-6">
          <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Ionicons name="lock-closed" size={20} color={colors.primary} />
          </View>
          <Text className="text-lg font-bold text-foreground">{copy.title}</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">{copy.body}</Text>

          {reason === "member_limit" && (
            <Text className="text-xs text-muted">
              {members?.length ?? 0} of {memberLimit} members used on the free plan
            </Text>
          )}

          {reason === 'storage_limit' && limitBytes && (
            <Text className="mt-2 text-xs text-muted">
              {Math.round((usedBytes ?? 0) / 1024 / 1024)}MB of {Math.round(limitBytes / 1024 / 1024)}MB used
            </Text>
          )}
          {reason === 'video_limit' && videoLimit && (
            <Text className="mt-2 text-xs text-muted">
              {videosUsed ?? 0} of {videoLimit} videos used
            </Text>
          )}

          <Pressable
            onPress={() => { onClose(); router.push('/paywall'); }}
            className="mt-5 items-center rounded-xl bg-primary py-3.5"
          >
            <Text className="text-sm font-bold text-white">Upgrade to Premium</Text>
          </Pressable>
          <Pressable onPress={onClose} className="mt-3 items-center">
            <Text className="text-xs font-semibold text-muted">Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}