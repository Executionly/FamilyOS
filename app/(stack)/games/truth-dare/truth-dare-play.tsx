import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFamilyStore } from '@/lib/stores/family-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useTruthDareStore } from '@/lib/stores/useTruthDareStore';
import { ScreenContainer } from '@/components/screen-container';
import { AppHeader } from '@/components/app-header';
import { useColors } from '@/hooks/use-colors';
import { EMPTY_STATS, MAX_REROLLS_PER_PLAYER, MAX_SKIPS_PER_PLAYER, TdPlayerStats } from '@/types';

const TRUTH_COLOR = '#044768';
const DARE_COLOR = '#FE6A50';
const INK = '#102B3A';
const SOFT_INK = '#637581';
/** Keep in sync with MAX_ANSWER_LENGTH in the truth-dare-action edge function. */
const MAX_ANSWER_LENGTH = 500;

export default function TruthDarePlayScreen() {
  const router = useRouter();
  const colors = useColors();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { user } = useAuthStore();
  const currentMember = useFamilyStore((s) => s.currentMember);

  const {
    session,
    participants,
    loading,
    busy,
    error,
    loadSession,
    subscribe,
    reset,
    clearError,
    chooseType,
    rerollPrompt,
    completeTurn,
    skipTurn,
    endGame,
    pauseSession,
    resumeSession,
  } = useTruthDareStore();

  const [answerText, setAnswerText] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    void loadSession(sessionId);
    subscribe(sessionId);
    return () => reset();
  }, [sessionId]);

  useEffect(() => {
    if (error) Alert.alert('Oops', error, [{ text: 'OK', onPress: clearError }]);
  }, [error]);

  // A new turn, or a rerolled prompt, starts with an empty answer box.
  useEffect(() => {
    setAnswerText('');
  }, [session?.td_turn_index, session?.td_prompt_id]);

  const me = useMemo(
    () => participants.find((p) => p.member_id === currentMember?.id) ?? null,
    [participants, currentMember?.id],
  );
  const nameOf = (participantId: string | null | undefined) =>
    participants.find((p) => p.id === participantId)?.member?.name ?? 'Someone';

  // A branded skeleton gives the loading state its own visual purpose rather than an isolated spinner.
  if (loading || !session) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title="Truth or Dare" showBack />
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 36 }}>
          <View className="flex-1 justify-center">
            <View className="mb-6 items-center">
              <View className="mb-5 h-24 w-24 items-center justify-center rounded-[30px] bg-[#102B3A]">
                <View className="h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-[#FE6A50]">
                  <Ionicons name="sparkles" size={27} color="#FFFFFF" />
                </View>
                <View className="absolute -right-1 -top-1 h-7 w-7 items-center justify-center rounded-full bg-[#FE6A50]">
                  <Ionicons name="heart" size={13} color="#FFFFFF" />
                </View>
              </View>
              <Text className="text-center text-2xl font-black text-foreground">Setting the scene</Text>
              <Text className="mt-2 max-w-[280px] text-center text-sm leading-5 text-muted">
                Bringing your players and next turn together. The fun starts in a moment.
              </Text>
            </View>

            <View
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="rounded-[26px] border p-5"
            >
              <View className="mb-5 flex-row items-center">
                <View className="mr-3 h-11 w-11 rounded-2xl bg-[#EAF0F3]" />
                <View className="flex-1">
                  <View className="h-3 w-28 rounded-full bg-[#EAF0F3]" />
                  <View className="mt-2 h-2.5 w-20 rounded-full bg-[#F1F4F6]" />
                </View>
                <View className="h-7 w-16 rounded-full bg-[#F1F4F6]" />
              </View>
              <View className="h-3 w-20 rounded-full bg-[#F1F4F6]" />
              <View className="mt-3 h-5 w-full rounded-lg bg-[#EAF0F3]" />
              <View className="mt-2 h-5 w-4/5 rounded-lg bg-[#EAF0F3]" />
              <View className="mt-5 h-12 rounded-2xl bg-[#F1F4F6]" />
              <View className="mt-4 flex-row items-center justify-center">
                <View className="mr-2 h-1.5 w-1.5 rounded-full bg-[#FE6A50]" />
                <Text className="text-xs font-semibold text-muted">Preparing your game</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // created_by is the auth user id, same check the lobby uses.
  const isCreator = !!user && session.created_by === user.id;
  const isMyTurn = !!me && session.td_current_participant_id === me.id;
  const isTruth = session.td_prompt_type === 'truth';
  const isPaused = session.status === 'paused';
  const currentName = nameOf(session.td_current_participant_id);
  const myStats: TdPlayerStats = (me && session.td_stats?.[me.id]) || EMPTY_STATS;
  const skipsLeft = Math.max(0, MAX_SKIPS_PER_PLAYER - myStats.skips);
  const rerollsLeft = Math.max(0, MAX_REROLLS_PER_PLAYER - myStats.rerolls);
  const canReroll = isMyTurn && !session.td_rerolled_this_turn && rerollsLeft > 0;
  const last = session.td_last_turn;

  const turnLabel = session.td_max_turns
    ? `Turn ${Math.min(session.td_turn_index + 1, session.td_max_turns)} of ${session.td_max_turns}`
    : `Turn ${session.td_turn_index + 1}`;
  const turnProgress = session.td_max_turns
    ? Math.min(100, ((session.td_turn_index + 1) / session.td_max_turns) * 100)
    : null;

  const confirmEnd = () =>
    Alert.alert('End the game?', 'This ends it for everyone.', [
      { text: 'Keep playing', style: 'cancel' },
      { text: 'End game', style: 'destructive', onPress: () => void endGame() },
    ]);

  // Game over: recap.
  if (session.td_phase === 'game_complete' || session.status === 'completed') {
    const rows = participants.map((p) => ({
      id: p.id,
      name: p.member?.name ?? 'Player',
      stats: session.td_stats?.[p.id] ?? EMPTY_STATS,
    }));

    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title="Truth or Dare" showBack />
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View className="overflow-hidden rounded-[30px] bg-[#102B3A] px-6 pb-7 pt-8">
            <View className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#FE6A50]/15" />
            <View className="mb-5 h-[68px] w-[68px] items-center justify-center rounded-[23px] bg-[#F6BD60]">
              <Ionicons name="trophy" size={34} color="#583A0A" />
            </View>
            <Text className="text-3xl font-black text-white">That was fun!</Text>
            <Text className="mt-2 text-sm leading-5 text-white/70">The stories get better from here.</Text>
            <View className="mt-6 h-px bg-white/15" />
            <View className="mt-4 flex-row items-center">
              <Ionicons name="people" size={17} color="#F6BD60" />
              <Text className="ml-2 text-sm font-semibold text-white/85">
                Your game night, recapped
              </Text>
            </View>
          </View>

          <View className="mb-3 mt-7 flex-row items-end justify-between">
            <View>
              <Text className="text-xl font-black text-foreground">The players</Text>
              <Text className="mt-1 text-sm text-muted">A few highlights from the game</Text>
            </View>
            <View className="rounded-full bg-[#FFF0EC] px-3 py-1.5">
              <Text className="text-xs font-bold text-[#C94B37]">{rows.length} played</Text>
            </View>
          </View>

          <View className="gap-3">
            {rows.map((r, index) => (
              <View
                key={r.id}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                className="rounded-[22px] border p-4"
              >
                <View className="flex-row items-center">
                  <View
                    className={`mr-3 h-11 w-11 items-center justify-center rounded-2xl ${
                      index % 2 === 0 ? 'bg-[#E7F2F5]' : 'bg-[#FFF0EC]'
                    }`}
                  >
                    <Text className="text-base font-black" style={{ color: index % 2 === 0 ? TRUTH_COLOR : DARE_COLOR }}>
                      {r.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text className="flex-1 text-base font-extrabold text-foreground">{r.name}</Text>
                  <View className="rounded-full bg-[#F1F4F6] px-2.5 py-1.5">
                    <Text className="text-[11px] font-bold text-[#53636E]">{r.stats.completed} done</Text>
                  </View>
                </View>
                <View className="mt-4 flex-row border-t border-border pt-3">
                  <View className="flex-1">
                    <Text className="text-lg font-black text-foreground">{r.stats.truths}</Text>
                    <Text className="mt-0.5 text-[11px] font-medium text-muted">Truths</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-black text-foreground">{r.stats.dares}</Text>
                    <Text className="mt-0.5 text-[11px] font-medium text-muted">Dares</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-black text-foreground">{r.stats.skips}</Text>
                    <Text className="mt-0.5 text-[11px] font-medium text-muted">Passed</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => router.replace('/(stack)/games')}
            style={{ backgroundColor: colors.primary }}
            className="mt-7 min-h-[56px] flex-row items-center justify-center rounded-2xl"
            accessibilityRole="button"
          >
            <Ionicons name="game-controller" size={19} color="#FFFFFF" />
            <Text className="ml-2 text-sm font-extrabold text-white">Back to games</Text>
            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Paused.
  if (isPaused) {
    return (
      <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
        <AppHeader title="Truth or Dare" showBack />
        <View className="flex-1 justify-center px-5 py-8">
          <View className="mb-5 items-center">
            <View className="h-20 w-20 items-center justify-center rounded-[27px] bg-[#102B3A]">
              <Ionicons name="pause" size={32} color="#FFFFFF" />
            </View>
            <View className="mt-4 flex-row items-center rounded-full bg-[#FFF4DF] px-3 py-1.5">
              <View className="mr-2 h-1.5 w-1.5 rounded-full bg-[#D49327]" />
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#946315]">Taking a breather</Text>
            </View>
          </View>

          <View
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="rounded-[28px] border p-6"
          >
            <Text className="text-center text-2xl font-black text-foreground">Game paused</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-muted">
              Everyone can take a moment. Resume when your group is ready to jump back in.
            </Text>
            <View className="my-5 h-px bg-border" />
            <View className="flex-row items-center justify-center">
              <Ionicons name="people-outline" size={17} color={colors.muted} />
              <Text className="ml-2 text-xs font-medium text-muted">Your game and progress are saved</Text>
            </View>
            <TouchableOpacity
              onPress={() => sessionId && resumeSession(sessionId)}
              style={{ backgroundColor: colors.primary }}
              className="mt-6 min-h-[54px] w-full flex-row items-center justify-center rounded-2xl"
              accessibilityRole="button"
            >
              <Ionicons name="play" size={17} color="#FFFFFF" />
              <Text className="ml-2 text-sm font-extrabold text-white">Resume game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const accent = isTruth ? TRUTH_COLOR : DARE_COLOR;
  const phaseLabel = session.td_phase === 'performing' ? 'Your challenge' : 'Make a choice';

  // Live game.
  return (
    <ScreenContainer containerClassName="bg-background" safeAreaClassName="bg-background">
      <AppHeader title="Truth or Dare" showBack />
      {/* 
Live game: a purposeful, high-contrast layout for every turn state. */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Turn position and pause control */}
        <View className="mb-5 flex-row items-center justify-between">
          <View>
            <View className="flex-row items-center">
              <View className="mr-2 h-2 w-2 rounded-full bg-[#38A66A]" />
              <Text className="text-[10px] font-extrabold uppercase tracking-[2px] text-muted">Game in progress</Text>
            </View>
            <Text className="mt-1.5 text-sm font-bold text-foreground">{turnLabel}</Text>
          </View>
          <Pressable
            onPress={() => sessionId && pauseSession(sessionId)}
            accessibilityRole="button"
            accessibilityLabel="Pause game"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="h-11 w-11 items-center justify-center rounded-2xl border"
          >
            <Ionicons name="pause" size={17} color={colors.foreground} />
          </Pressable>
        </View>

        {turnProgress !== null && (
          <View className="mb-5 h-1.5 overflow-hidden rounded-full bg-gray-200">
            <View className="h-full rounded-full bg-[#FE6A50]" style={{ width: `${turnProgress}%` }} />
          </View>
        )}

        {/* Current player */}
        <View className="overflow-hidden rounded-[26px] bg-[#102B3A] p-5">
          <View className="absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/5" />
          <View className="flex-row items-center">
            <View className="mr-4 h-[58px] w-[58px] items-center justify-center rounded-[20px] bg-white/10">
              <Text className="text-2xl font-black text-white">{currentName.charAt(0).toUpperCase()}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-white/55">
                {isMyTurn ? "You're up" : 'Now playing'}
              </Text>
              <Text className="mt-1 text-xl font-extrabold text-white" numberOfLines={1}>
                {isMyTurn ? 'Your turn!' : `${currentName}'s turn`}
              </Text>
            </View>
            <View className="rounded-full bg-white/10 px-3 py-1.5">
              <Text className="text-[10px] font-bold text-white/80">{phaseLabel}</Text>
            </View>
          </View>
        </View>

        {/* Last turn: show what just happened, including a truth answer. */}
        {session.td_phase === 'choosing' && last && (
          <View
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="mt-4 rounded-[22px] border p-4"
          >
            <View className="mb-2 flex-row items-center">
              <View className="mr-2 h-7 w-7 items-center justify-center rounded-lg bg-[#F1F4F6]">
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={SOFT_INK} />
              </View>
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-muted">Just happened</Text>
            </View>
            {last.outcome === 'skipped' ? (
              <Text className="text-sm font-semibold text-foreground">{nameOf(last.participant_id)} passed this one.</Text>
            ) : (
              <>
                <Text className="text-sm font-semibold text-foreground">
                  {nameOf(last.participant_id)} took a {last.type ?? 'turn'}
                </Text>
                {!!last.prompt && <Text className="mt-1.5 text-xs leading-5 text-muted">{last.prompt}</Text>}
                {!!last.answer && (
                  <View className="mt-3 rounded-xl bg-[#F5F7F8] px-3 py-2.5">
                    <Text className="text-sm leading-5 text-foreground">“{last.answer}”</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Choose truth or dare */}
        {session.td_phase === 'choosing' && (
          <View className="mt-7">
            {isMyTurn ? (
              <>
                <View className="mb-4 items-center">
                  <Text className="text-xl font-black text-foreground">Choose your fate</Text>
                  <Text className="mt-1 text-sm text-muted">Go with your gut. No overthinking.</Text>
                </View>
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => void chooseType('truth')}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Choose truth"
                    style={{ opacity: busy ? 0.6 : 1 }}
                    className="min-h-[174px] flex-1 items-start justify-between overflow-hidden rounded-[25px] bg-[#044768] p-4"
                  >
                    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                      <Ionicons name="chatbubble-ellipses" size={23} color="#FFFFFF" />
                    </View>
                    <View>
                      <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-white/60">Tell us</Text>
                      <Text className="mt-1 text-2xl font-black text-white">Truth</Text>
                    </View>
                    <View className="absolute -bottom-7 -right-5 h-24 w-24 rounded-full border-[14px] border-white/10" />
                  </Pressable>
                  <Pressable
                    onPress={() => void chooseType('dare')}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Choose dare"
                    style={{ opacity: busy ? 0.6 : 1 }}
                    className="min-h-[174px] flex-1 items-start justify-between overflow-hidden rounded-[25px] bg-[#FE6A50] p-4"
                  >
                    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                      <Ionicons name="flash" size={23} color="#FFFFFF" />
                    </View>
                    <View>
                      <Text className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-white/75">Take a chance</Text>
                      <Text className="mt-1 text-2xl font-black text-white">Dare</Text>
                    </View>
                    <View className="absolute -bottom-7 -right-5 h-24 w-24 rounded-full border-[14px] border-white/15" />
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => void skipTurn()}
                  disabled={busy || skipsLeft === 0}
                  accessibilityRole="button"
                  className="mt-4 min-h-[48px] flex-row items-center justify-center rounded-2xl"
                >
                  <Ionicons name="play-skip-forward-outline" size={16} color={skipsLeft === 0 ? colors.muted : colors.foreground} />
                  <Text className={`ml-2 text-sm ${skipsLeft === 0 ? 'font-medium text-muted opacity-50' : 'font-bold text-foreground'}`}>
                    Pass this turn <Text className="font-medium text-muted">({skipsLeft} left)</Text>
                  </Text>
                </Pressable>
              </>
            ) : (
              <View
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                className="overflow-hidden rounded-[25px] border p-5"
              >
                <View className="flex-row items-center">
                  <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF2DE]">
                    <Ionicons name="hourglass-outline" size={21} color="#A36A1D" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-extrabold text-foreground">The big decision</Text>
                    <Text className="mt-1 text-xs leading-4 text-muted">
                      {currentName} is choosing truth or dare.
                    </Text>
                  </View>
                  <View className="flex-row items-center rounded-full bg-[#F1F4F6] px-2.5 py-1.5">
                    <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[#D49327]" />
                    <Text className="text-[10px] font-bold text-[#53636E]">Up next</Text>
                  </View>
                </View>
                <View className="mt-4 flex-row gap-2">
                  <View className="h-1 flex-1 rounded-full bg-[#044768]/20" />
                  <View className="h-1 flex-1 rounded-full bg-[#FE6A50]/20" />
                  <View className="h-1 flex-1 rounded-full bg-gray-100" />
                </View>
              </View>
            )}
          </View>
        )}

        {/* Prompt and performance */}
        {session.td_phase === 'performing' && (
          <View className="mt-7">
            <View
              style={{ backgroundColor: accent }}
              className="overflow-hidden rounded-[28px] px-5 pb-6 pt-5"
            >
              <View className="absolute -bottom-12 -right-8 h-40 w-40 rounded-full border-[24px] border-white/10" />
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center rounded-full bg-white/15 px-3 py-1.5">
                  <Ionicons name={isTruth ? 'chatbubble-ellipses' : 'flash'} size={13} color="#FFFFFF" />
                  <Text className="ml-1.5 text-[10px] font-extrabold uppercase tracking-[1.5px] text-white">
                    {isTruth ? 'Truth' : 'Dare'}
                  </Text>
                </View>
                <Text className="text-[10px] font-bold text-white/65">{isTruth ? 'Be honest' : 'Make it memorable'}</Text>
              </View>
              <Text className="mt-5 text-[26px] font-extrabold leading-[34px] text-white">
                {session.td_prompt_text || 'Your challenge is ready.'}
              </Text>
              <View className="mt-5 flex-row items-center">
                <Ionicons name="person-circle-outline" size={16} color="#FFFFFF" />
                <Text className="ml-1.5 text-xs font-semibold text-white/80">For {currentName}</Text>
              </View>
            </View>

            {isMyTurn ? (
              <>
                {isTruth && (
                  <View
                    style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                    className="mt-4 rounded-[22px] border p-4"
                  >
                    <View className="mb-3 flex-row items-center justify-between">
                      <Text className="text-sm font-extrabold text-foreground">Your answer</Text>
                      <View className="rounded-full bg-[#F1F4F6] px-2.5 py-1">
                        <Text className="text-[10px] font-bold text-muted">JUST BETWEEN FRIENDS</Text>
                      </View>
                    </View>
                    <TextInput
                      value={answerText}
                      onChangeText={setAnswerText}
                      placeholder="Say what's on your mind…"
                      placeholderTextColor={colors.muted}
                      multiline
                      maxLength={MAX_ANSWER_LENGTH}
                      textAlignVertical="top"
                      style={{ minHeight: 108 }}
                      className="rounded-2xl bg-[#F5F7F8] px-4 py-3 text-base leading-6 text-foreground"
                    />
                    <Text className="mt-2 self-end text-[10px] font-medium text-muted">
                      {answerText.length}/{MAX_ANSWER_LENGTH}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={() => void completeTurn(isTruth ? answerText : undefined)}
                  disabled={busy}
                  accessibilityRole="button"
                  className={`mt-4 min-h-[56px] flex-row items-center justify-center rounded-2xl px-5 ${busy ? 'bg-gray-400' : 'bg-[#218653]'}`}
                >
                  <Ionicons name={busy ? 'time-outline' : 'checkmark-circle'} size={20} color="#FFFFFF" />
                  <Text className="ml-2 text-base font-extrabold text-white">
                    {busy ? 'Saving your turn…' : isTruth ? 'Share my answer' : 'I did it!'}
                  </Text>
                </Pressable>

                <View className="mt-3 flex-row gap-3">
                  <Pressable
                    onPress={() => void rerollPrompt()}
                    disabled={busy || !canReroll}
                    accessibilityRole="button"
                    className="min-h-[54px] flex-1 flex-row items-center justify-center rounded-2xl border border-border bg-surface px-2"
                  >
                    <Ionicons name="shuffle-outline" size={16} color={canReroll ? colors.foreground : colors.muted} />
                    <Text className={`ml-1.5 text-xs ${canReroll ? 'font-bold text-foreground' : 'font-medium text-muted opacity-60'}`}>
                      {session.td_rerolled_this_turn ? 'Already rerolled' : `Try another · ${rerollsLeft}`}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void skipTurn()}
                    disabled={busy || skipsLeft === 0}
                    accessibilityRole="button"
                    className="min-h-[54px] flex-1 flex-row items-center justify-center rounded-2xl border border-border bg-surface px-2"
                  >
                    <Ionicons name="play-skip-forward-outline" size={16} color={skipsLeft === 0 ? colors.muted : colors.foreground} />
                    <Text className={`ml-1.5 text-xs ${skipsLeft === 0 ? 'font-medium text-muted opacity-60' : 'font-bold text-foreground'}`}>
                      Pass · {skipsLeft}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                className="mt-4 rounded-[22px] border p-4"
              >
                <View className="flex-row items-center">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}18` }}>
                    <Ionicons name={isTruth ? 'create-outline' : 'flame-outline'} size={20} color={accent} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-extrabold text-foreground">
                      {isTruth ? `${currentName} is thinking…` : `${currentName} is on it!`}
                    </Text>
                    <Text className="mt-1 text-xs leading-4 text-muted">
                      {isTruth ? 'Give them a moment to answer.' : 'Cheer them on and enjoy the show.'}
                    </Text>
                  </View>
                  <Ionicons name="sparkles-outline" size={20} color={accent} />
                </View>
                {/* Dares are honor system: anyone can confirm. A truth is completed by the player
                    who types the answer, so only the host gets a button (to unstick an idle player). */}
                {(!isTruth || isCreator) && (
                  <Pressable
                    onPress={() => void completeTurn()}
                    disabled={busy}
                    accessibilityRole="button"
                    className="mt-4 min-h-[48px] flex-row items-center justify-center rounded-2xl border border-[#218653] bg-[#218653]/5 px-4"
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#218653" />
                    <Text className="ml-2 text-sm font-bold text-[#218653]">
                      {busy ? 'Saving…' : `${currentName} did it`}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        {isCreator && (
          <Pressable
            onPress={confirmEnd}
            accessibilityRole="button"
            className="mt-8 min-h-[44px] flex-row items-center justify-center"
          >
            <Ionicons name="stop-circle-outline" size={16} color={colors.muted} />
            <Text className="ml-1.5 text-xs font-semibold text-muted">End game for everyone</Text>
          </Pressable>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
