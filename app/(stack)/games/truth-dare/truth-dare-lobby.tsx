import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { RelativePathString, useLocalSearchParams, useRouter } from 'expo-router';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useTruthDareStore } from '@/lib/stores/useTruthDareStore';
import { MIN_PLAYERS } from '@/types';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function TruthDareLobbyScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const colors = useColors();
  const currentMember = useFamilyStore((s) => s.currentMember);

  const {
    session,
    participants,
    loading,
    busy,
    error,
    loadSession,
    joinSession,
    subscribe,
    unsubscribe,
    cancelSession,
    clearError,
    startGame,
  } = useTruthDareStore();

  const [initializing, setInitializing] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Load and subscribe to the current lobby.
  useEffect(() => {
    if (!sessionId || !currentMember?.id) return;
    void loadSession(sessionId);
    (async () => {
      await joinSession(sessionId, currentMember.id);
      subscribe(sessionId);
      setInitializing(false);
    })();
    return () => unsubscribe();
  }, [sessionId, currentMember?.id]);

  // Follow server-side game state.
  useEffect(() => {
    if (!session) return;
    if (session.status === 'in_progress' || session.status === 'completed') {
      router.replace(
        `/(stack)/games/truth-dare/truth-dare-play?sessionId=${session.id}` as RelativePathString,
      );
    } else if (session.status === 'cancelled') {
      Alert.alert('Game cancelled', 'The host cancelled this game.');
      router.replace('/(stack)/games');
    }
  }, [session?.status]);

  // Keep the existing invitation timeout behavior.
  useEffect(() => {
    if (!session?.lobby_deadline || session.status !== 'waiting') return;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.round((new Date(session.lobby_deadline!).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
      return remaining;
    };

    tick();
    const interval = setInterval(() => {
      const remaining = tick();
      if (remaining === 0) {
        clearInterval(interval);
        const allJoined = session.invited_member_ids?.every((id) =>
          participants.some((p) => p.member_id === id),
        );
        if (!allJoined && sessionId) {
          cancelSession(sessionId);
          router.replace('/(stack)/games');
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session?.lobby_deadline, session?.status, participants]);

  useEffect(() => {
    if (error) {
      Alert.alert('Oops', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const isCreator = !!session && !!user && session.created_by === user.id;
  const enoughPlayers = participants.length >= MIN_PLAYERS;
  const names = useMemo(
    () => participants.map((p) => ({ id: p.id, name: p.member?.name ?? 'Player' })),
    [participants],
  );

  const onStart = async () => {
    if (!enoughPlayers) return;
    await startGame();
  };

  const formattedTime =
    secondsLeft === null
      ? null
      : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const progress = Math.min(100, (participants.length / MIN_PLAYERS) * 100);

  if (loading || !session) {
    return (
      <ScreenContainer>
        <AppHeader title="Truth or Dare" showBack />
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-5 h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text className="text-lg font-bold text-gray-900">Getting the lobby ready</Text>
          <Text className="mt-2 text-center text-sm leading-5 text-gray-500">
            {initializing ? 'Joining your game…' : 'Loading players…'}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader title="Truth or Dare" showBack />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Game intro */}
        <View className="overflow-hidden rounded-[28px] bg-[#103B50] px-5 pb-5 pt-6">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <View className="mb-3 self-start flex-row items-center rounded-full bg-white/10 px-3 py-1.5">
                <View className="mr-2 h-2 w-2 rounded-full bg-[#8BE0B0]" />
                <Text className="text-xs font-bold uppercase tracking-wider text-white">
                  {session.status === 'waiting' ? 'Lobby open' : 'Game lobby'}
                </Text>
              </View>
              <Text className="text-[28px] font-extrabold leading-9 text-white">Let the fun begin</Text>
              <Text className="mt-2 text-sm leading-5 text-white/75">
                Gather everyone together, then get ready for a round of Truth or Dare.
              </Text>
            </View>
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#FE6A50]">
              <Ionicons name="sparkles" size={27} color="#FFFFFF" />
            </View>
          </View>

          <View className="mt-5 flex-row items-center rounded-2xl bg-white/10 p-3.5">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Ionicons name="people" size={20} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-medium text-white/65">Players in the lobby</Text>
              <Text className="mt-0.5 text-base font-bold text-white">
                {participants.length} joined
                <Text className="font-medium text-white/65">  ·  {MIN_PLAYERS} needed to start</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Player roster */}
        <View className="mt-7">
          <View className="mb-3 flex-row items-end justify-between">
            <View>
              <Text className="text-xl font-extrabold text-gray-900">Your players</Text>
              <Text className="mt-1 text-sm text-gray-500">Who's playing this round?</Text>
            </View>
            <View className="rounded-full bg-[#FFF0EC] px-3 py-1.5">
              <Text className="text-xs font-bold text-[#C94B37]">
                {participants.length} {participants.length === 1 ? 'player' : 'players'}
              </Text>
            </View>
          </View>

          <View className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
            {names.length === 0 ? (
              <View className="items-center py-7">
                <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
                  <Ionicons name="person-add-outline" size={22} color="#8A9299" />
                </View>
                <Text className="text-sm font-semibold text-gray-800">Waiting for players to join</Text>
                <Text className="mt-1 text-center text-xs text-gray-500">
                  Your group will show up here as they arrive.
                </Text>
              </View>
            ) : (
              names.map((p, index) => {
                const avatarColors = ['#DDF5E8', '#E6E9FF', '#FFE6D7', '#DDF1F8'];
                const inkColors = ['#24754E', '#5356A7', '#A74D32', '#24627A'];
                return (
                  <View
                    key={p.id}
                    className={`flex-row items-center py-3 ${index < names.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <View
                      className="mr-3 h-11 w-11 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: avatarColors[index % avatarColors.length] }}
                    >
                      <Text
                        className="text-base font-extrabold"
                        style={{ color: inkColors[index % inkColors.length] }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text className="flex-1 text-[15px] font-semibold text-gray-900">{p.name}</Text>
                    <View className="flex-row items-center rounded-full bg-[#EFF8F2] px-2.5 py-1.5">
                      <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[#39A66A]" />
                      <Text className="text-[11px] font-bold text-[#287A4B]">Joined</Text>
                    </View>
                  </View>
                );
              })
            )}

            {names.length > 0 && names.length < MIN_PLAYERS && (
              <View className="mt-3 flex-row items-center rounded-2xl bg-gray-50 px-3.5 py-3">
                <Ionicons name="hourglass-outline" size={17} color="#7B858D" />
                <Text className="ml-2 flex-1 text-xs font-medium text-gray-500">
                  Waiting for {MIN_PLAYERS - names.length} more {MIN_PLAYERS - names.length === 1 ? 'player' : 'players'}
                </Text>
                <View className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                  <View
                    className="h-full rounded-full bg-[#FE6A50]"
                    style={{ width: `${progress}%` }}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Lobby timing and readiness */}
        {formattedTime !== null && session.status === 'waiting' && !enoughPlayers && (
          <View className="mt-4 flex-row items-center rounded-2xl border border-[#F5E5C9] bg-[#FFFAF0] p-4">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0D5]">
              <Ionicons name="time-outline" size={21} color="#A66B18" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-gray-900">A little more time</Text>
              <Text className="mt-0.5 text-xs leading-4 text-gray-600">
                Invited players have until the lobby closes to join.
              </Text>
            </View>
            <Text className="ml-2 text-lg font-extrabold tabular-nums text-[#9B6417]">{formattedTime}</Text>
          </View>
        )}

        {!enoughPlayers && (
          <View className="mt-4 flex-row items-start px-1">
            <Ionicons name="information-circle-outline" size={17} color="#75818A" />
            <Text className="ml-2 flex-1 text-xs leading-5 text-gray-500">
              You need at least {MIN_PLAYERS} players to start. Truth or Dare is best enjoyed together in the same room.
            </Text>
          </View>
        )}

        {/* Host action / non-host status */}
        {isCreator ? (
          <Pressable
            onPress={onStart}
            disabled={!enoughPlayers || busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: !enoughPlayers || busy }}
            className={`mt-7 min-h-[58px] flex-row items-center justify-center rounded-2xl px-5 ${
              enoughPlayers && !busy ? 'bg-[#FE6A50]' : 'bg-gray-300'
            }`}
            style={enoughPlayers && !busy ? { shadowColor: '#FE6A50', shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 } : undefined}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text className="text-base font-extrabold text-white">
                  {enoughPlayers ? 'Start the game' : 'Waiting for players'}
                </Text>
                {enoughPlayers && <Ionicons name="arrow-forward" size={19} color="#FFFFFF" style={{ marginLeft: 9 }} />}
              </>
            )}
          </Pressable>
        ) : (
          <View className="mt-7 flex-row items-center rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF0EC]">
              <ActivityIndicator color="#FE6A50" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-gray-900">You're all set</Text>
              <Text className="mt-1 text-xs leading-4 text-gray-500">
                Waiting for the host to start the game…
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
