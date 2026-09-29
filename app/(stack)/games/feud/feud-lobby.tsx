import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useFamilyStore } from '@/lib/stores/family-store';
import type { TeamId } from '../../../../types';
import { useFeudStore } from '@/lib/stores/useFeudStore';

const TEAM_META: Record<TeamId, { label: string; color: string }> = {
  A: { label: 'Team A', color: '#3B82F6' },
  B: { label: 'Team B', color: '#F97316' },
};

export default function FeudLobbyScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();
  const { currentMember } = useFamilyStore();
  const {
    currentSession,
    participants,
    loading,
    error,
    joinSession,
    shuffleTeams,
    startGame,
    cancelSession,
    subscribeToSession,
    unsubscribeFromSession,
  } = useFeudStore();

  const [initializing, setInitializing] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lastShuffledRosterRef = useRef('');
  const isCreator = currentSession?.created_by === user?.id;

  useEffect(() => {
    if (!sessionId || !currentMember?.id) return;
    (async () => {
      await joinSession(sessionId, currentMember.id);
      subscribeToSession(sessionId);
      setInitializing(false);
    })();
    return () => unsubscribeFromSession();
  }, [sessionId, currentMember?.id]);

  useEffect(() => {
    if (currentSession?.status === 'in_progress' && sessionId) {
      router.replace(`/(stack)/games/feud/feud-play?sessionId=${sessionId}`);
    }
  }, [currentSession?.status]);

  // Lobby timeout, same behaviour as the trivia/quiz lobby: if the deadline
  // passes and not every invited member has joined, cancel and go back.
  useEffect(() => {
    if (!currentSession?.lobby_deadline || currentSession.status !== 'waiting') return;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.round((new Date(currentSession.lobby_deadline!).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
      return remaining;
    };

    tick();
    const interval = setInterval(() => {
      const remaining = tick();
      if (remaining === 0) {
        clearInterval(interval);
        const allJoined = currentSession.invited_member_ids?.every((id) =>
          participants.some((p) => p.member_id === id),
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

  // Creator assigns teams as soon as there are 2+ players, and again whenever
  // someone new joins (a late joiner has no team yet). The roster key stops it
  // firing repeatedly for the same set of players.
  useEffect(() => {
    if (!isCreator || !sessionId || !currentMember?.id) return;
    if (currentSession?.status !== 'waiting') return;
    if (participants.length < 2 || !participants.some((p) => !p.team_id)) return;

    const rosterKey = participants
      .map((p) => p.member_id)
      .sort()
      .join(',');
    if (lastShuffledRosterRef.current === rosterKey) return;
    lastShuffledRosterRef.current = rosterKey;

    shuffleTeams(sessionId, currentMember.id);
  }, [isCreator, currentSession?.status, participants]);

  if (initializing) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title="Family Feud" showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const teamA = participants.filter((p) => p.team_id === 'A');
  const teamB = participants.filter((p) => p.team_id === 'B');
  const hasUnassigned = participants.some((p) => !p.team_id);
  const needsAssignment = participants.length >= 2 && hasUnassigned;
  const canReshuffle = participants.length >= 4;
  const canStart = teamA.length > 0 && teamB.length > 0 && !hasUnassigned;
  const allInvitedJoined = (currentSession?.invited_member_ids ?? []).every((id) =>
    participants.some((p) => p.member_id === id),
  );

  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Family Feud" showBack />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View className="mb-6 items-center">
          <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Ionicons name="people" size={26} color={colors.primary} />
          </View>
          <Text className="text-xl font-black text-foreground">Waiting for players</Text>
          <Text className="mt-1 text-xs text-muted">
            {participants.length} joined · {currentSession?.feud_total_rounds ?? 5} rounds
          </Text>
          {secondsLeft !== null && currentSession?.status === 'waiting' && !allInvitedJoined && (
            <Text className="mt-1 text-[11px] font-semibold text-muted">
              Lobby closes in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')} if invited
              players don't join
            </Text>
          )}
        </View>

        {error && (
          <View className="mb-4 rounded-xl border border-error p-3">
            <Text className="text-xs text-error">{error}</Text>
          </View>
        )}

        <View className="mb-4 flex-row gap-3">
          {(['A', 'B'] as TeamId[]).map((teamId) => {
            const meta = TEAM_META[teamId];
            const roster = teamId === 'A' ? teamA : teamB;
            return (
              <View
                key={teamId}
                style={{ backgroundColor: colors.surface, borderColor: `${meta.color}40` }}
                className="flex-1 rounded-2xl border p-4"
              >
                <View className="mb-3 flex-row items-center">
                  <View style={{ backgroundColor: meta.color }} className="mr-2 h-2.5 w-2.5 rounded-full" />
                  <Text style={{ color: meta.color }} className="text-xs font-black uppercase tracking-wide">
                    {meta.label}
                  </Text>
                </View>
                {roster.length === 0 ? (
                  <Text className="text-xs text-muted">No players yet</Text>
                ) : (
                  roster.map((p) => (
                    <Text key={p.id} className="mb-1.5 text-sm font-semibold text-foreground">
                      {p.member?.name ?? 'Player'}
                    </Text>
                  ))
                )}
              </View>
            );
          })}
        </View>

        {isCreator && (canReshuffle || needsAssignment) && (
          <Pressable
            onPress={() => sessionId && currentMember?.id && shuffleTeams(sessionId, currentMember.id)}
            className="mb-6 flex-row items-center justify-center rounded-xl border border-border py-3"
          >
            <Ionicons name="shuffle" size={16} color={colors.foreground} />
            <Text className="ml-2 text-sm font-semibold text-foreground">
              {needsAssignment ? 'Assign Teams' : 'Reshuffle Teams'}
            </Text>
          </Pressable>
        )}

        {isCreator ? (
          <Pressable
            onPress={() => sessionId && currentMember?.id && startGame(sessionId, currentMember.id)}
            disabled={loading || !canStart}
            style={{ opacity: canStart ? 1 : 0.6 }}
            className="flex-row items-center justify-center rounded-2xl bg-primary py-4"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-black text-white">Start Game</Text>
            )}
          </Pressable>
        ) : (
          <View className="flex-row items-center justify-center py-4">
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <Text className="ml-2 text-xs font-semibold text-muted">Waiting for the game to start</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}