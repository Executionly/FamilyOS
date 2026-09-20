import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useGameInviteStore } from '@/lib/stores/game-invite-store';
import { GAME_META } from '@/constants/games';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function GameInviteTray() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { invites, dismissInvite } = useGameInviteStore();

  if (invites.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, zIndex: 999 }}
      className="px-4"
    >
      {invites.map((invite) => {
        const meta = GAME_META[invite.gameType];
        return (
          <View
            key={invite.sessionId}
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="mb-2 flex-row items-center rounded-2xl border p-3.5 shadow-lg"
          >
            <View style={{ backgroundColor: `${meta.color}20` }} className="w-10 h-10 rounded-xl items-center justify-center mr-3">
              <Ionicons name={meta.icon} size={18} color={meta.color} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">{invite.hostName} invited you</Text>
              <Text className="text-xs text-muted">{meta.label} · multiplayer</Text>
            </View>
            <Pressable
              onPress={() => dismissInvite(invite.sessionId)}
              style={{ borderColor: colors.border }}
              className="mr-2 h-8 w-8 items-center justify-center rounded-full border"
            >
              <Ionicons name="close" size={14} color={colors.muted} />
            </Pressable>
            <Pressable
              onPress={() => {
                dismissInvite(invite.sessionId);
                router.push(`/(stack)/games/lobby?sessionId=${invite.sessionId}`);
              }}
              style={{ backgroundColor: colors.primary }}
              className="rounded-full px-3.5 py-2"
            >
              <Text className="text-xs font-bold text-white">Join</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}