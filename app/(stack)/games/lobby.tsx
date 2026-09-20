import { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useGameStore } from '@/lib/stores/game-store';
import { GAME_META } from '@/constants/games';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MemberAvatar } from '@/components/ui/member-avatar';


export default function GameLobbyScreen() {
    const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { user } = useAuthStore();
  const { currentMember, members } = useFamilyStore();
  const {
    currentSession, participants, joinSession, beginMultiplayerGame,
    subscribeToSession, unsubscribeFromSession,
  } = useGameStore();
  const [secondsLeft, setSecondsLeft] = useState(90);
    const { cancelSession } = useGameStore();

  const isHost = currentSession?.created_by === user?.id;

  useEffect(() => {
    if (!sessionId || !currentMember?.id) return;

    const isHostReturning = currentSession?.created_by === user?.id;

    if (isHostReturning) {
      useGameStore.getState().refreshParticipants(sessionId);
    } else {
      joinSession(sessionId, currentMember.id);
    }

    subscribeToSession(sessionId);
    return () => unsubscribeFromSession();
  }, [sessionId, currentMember?.id, user]);

  useEffect(() => {
    if (currentSession?.status === 'in_progress') {
      router.replace(`/(stack)/games/play?sessionId=${sessionId}`);
    }
  }, [currentSession?.status]);

    useEffect(() => {
      if (!currentSession?.lobby_deadline || currentSession.status !== 'waiting') return;
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.round((new Date(currentSession.lobby_deadline!).getTime() - Date.now()) / 1000));
        setSecondsLeft(remaining);
        if (remaining === 0) {
          clearInterval(interval);
          const allJoined = currentSession.invited_member_ids?.every((id) =>
              participants.some((p) => p.member_id === id)
          );
          if (!allJoined && sessionId) {
              cancelSession(sessionId);
              router.replace('/(stack)/games');
          }
        }
      }, 1000);
      return () => clearInterval(interval);
    }, [currentSession?.lobby_deadline, currentSession?.status, participants]);

    useEffect(() => {
      if (currentSession?.status === 'cancelled') router.replace('/(stack)/games');
    }, [currentSession?.status]);

    const allInvitedJoined = currentSession?.invited_member_ids?.every((id) =>
      participants.some((p) => p.member_id === id)
    ) ?? true;

  if (!currentSession) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const meta = GAME_META[currentSession.game_type];

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Waiting Room" showBack />
      <View className="flex-1 px-5 pt-6">
        <View className="mb-6 items-center">
          <View className="mb-3 h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: meta.color + '20' }}>
            <Ionicons name={meta.icon} size={24} color={meta.color} />
          </View>
          <Text className="text-lg font-extrabold text-foreground">{meta.label}</Text>
          <Text className="mt-1 text-xs text-muted">
            {isHost ? 'Waiting for family to join...' : 'Waiting for the host to start the game...'}
          </Text>
        </View>

        <Text className="mb-3 text-sm font-bold text-foreground">
          Players ({participants.length})
        </Text>
        <FlatList
          data={participants}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>{
            const member = members?.find(m => m.id === item.member_id)
            return  (
                <View className="mb-2 flex-row items-center rounded-xl border border-border bg-surface p-3">
                    <MemberAvatar member={member!} colors={colors}/>
                    <Text className="text-sm font-semibold text-foreground">{member?.name ?? 'Player'}</Text>
                    {member?.user_id === currentSession.created_by && (
                        <View className="ml-auto rounded-full bg-primary/10 px-2 py-0.5">
                        <Text className="text-[10px] font-bold text-primary">HOST</Text>
                        </View>
                    )}
                </View>
            )
          }}
        />

        <View
        style={{ paddingBottom: Math.max(insets.bottom, 14) }}>
            <Text className="mb-3 text-xs text-muted">Starts automatically cancels in {secondsLeft}s if not everyone joins</Text>

            {isHost ? (
                <Pressable
                    onPress={() => sessionId && beginMultiplayerGame(sessionId)}
                    disabled={!allInvitedJoined}
                    className="mt-4 items-center rounded-2xl bg-primary py-4"
                    style={{ opacity: allInvitedJoined ? 1 : 0.5 }}
                >
                    <Text className="text-base font-bold text-white">{allInvitedJoined ? 'Start Game' : 'Waiting for everyone to join...'}</Text>
                </Pressable>
            ) : (
            <View className="mt-4 items-center rounded-2xl border border-border bg-surface py-4">
                
                {allInvitedJoined 
                ? <Text className="text-base font-bold text-white">Waiting for host to start the game...</Text>
                : <ActivityIndicator color={colors.primary} />}
            </View>
            )}
        </View>
      </View>
    </ScreenContainer>
  );
}